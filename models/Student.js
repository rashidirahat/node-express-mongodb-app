const mongoose = require("mongoose");
//const { generateStudentId } = require("../utils/uniqueId");

const examSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: [true, "Exam name is required"],
      trim: true
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true
    },
    examDate: {
      type: Date,
      required: [true, "Exam date is required"]
    },
    totalMarks: {
      type: Number,
      required: [true, "Total marks is required"],
      min: [1, "Total marks must be at least 1"]
    },
    obtainedMarks: {
      type: Number,
      required: [true, "Obtained marks is required"],
      min: [0, "Obtained marks cannot be negative"],
      validate: {
        validator: function (v) {
          return v <= this.totalMarks;
        },
        message: "Obtained marks cannot exceed total marks"
      }
    },
    grade: {
      type: String,
      trim: true
    },
    remarks: {
      type: String,
      trim: true
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

examSchema.virtual("percentage").get(function () {
  return this.totalMarks ? Math.round((this.obtainedMarks / this.totalMarks) * 10000) / 100 : null;
});

const studyProgressSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true
    },
    topic: {
      type: String,
      required: [true, "Topic is required"],
      trim: true
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
      required: [true, "Status is required"]
    },
    progressPercentage: {
      type: Number,
      min: [0, "Progress percentage cannot be below 0"],
      max: [100, "Progress percentage cannot exceed 100"],
      default: 0
    },
    notes: {
      type: String,
      trim: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
);

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true
    },

    age: {
      type: Number,
      required: [true, "Age of student required"],
    },

    address: {
        type:String,
        required:[true, "Address of the student is required"],
        trim:true
    },

    gender: {
        type: String,
        enum: ["male", "female"],
        required: [true, "Gender is required"]
    },

    guardianName: {
        type:String,
        required:[true, "Guardian name is required"],
        trim:true
    },

    className: {
      type: String,
      required: true
    },
    studentType:{
      type: String,
      enum: ['day', 'hostel'],
      required: true
    },

    phone: {
      type: String
    },

    exams: {
      type: [examSchema],
      default: []
    },

    studyProgress: {
      type: [studyProgressSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Student", studentSchema);