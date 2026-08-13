const mongoose = require("mongoose");
//const { generateStudentId } = require("../utils/uniqueId");

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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Student", studentSchema);