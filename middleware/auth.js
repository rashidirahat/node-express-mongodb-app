const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const User = require("../models/User");

// Verify Bearer access token and attach req.user
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Not authorized, no token provided", "UNAUTHORIZED");
    }

    const token = authHeader.slice(7).trim();

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      throw new ApiError(401, "Not authorized, invalid token", "INVALID_TOKEN");
    }

    const user = await User.findById(payload.userId).select("-__v");

    if (!user) {
      throw new ApiError(401, "Not authorized, user not found", "USER_NOT_FOUND");
    }

    if (user.status !== "active") {
      throw new ApiError(403, "Account is not active", "ACCOUNT_INACTIVE");
    }

    req.user = {
      userId: user._id,
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { protect };
