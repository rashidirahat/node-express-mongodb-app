const crypto = require("crypto");

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const generateStudentId = (length = 8) => {
  const bytes = crypto.randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += alphabet[bytes[i] % alphabet.length];
  }

  return result;
};

const generateTeacherId = () => {
  return crypto.randomInt(10000000, 99999999).toString();
};

module.exports = {
  generateStudentId,
  generateTeacherId
};
