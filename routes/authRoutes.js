const express = require("express");
const router = express.Router();
const {
  refreshToken,
  logout,
  signup,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const { forgotPasswordLimiter } = require("../middleware/rateLimiters");

router.post(
  "/refresh-token",
  validate({
    refreshToken: { required: true, type: "string" },
  }),
  refreshToken
);

router.post(
  "/logout",
  validate({
    refreshToken: { required: true, type: "string" },
  }),
  logout
);

router.post(
  "/signup",
  validate({
    name: { required: true, type: "string", minLength: 2, maxLength: 100 },
    email: { required: true, type: "string", email: true },
    password: { required: true, type: "string", minLength: 8, maxLength: 72 },
  }),
  signup
);

router.post(
  "/login",
  validate({
    email: { required: true, type: "string", email: true },
    password: { required: true, type: "string", minLength: 8, maxLength: 72 },
  }),
  login
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate({
    email: { required: true, type: "string", email: true },
  }),
  forgotPassword
);

router.post(
  "/reset-password/:token",
  validate({
    password: { required: true, type: "string", minLength: 8, maxLength: 72 },
  }),
  resetPassword
);

module.exports = router;
