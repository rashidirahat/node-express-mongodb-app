const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      trim: true,
    },
    className: {
      type: String,
      trim: true,
    }
  },
  { _id: false }
);

const teacherSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{8}$/, "teacherId must be exactly 8 digits"],
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true
    },

    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true
    },

    qualification: {
      type: String,
      required: [true, "Qualification is required"],
      trim: true
    },

    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true
    },

    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"]
    },

    teachingExperience: {
      type: Number,
      required: [true, "Teaching experience is required"],
      min: [0, "Teaching experience cannot be negative"]
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Gender is required"]
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active"
    },

    subjects: {
      type: [subjectSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Teacher", teacherSchema);
