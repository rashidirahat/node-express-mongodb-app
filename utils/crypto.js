const crypto = require("crypto");

// Generate a cryptographically secure 6-digit OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Hash any secret value before storing (OTP, refresh tokens)
const hashValue = (value) => {
  return crypto.createHash("sha256").update(value).digest("hex");
};

module.exports = {
  generateOtp,
  hashValue,
};
