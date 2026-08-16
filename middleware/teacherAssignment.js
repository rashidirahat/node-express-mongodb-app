const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

const verifyTeacherStudentAssignment = async (req, res, next) => {
  try {
    const teacherId = req.params.id;
    const studentId = req.params.studentId;
    if (!mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID format" });
    }
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID format" });
    }
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    const assigned = teacher.students.some((s) => s.toString() === student._id.toString());
    if (!assigned) {
      return res.status(403).json({ success: false, message: "Student is not assigned to this teacher" });
    }
    req.teacher = teacher;
    req.student = student;
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { verifyTeacherStudentAssignment };
