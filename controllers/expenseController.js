const Expense = require("../models/Expense");
const { recordHistory } = require("../services/history.service");

const addAmount = async (req, res) => {
  try {
    if (!req.body.amount || Number(req.body.amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
        errorCode: "VALIDATION_ERROR",
      });
    }

    const amount = Number(req.body.amount);

    const expense = await Expense.findOneAndUpdate(
      { type: "main" },
      { $inc: { currentAmount: amount, totalAdded: amount } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await recordHistory({
      user: req.user,
      action: "ADD_FUND",
      targetModel: "Expense",
      targetId: expense._id,
      targetName: "Expense Account",
      description: req.body.description,
      after: {
        amount,
        currentAmount: expense.currentAmount,
        totalAdded: expense.totalAdded,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        currentAmount: expense.currentAmount,
        totalAdded: expense.totalAdded,
        totalSpent: expense.totalSpent,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const spendAmount = async (req, res) => {
  try {
    if (!req.body.amount || Number(req.body.amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
        errorCode: "VALIDATION_ERROR",
      });
    }

    const amount = Number(req.body.amount);

    const expense = await Expense.findOneAndUpdate(
      { type: "main" },
      { $inc: { currentAmount: -amount, totalSpent: amount } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await recordHistory({
      user: req.user,
      action: "SPEND_FUND",
      targetModel: "Expense",
      targetId: expense._id,
      targetName: "Expense Account",
      description: req.body.description,
      after: {
        amount,
        currentAmount: expense.currentAmount,
        totalSpent: expense.totalSpent,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        currentAmount: expense.currentAmount,
        totalAdded: expense.totalAdded,
        totalSpent: expense.totalSpent,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTotal = async (req, res) => {
  try {
    const expense = await Expense.findOne({ type: "main" });

    if (!expense) {
      return res.status(200).json({
        success: true,
        data: { currentAmount: 0 },
      });
    }

    res.status(200).json({
      success: true,
      data: { currentAmount: expense.currentAmount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addAmount,
  spendAmount,
  getTotal,
};
