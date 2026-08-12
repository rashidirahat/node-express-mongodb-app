const express = require("express");
const router = express.Router();
const { getMe, getUsers, updateUserRole } = require("../controllers/user.controller");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const { ROLES } = require("../config/roles");

router.get("/me", protect, getMe);
router.get("/", protect, authorize(ROLES.ADMIN), getUsers);
router.patch(
  "/:id/role",
  protect,
  authorize(ROLES.ADMIN),
  validate({ role: { required: true, type: "string" } }),
  updateUserRole
);

module.exports = router;
