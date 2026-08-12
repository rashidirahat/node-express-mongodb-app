const crypto = require("crypto");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const tokenService = require("./token.service");
const ApiError = require("../utils/ApiError");
const { hashValue } = require("../utils/crypto");
const sendEmailUtil = require("../utils/sendEmail");
const { DEFAULT_ROLE_EMAIL } = require("../config/roles");

const refreshTokens = async (refreshToken) => {
  const { record } = await tokenService.verifyRefreshToken(refreshToken);

  const user = await User.findById(record.userId);
  if (!user) {
    throw new ApiError(401, "User not found", "USER_NOT_FOUND");
  }
  if (user.status !== "active") {
    throw new ApiError(403, "Account is not active", "ACCOUNT_INACTIVE");
  }

  // Rotation: revoke the used refresh token and issue a new one
  await tokenService.revokeRefreshToken(refreshToken);

  const newAccessToken = tokenService.generateAccessToken(user);
  const newRefreshToken = await tokenService.issueRefreshToken(user);

  return {
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  };
};

const logout = async (refreshToken) => {
  await tokenService.revokeRefreshToken(refreshToken);
  return { message: "Logged out successfully" };
};

// Sanitize a user document: never include the password hash
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  isVerified: user.isVerified,
});

const issueTokens = async (user) => {
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.issueRefreshToken(user);
  return { accessToken, refreshToken };
};

// @desc    Register with email + password
const signup = async ({ name, email, password }) => {
  console.log("Signup called with:", { name, email, password });
  const existing = await User.findOne({ email: email.toLowerCase() });
  console.log("Existing user check:", existing);
  if (existing) {
    throw new ApiError(409, "An account with this email already exists", "EMAIL_ALREADY_REGISTERED");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: DEFAULT_ROLE_EMAIL,
    status: "active",
  });

  const tokens = await issueTokens(user);

  return {
    message: "Account created successfully",
    data: {
      user: sanitizeUser(user),
      ...tokens,
    },
  };
};

// @desc    Login with email + password
const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  // Generic error: never reveal whether the email exists
  if (!user || !user.password || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "Account is not active", "ACCOUNT_INACTIVE");
  }

  const tokens = await issueTokens(user);

  return {
    message: "Login successful",
    data: {
      user: sanitizeUser(user),
      ...tokens,
    },
  };
};

// @desc    Generate + email a password reset token
const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always succeed: do not leak whether the email exists
  if (!user) {
    return { message: "If an account exists for that email, a reset link has been sent" };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_IN) || 30;

  user.resetPasswordToken = hashValue(resetToken);
  user.resetPasswordExpires = new Date(Date.now() + expiresMinutes * 60 * 1000);
  await user.save();

  const resetUrl = `${process.env.RESET_PASSWORD_URL || "http://localhost:5000/reset-password"}/${resetToken}`;
  await sendEmailUtil.sendEmail({
    to: user.email,
    subject: "Password Reset",
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in ${expiresMinutes} minutes. If you did not request this, please ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in ${expiresMinutes} minutes. If you did not request this, please ignore this email.</p>`,
  });

  return { message: "If an account exists for that email, a reset link has been sent" };
};

// @desc    Validate reset token + update password
const resetPassword = async ({ token, newPassword }) => {
  const hashedToken = hashValue(token);
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    const stale = await User.findOne({ resetPasswordToken: hashedToken });
    if (stale) {
      throw new ApiError(400, "Password reset token has expired", "RESET_TOKEN_EXPIRED");
    }
    throw new ApiError(400, "Invalid password reset token", "INVALID_RESET_TOKEN");
  }

  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  // Invalidate existing refresh tokens so old sessions cannot continue
  await RefreshToken.updateMany(
    { userId: user._id, revoked: false },
    { revoked: true }
  );

  return { message: "Password has been reset successfully" };
};

const authService = {
  refreshTokens,
  logout,
  signup,
  login,
  forgotPassword,
  resetPassword,
};

module.exports = authService;
