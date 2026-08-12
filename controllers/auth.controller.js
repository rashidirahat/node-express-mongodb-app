const authService = require("../services/auth.service");

// @desc    Refresh access token (with rotation)
// @route   POST /api/v1/auth/refresh-token
const refreshToken = async (req, res, next) => {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout / revoke refresh token
// @route   POST /api/v1/auth/logout
const logout = async (req, res, next) => {
  try {
    const result = await authService.logout(req.body.refreshToken);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register with email + password
// @route   POST /api/v1/auth/signup
const signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);
    console.log("Signup result:", result);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login with email + password
// @route   POST /api/v1/auth/login
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send password reset link
// @route   POST /api/v1/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using token from reset link
// @route   POST /api/v1/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword({
      token: req.params.token,
      newPassword: req.body.password,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  refreshToken,
  logout,
  signup,
  login,
  forgotPassword,
  resetPassword,
};
