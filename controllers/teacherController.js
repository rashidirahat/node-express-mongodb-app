const Teacher = require("../models/Teacher");
const { generateTeacherId } = require("../utils/uniqueId");
const { recordHistory } = require("../services/history.service");

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

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
};
