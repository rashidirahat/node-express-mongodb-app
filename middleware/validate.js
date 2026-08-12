const ApiError = require("../utils/ApiError");

/**
 * Validate request body fields against a declarative spec.
 *
 * Usage:
 *   validate({
 *     email: { required: true, type: "string", email: true },
 *     password: { required: true, type: "string", minLength: 8, maxLength: 72 },
 *   })
 */
const validate =
  (spec) =>
  (req, res, next) => {
    try {
      const body = req.body || {};

      for (const [field, rules] of Object.entries(spec)) {
        const value = body[field];

        if (rules.required && (value === undefined || value === null || value === "")) {
          throw new ApiError(400, `${field} is required`, "VALIDATION_ERROR");
        }

        if (value === undefined || value === null || value === "") {
          continue;
        }

        if (rules.type && typeof value !== rules.type) {
          throw new ApiError(400, `${field} must be a ${rules.type}`, "VALIDATION_ERROR");
        }

        if (rules.digitsOnly && !/^\d+$/.test(String(value))) {
          throw new ApiError(400, `${field} must contain only digits`, "VALIDATION_ERROR");
        }

        if (rules.length !== undefined && String(value).length !== rules.length) {
          throw new ApiError(
            400,
            `${field} must be exactly ${rules.length} characters`,
            "VALIDATION_ERROR"
          );
        }

        if (rules.minLength !== undefined && String(value).length < rules.minLength) {
          throw new ApiError(
            400,
            `${field} must be at least ${rules.minLength} characters`,
            "VALIDATION_ERROR"
          );
        }

        if (rules.maxLength !== undefined && String(value).length > rules.maxLength) {
          throw new ApiError(
            400,
            `${field} must be at most ${rules.maxLength} characters`,
            "VALIDATION_ERROR"
          );
        }

        if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          throw new ApiError(400, `${field} must be a valid email`, "VALIDATION_ERROR");
        }

        if (rules.pattern && !rules.pattern.test(String(value))) {
          throw new ApiError(400, `${field} is invalid`, "VALIDATION_ERROR");
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

module.exports = validate;
