const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    userRole: {
      type: String,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "ROLE_CHANGE", "ADD_FUND", "SPEND_FUND"],
      required: true,
    },
    targetModel: {
      type: String,
      enum: ["Student", "User", "Teacher", "Expense"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    targetName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

historySchema.index({ createdAt: -1 });

module.exports = mongoose.model("History", historySchema);
