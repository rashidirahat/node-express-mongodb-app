// Central, configurable role list used by both the User model and RBAC middleware.
// Extend this array to add new roles.
const ROLES = {
  STUDENT: "student",
  PARENT: "parent",
  TEACHER: "teacher",
  ADMIN: "admin",
  USER: "user",
  EDITOR: "editor",
};

const ROLE_VALUES = Object.values(ROLES);

// Default role for email/password registration
const DEFAULT_ROLE_EMAIL = ROLES.USER;

module.exports = {
  ROLES,
  ROLE_VALUES,
  DEFAULT_ROLE_EMAIL,
};
