const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// Generic IP-based limiter applied to all auth endpoints
const authIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.AUTH_IP_LIMIT_PER_HOUR) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
    errorCode: "RATE_LIMITED",
  },
});

// Email-based limiter for password reset requests (prevents email flooding)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.PASSWORD_RESET_LIMIT_PER_HOUR) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body.email || "").toString().trim().toLowerCase();
    return `${ipKeyGenerator(req.ip, 48)}:${email}`;
  },
  message: {
    success: false,
    message: "Too many password reset requests, please try again later",
    errorCode: "RATE_LIMITED",
  },
});

module.exports = {
  authIpLimiter,
  forgotPasswordLimiter,
};
