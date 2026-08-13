const express = require("express");
const router = express.Router();
const {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
} = require("../controllers/teacherController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { ROLES } = require("../config/roles");

router
  .route("/")
  .post(protect, authorize(ROLES.ADMIN), createTeacher)
  .get(protect, getTeachers);
router
  .route("/:id")
  .get(protect, getTeacherById)
  .put(protect, authorize(ROLES.ADMIN), updateTeacher)
  .delete(protect, authorize(ROLES.ADMIN), deleteTeacher);

module.exports = router;
