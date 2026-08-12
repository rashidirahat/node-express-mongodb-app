const Student = require("../models/Student");
const { generateStudentId } = require("../utils/uniqueId");
const { recordHistory } = require("../services/history.service");

const createStudent = async (req, res) => {
  try {
    const studentData = {
      ...req.body,
      studentId: req.body.studentId || generateStudentId()
    };
   //console.log("Student Data:", studentData); // Log the student data for debugging
    const student = await Student.create(studentData);

    await recordHistory({
      user: req.user,
      action: "CREATE",
      targetModel: "Student",
      targetId: student._id,
      targetName: student.name,
      description: `Created student ${student.name}`,
      after: student.toObject()
    });

    res.status(201).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getStudents = async (req, res) => {
  try {
    const students = await Student.find();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const before = student.toObject();
    Object.assign(student, req.body);
    const updated = await student.save();

    await recordHistory({
      user: req.user,
      action: "UPDATE",
      targetModel: "Student",
      targetId: updated._id,
      targetName: updated.name,
      description: `Updated student ${updated.name}`,
      before,
      after: updated.toObject()
    });

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    await recordHistory({
      user: req.user,
      action: "DELETE",
      targetModel: "Student",
      targetId: student._id,
      targetName: student.name,
      description: `Deleted student ${student.name}`,
      before: student.toObject()
    });

    res.status(200).json({
      success: true,
      message: "Student deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent
};