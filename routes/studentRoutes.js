const express = require("express");
const router = express.Router();
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} = require("../controllers/studentController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { ROLES } = require("../config/roles");

router
  .route("/")
  .post(protect, authorize(ROLES.ADMIN), createStudent)
  .get(protect, getStudents);
router
  .route("/:id")
  .get(protect, getStudentById)
  .put(protect, authorize(ROLES.ADMIN), updateStudent)
  .delete(protect, authorize(ROLES.ADMIN), deleteStudent);

module.exports = router;