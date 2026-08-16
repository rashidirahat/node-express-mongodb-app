const Donation = require("../models/Donation");
const { getDonationTotals } = require("../services/donation.service");

const addDonation = async (req, res) => {
  try {
    if (!req.body.amount || Number(req.body.amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
        errorCode: "VALIDATION_ERROR",
      });
    }

    if (req.body.category !== "zakat" && req.body.category !== "sadaqah") {
      return res.status(400).json({
        success: false,
        message: "Category must be either 'zakat' or 'sadaqah'",
        errorCode: "VALIDATION_ERROR",
      });
    }

    const amount = Number(req.body.amount);
    const category = req.body.category;

    let year = new Date().getFullYear();
    if (req.body.year !== undefined && req.body.year !== null && req.body.year !== "") {
      if (!/^\d{4}$/.test(String(req.body.year))) {
        return res.status(400).json({
          success: false,
          message: "Year must be a 4-digit number",
          errorCode: "VALIDATION_ERROR",
        });
      }
      year = Number(req.body.year);
    }

    const description = req.body.description || "";

    const donation = await Donation.create({
      user: req.user.userId,
      category,
      amount,
      year,
      description,
    });

    res.status(201).json({
      success: true,
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTotals = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    let year = currentYear;
    if (req.query.year !== undefined) {
      year = parseInt(req.query.year, 10);
      if (isNaN(year)) {
        return res.status(400).json({
          success: false,
          message: "Year must be a valid number",
          errorCode: "VALIDATION_ERROR",
        });
      }
    }

    const { zakat, sadaqah, total } = await getDonationTotals(req.user.userId, year);
    const records = await Donation.find({ user: req.user.userId, year }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        year,
        zakat,
        sadaqah,
        total,
        records,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addDonation,
  getTotals,
};
