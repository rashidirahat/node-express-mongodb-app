const History = require("../models/History");
const User = require("../models/User");

const recordHistory = async ({ user, action, targetModel, targetId, targetName, description, before = {}, after = {} }) => {
  let userName = "";
  if (user && user.userId) {
    const actor = await User.findById(user.userId).select("name");
    userName = actor ? actor.name || "" : "";
  }
  return History.create({
    user: user.userId,
    userName,
    userRole: user.role,
    action,
    targetModel,
    targetId,
    targetName,
    description,
    before,
    after,
  });
};

module.exports = { recordHistory };
