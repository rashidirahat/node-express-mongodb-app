const mongoose = require("mongoose");
const Student = require("../models/Student");
const { generateStudentId } = require("../utils/uniqueId");
const { recordHistory } = require("../services/history.service");
const {
  addExam: addExamService,
  updateExam: updateExamService,
  addStudyProgress: addStudyProgressService,
  updateStudyProgress: updateStudyProgressService,
  buildPerformanceSummary
} = require("../services/studentTracking.service");

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

    const summary = buildPerformanceSummary(student);
    const studyProgress = student.studyProgress;

    res.status(200).json({
      success: true,
      data: {
        ...student.toObject(),
        exams: summary.exams,
        studyProgress,
        overallExamAverage: summary.overallExamAverage,
        studyProgressSummary: summary.studyProgressSummary
      }
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

const addExam = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const exam = await addExamService(student, req.body);

    await recordHistory({
      user: req.user,
      action: "CREATE",
      targetModel: "Student",
      targetId: student._id,
      targetName: student.name,
      description: `Added exam ${exam.examName} for ${student.name}`,
      after: exam.toObject()
    });

    res.status(201).json({
      success: true,
      data: exam
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getExams = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const exams = [...student.exams].sort((a, b) => b.examDate - a.examDate);

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateExam = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!mongoose.isValidObjectId(req.params.examId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID format"
      });
    }

    const exam = student.exams.id(req.params.examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam record not found"
      });
    }

    const before = exam.toObject();
    const updated = await updateExamService(student, req.params.examId, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Exam record not found"
      });
    }

    await recordHistory({
      user: req.user,
      action: "UPDATE",
      targetModel: "Student",
      targetId: student._id,
      targetName: student.name,
      description: `Updated exam ${updated.examName} for ${student.name}`,
      before,
      after: updated.toObject()
    });

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const deleteExam = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!mongoose.isValidObjectId(req.params.examId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID format"
      });
    }

    const exam = student.exams.id(req.params.examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam record not found"
      });
    }

    const before = exam.toObject();
    student.exams.pull({ _id: exam._id });
    await student.save();

    await recordHistory({
      user: req.user,
      action: "DELETE",
      targetModel: "Student",
      targetId: student._id,
      targetName: student.name,
      description: `Deleted exam ${exam.examName} for ${student.name}`,
      before
    });

    res.status(200).json({
      success: true,
      message: "Exam record deleted successfully"
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const addStudyProgress = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const progress = await addStudyProgressService(student, req.body);

    await recordHistory({
      user: req.user,
      action: "CREATE",
      targetModel: "Student",
      targetId: student._id,
      targetName: student.name,
      description: `Added study progress for ${student.name}`,
      after: progress.toObject()
    });

    res.status(201).json({
      success: true,
      data: progress
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getStudyProgress = async (req, res) => {
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
      count: student.studyProgress.length,
      data: student.studyProgress
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateStudyProgress = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!mongoose.isValidObjectId(req.params.progressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study progress ID format"
      });
    }

    const progress = student.studyProgress.id(req.params.progressId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Study progress record not found"
      });
    }

    const before = progress.toObject();
    const updated = await updateStudyProgressService(student, req.params.progressId, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Study progress record not found"
      });
    }

    await recordHistory({
      user: req.user,
      action: "UPDATE",
      targetModel: "Student",
      targetId: student._id,
      targetName: student.name,
      description: `Updated study progress for ${student.name}`,
      before,
      after: updated.toObject()
    });

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const deleteStudyProgress = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!mongoose.isValidObjectId(req.params.progressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study progress ID format"
      });
    }

    const progress = student.studyProgress.id(req.params.progressId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Study progress record not found"
      });
    }

    const before = progress.toObject();
    student.studyProgress.pull({ _id: progress._id });
    await student.save();

    await recordHistory({
      user: req.user,
      action: "DELETE",
      targetModel: "Student",
      targetId: student._id,
      targetName: student.name,
      description: `Deleted study progress for ${student.name}`,
      before
    });

    res.status(200).json({
      success: true,
      message: "Study progress record deleted successfully"
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format"
      });
    }
    res.status(400).json({
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
  deleteStudent,
  addExam,
  getExams,
  updateExam,
  deleteExam,
  addStudyProgress,
  getStudyProgress,
  updateStudyProgress,
  deleteStudyProgress
};