const ApiError = require("../utils/ApiError");
const { ROLE_VALUES } = require("../config/roles");

// Restrict a route to specific roles. Must be used after `protect`
// (which sets req.user = { userId, role }).
// Usage: router.get("/", authenticate, authorize("admin", "editor"), handler)
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    console.log("User role:", req.user?.role);
    console.log("Allowed roles:", allowedRoles);
    try {
      for (const role of allowedRoles) {
        if (!ROLE_VALUES.includes(role)) {
          throw new ApiError(500, `Unknown role "${role}" in route config`, "INVALID_ROLE_CONFIG");
        }
      }

      if (!req.user || !req.user.role) {
        throw new ApiError(401, "Not authorized", "UNAUTHORIZED");
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ApiError(403, "Forbidden: insufficient permissions", "FORBIDDEN");
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

module.exports = { authorize };
