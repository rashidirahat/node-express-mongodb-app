const Donation = require("../models/Donation");

const getDonationTotals = async (userId, year) => {
  const match = { user: userId };
  if (year) match.year = year;

  const results = await Donation.aggregate([
    { $match: match },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
  ]);

  const totals = {
    zakat: 0,
    sadaqah: 0,
  };

  for (const result of results) {
    if (result._id === "zakat" || result._id === "sadaqah") {
      totals[result._id] = result.total;
    }
  }

  return { zakat: totals.zakat, sadaqah: totals.sadaqah, total: totals.zakat + totals.sadaqah };
};

module.exports = { getDonationTotals };
