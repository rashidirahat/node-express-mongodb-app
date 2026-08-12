const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");
const ApiError = require("../utils/ApiError");
const { hashValue } = require("../utils/crypto");

const generateAccessToken = (user) => {
  return jwt.sign(
    { name: user.name, userId: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { name: user.name, userId: user._id.toString(), type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d", jwtid: crypto.randomUUID() }
  );
};

const parseExpiresAt = (token) => {
  const payload = jwt.decode(token);
  return payload && payload.exp ? new Date(payload.exp * 1000) : new Date();
};

// Issue a new refresh token and persist its hash
const issueRefreshToken = async (user) => {
  const token = generateRefreshToken(user);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashValue(token),
    expiresAt: parseExpiresAt(token),
  });
  return token;
};

// Verify a refresh token: signature + DB record + not revoked + not expired
const verifyRefreshToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  const record = await RefreshToken.findOne({ tokenHash: hashValue(token) });

  if (!record) {
    throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  if (record.revoked) {
    throw new ApiError(401, "Refresh token has been revoked", "REFRESH_TOKEN_REVOKED");
  }

  if (new Date(record.expiresAt) < new Date()) {
    throw new ApiError(401, "Refresh token has expired", "REFRESH_TOKEN_EXPIRED");
  }

  return { payload, record };
};

// Revoke a refresh token
const revokeRefreshToken = async (token) => {
  const result = await RefreshToken.updateOne(
    { tokenHash: hashValue(token) },
    { revoked: true }
  );
  return result.modifiedCount > 0;
};

const tokenService = {
  generateAccessToken,
  generateRefreshToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
};

module.exports = tokenService;
