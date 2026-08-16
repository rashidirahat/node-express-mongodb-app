const mongoose = require("mongoose");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const { generateTeacherId } = require("../utils/uniqueId");
const { recordHistory } = require("../services/history.service");
const { addExam, updateExam, addStudyProgress, updateStudyProgress, buildPerformanceSummary } = require("../services/studentTracking.service");

const isCastError = (error) => error.name === "CastError";

const createTeacher = async (req, res) => {
  try {
    const teacherData = {
      ...req.body,
      teacherId: req.body.teacherId || generateTeacherId()
    };
    const teacher = await Teacher.create(teacherData);

    await recordHistory({
      user: req.user,
      action: "CREATE",
      targetModel: "Teacher",
      targetId: teacher._id,
      targetName: teacher.name,
      description: `Created teacher ${teacher.name}`,
      after: teacher.toObject()
    });

    res.status(201).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    const before = teacher.toObject();
    Object.assign(teacher, req.body);
    const updated = await teacher.save();

    await recordHistory({
      user: req.user,
      action: "UPDATE",
      targetModel: "Teacher",
      targetId: updated._id,
      targetName: updated.name,
      description: `Updated teacher ${updated.name}`,
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

const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    await recordHistory({
      user: req.user,
      action: "DELETE",
      targetModel: "Teacher",
      targetId: teacher._id,
      targetName: teacher.name,
      description: `Deleted teacher ${teacher.name}`,
      before: teacher.toObject()
    });

    res.status(200).json({
      success: true,
      message: "Teacher deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const assignStudent = async (req, res) => {
  try {
    if (!req.body.studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }
    if (!mongoose.isValidObjectId(req.body.studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID format" });
    }
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }
    const student = await Student.findById(req.body.studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    if (teacher.students.some((s) => s.toString() === student._id.toString())) {
      return res.status(400).json({ success: false, message: "Student is already assigned to this teacher" });
    }
    teacher.students.addToSet(student._id);
    await teacher.save();
    const populated = await Teacher.findById(teacher._id).populate("students");
    await recordHistory({
      user: req.user,
      action: "CREATE",
      targetModel: "Teacher",
      targetId: teacher._id,
      targetName: teacher.name,
      description: `Assigned student ${student.name} to teacher ${teacher.name}`,
      after: { studentId: student._id, studentName: student.name }
    });
    res.status(201).json({
      success: true,
      message: "Student assigned successfully",
      data: populated
    });
  } catch (error) {
    if (isCastError(error)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID format" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTeacherStudents = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }
    const populated = await Teacher.findById(teacher._id).populate("students");
    res.status(200).json({
      success: true,
      count: populated.students.length,
      data: populated.students
    });
  } catch (error) {
    if (isCastError(error)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID format" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeAssignedStudent = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }
    if (!mongoose.isValidObjectId(req.params.studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID format" });
    }
    const assigned = teacher.students.some((s) => s.toString() === req.params.studentId);
    if (!assigned) {
      return res.status(404).json({ success: false, message: "Student is not assigned to this teacher" });
    }
    const student = await Student.findById(req.params.studentId);
    const before = teacher.toObject();
    teacher.students.pull(req.params.studentId);
    await teacher.save();
    await recordHistory({
      user: req.user,
      action: "DELETE",
      targetModel: "Teacher",
      targetId: teacher._id,
      targetName: teacher.name,
      description: `Removed student ${student ? student.name : req.params.studentId} from teacher ${teacher.name}`,
      before,
      after: teacher.toObject()
    });
    res.status(200).json({
      success: true,
      message: "Student removed successfully"
    });
  } catch (error) {
    if (isCastError(error)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID format" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTeacherStudentDetails = async (req, res) => {
  try {
    const summary = buildPerformanceSummary(req.student);
    res.status(200).json({
      success: true,
      data: {
        ...req.student.toObject(),
        latestExam: summary.latestExam,
        overallExamAverage: summary.overallExamAverage,
        studyProgressSummary: summary.studyProgressSummary,
        needsAttention: summary.needsAttention
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addStudentExam = async (req, res) => {
  try {
    const student = req.student;
    const exam = await addExam(student, req.body);
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
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateStudentExam = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.examId)) {
      return res.status(400).json({ success: false, message: "Invalid exam ID format" });
    }
    const exam = req.student.exams.id(req.params.examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam record not found" });
    }
    const before = exam.toObject();
    const updated = await updateExam(req.student, req.params.examId, req.body);
    await recordHistory({
      user: req.user,
      action: "UPDATE",
      targetModel: "Student",
      targetId: req.student._id,
      targetName: req.student.name,
      description: `Updated exam ${updated.examName} for ${req.student.name}`,
      before,
      after: updated.toObject()
    });
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const addStudentStudyProgress = async (req, res) => {
  try {
    const progress = await addStudyProgress(req.student, req.body);
    await recordHistory({
      user: req.user,
      action: "CREATE",
      targetModel: "Student",
      targetId: req.student._id,
      targetName: req.student.name,
      description: `Added study progress for ${req.student.name}`,
      after: progress.toObject()
    });
    res.status(201).json({
      success: true,
      data: progress
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateStudentStudyProgress = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.progressId)) {
      return res.status(400).json({ success: false, message: "Invalid study progress ID format" });
    }
    const progress = req.student.studyProgress.id(req.params.progressId);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Study progress record not found" });
    }
    const before = progress.toObject();
    const updated = await updateStudyProgress(req.student, req.params.progressId, req.body);
    await recordHistory({
      user: req.user,
      action: "UPDATE",
      targetModel: "Student",
      targetId: req.student._id,
      targetName: req.student.name,
      description: `Updated study progress for ${req.student.name}`,
      before,
      after: updated.toObject()
    });
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getTeacherDashboard = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }
    const populated = await Teacher.findById(teacher._id).populate("students");
    const studentSummaries = populated.students.map((s) => {
      const summary = buildPerformanceSummary(s);
      return { student: s, summary };
    });
    const snapshots = studentSummaries.map(({ student: s, summary }) => ({
      id: s._id,
      studentId: s.studentId,
      name: s.name,
      age: s.age,
      gender: s.gender,
      className: s.className,
      guardianName: s.guardianName,
      phone: s.phone,
      examsCount: s.exams.length,
      latestExam: summary.latestExam,
      overallExamAverage: summary.overallExamAverage,
      studyProgressSummary: summary.studyProgressSummary,
      needsAttention: summary.needsAttention
    }));
    const needsAttentionList = studentSummaries
      .filter(({ summary }) => summary.needsAttention.length > 0)
      .map(({ student: s, summary }) => ({
        studentId: s._id,
        name: s.name,
        reasons: summary.needsAttention
      }));
    res.status(200).json({
      success: true,
      data: {
        teacher: {
          id: teacher._id,
          name: teacher.name,
          teacherId: teacher.teacherId,
          specialization: teacher.specialization,
          qualification: teacher.qualification,
          status: teacher.status
        },
        totalStudents: populated.students.length,
        students: snapshots,
        needsAttention: needsAttentionList
      }
    });
  } catch (error) {
    if (isCastError(error)) {
      return res.status(400).json({ success: false, message: "Invalid teacher ID format" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  assignStudent,
  getTeacherStudents,
  removeAssignedStudent,
  getTeacherStudentDetails,
  addStudentExam,
  updateStudentExam,
  addStudentStudyProgress,
  updateStudentStudyProgress,
  getTeacherDashboard
};
