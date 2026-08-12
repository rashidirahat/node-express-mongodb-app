const History = require("../models/History");

const getHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.targetModel) filter.targetModel = req.query.targetModel;
    if (req.query.userId) filter.user = req.query.userId;

    const [total, data] = await Promise.all([
      History.countDocuments(filter),
      History.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "name email"),
    ]);

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHistory };
