const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const { request, app, startDb, stopDb, clearDb, signupUser, uniqueEmail } = require("./helpers");

const issueAdminToken = async () => {
  const user = await User.create({
    name: "Admin",
    email: uniqueEmail(),
    role: "admin",
    status: "active",
  });
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
};

const createTeacher = (token, payload) => {
  return request(app)
    .post("/api/v1/teachers")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
};

const createStudent = (token, payload) => {
  return request(app)
    .post("/api/v1/students")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
};

const assignStudent = (token, teacherId, studentId) => {
  return request(app)
    .post(`/api/v1/teachers/${teacherId}/students`)
    .set("Authorization", `Bearer ${token}`)
    .send({ studentId });
};

const teacherPayload = {
  name: "Mr. Smith",
  address: "456 Elm St",
  qualification: "M.Sc, B.Ed",
  specialization: "Mathematics",
  joiningDate: "2020-06-15",
  teachingExperience: 6,
  gender: "male",
  subjects: [
    { subject: "Mathematics", className: "Class 10", schedule: "Mon-Wed" },
    { subject: "Physics", className: "Class 11", schedule: "Tue-Thu" },
  ],
};

const studentPayload = {
  name: "John Doe",
  age: 15,
  address: "123 Main St",
  gender: "male",
  guardianName: "Jane Doe",
  className: "Class 10",
  studentType: "day",
};

describe("Teacher Student Assignment & Tracking API", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("POST /api/v1/teachers/:id/students assigns a student and returns the populated teacher", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    assert.equal(teacher.status, 201);
    const student = await createStudent(token, studentPayload);
    assert.equal(student.status, 201);

    const res = await assignStudent(token, teacher.body.data._id, student.body.data._id);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Student assigned successfully");
    assert.equal(res.body.data.students[0]._id, student.body.data._id);
  });

  it("POST assign rejects a duplicate student assignment", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);
    const res = await assignStudent(token, teacher.body.data._id, student.body.data._id);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Student is already assigned to this teacher");
  });

  it("POST assign requires a studentId in the body", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    assert.equal(teacher.status, 201);

    const res = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.message, "studentId is required");
  });

  it("POST assign rejects an invalid studentId format", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    assert.equal(teacher.status, 201);

    const res = await assignStudent(token, teacher.body.data._id, "not-a-valid-id");

    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Invalid student ID format");
  });

  it("POST assign with a nonexistent student returns 404", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    assert.equal(teacher.status, 201);

    const missingId = new mongoose.Types.ObjectId().toString();
    const res = await assignStudent(token, teacher.body.data._id, missingId);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Student not found");
  });

  it("POST assign with a nonexistent teacher returns 404", async () => {
    const token = await issueAdminToken();
    const student = await createStudent(token, studentPayload);
    assert.equal(student.status, 201);

    const missingId = new mongoose.Types.ObjectId().toString();
    const res = await assignStudent(token, missingId, student.body.data._id);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Teacher not found");
  });

  it("GET /api/v1/teachers/:id/students returns populated students with exams and studyProgress", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    assert.equal(teacher.status, 201);
    const student = await createStudent(token, studentPayload);
    assert.equal(student.status, 201);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const exam = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        examName: "Midterm",
        subject: "Mathematics",
        examDate: "2026-01-15",
        totalMarks: 60,
        obtainedMarks: 45,
      });
    assert.equal(exam.status, 201);

    const progress = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/study-progress`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Mathematics", topic: "Quadratic Equations" });
    assert.equal(progress.status, 201);

    const res = await request(app)
      .get(`/api/v1/teachers/${teacher.body.data._id}/students`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0]._id, student.body.data._id);
    assert.equal(res.body.data[0].exams.length, 1);
    assert.equal(res.body.data[0].studyProgress.length, 1);
  });

  it("DELETE /api/v1/teachers/:id/students/:studentId removes the assignment", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const res = await request(app)
      .delete(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Student removed successfully");

    const getRes = await request(app)
      .get(`/api/v1/teachers/${teacher.body.data._id}/students`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.count, 0);
  });

  it("DELETE removing an unassigned student returns 404", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    const res = await request(app)
      .delete(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Student is not assigned to this teacher");
  });

  it("GET /api/v1/teachers/:id/students/:studentId returns student summary for an assigned student", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const exam = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        examName: "Midterm",
        subject: "Mathematics",
        examDate: "2026-01-15",
        totalMarks: 60,
        obtainedMarks: 45,
      });
    assert.equal(exam.status, 201);

    const res = await request(app)
      .get(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, "John Doe");
    assert.equal(res.body.data.overallExamAverage, 75);
    assert.ok(res.body.data.studyProgressSummary);
  });

  it("GET /:id/students/:studentId for an unassigned student returns 403", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);
    assert.equal(teacher.status, 201);
    assert.equal(student.status, 201);

    const res = await request(app)
      .get(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Student is not assigned to this teacher");
  });

  it("GET /:id/students/:studentId with a nonexistent teacher returns 404", async () => {
    const token = await issueAdminToken();
    const teacherId = new mongoose.Types.ObjectId().toString();
    const studentId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/teachers/${teacherId}/students/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Teacher not found");
  });

  it("GET /:id/students/:studentId with an invalid studentId format returns 400", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    assert.equal(teacher.status, 201);

    const res = await request(app)
      .get(`/api/v1/teachers/${teacher.body.data._id}/students/not-a-valid-id`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Invalid student ID format");
  });

  it("POST exam via teacher scoping computes percentage for an assigned student", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const res = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        examName: "Midterm",
        subject: "Mathematics",
        examDate: "2026-01-15",
        totalMarks: 60,
        obtainedMarks: 45,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.examName, "Midterm");
    assert.equal(res.body.data.percentage, 75);
  });

  it("POST exam for an unassigned student returns 403", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);
    assert.equal(teacher.status, 201);
    assert.equal(student.status, 201);

    const res = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        examName: "Midterm",
        subject: "Mathematics",
        examDate: "2026-01-15",
        totalMarks: 60,
        obtainedMarks: 45,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Student is not assigned to this teacher");
  });

  it("POST exam rejects obtainedMarks greater than totalMarks", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const res = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        examName: "Midterm",
        subject: "Mathematics",
        examDate: "2026-01-15",
        totalMarks: 50,
        obtainedMarks: 60,
      });

    assert.equal(res.status, 400);
  });

  it("POST exam rejects a missing examName", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const res = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        subject: "Mathematics",
        examDate: "2026-01-15",
        totalMarks: 50,
        obtainedMarks: 40,
      });

    assert.equal(res.status, 400);
  });

  it("PUT exam via teacher scoping updates fields and recomputes percentage", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const exam = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        examName: "Midterm",
        subject: "Mathematics",
        examDate: "2026-01-15",
        totalMarks: 60,
        obtainedMarks: 45,
      });
    assert.equal(exam.status, 201);

    const res = await request(app)
      .put(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams/${exam.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ totalMarks: 50, obtainedMarks: 25, grade: "B" });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.grade, "B");
    assert.equal(res.body.data.totalMarks, 50);
    assert.equal(res.body.data.obtainedMarks, 25);
    assert.equal(res.body.data.percentage, 50);
  });

  it("PUT exam with a valid but nonexistent examId returns 404", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const missingId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/exams/${missingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grade: "A" });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Exam record not found");
  });

  it("POST study-progress applies defaults and PUT updates status and percentage", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const created = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/study-progress`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Mathematics", topic: "Quadratic Equations" });

    assert.equal(created.status, 201);
    assert.equal(created.body.success, true);
    assert.equal(created.body.data.subject, "Mathematics");
    assert.equal(created.body.data.status, "not_started");
    assert.equal(created.body.data.progressPercentage, 0);

    const updated = await request(app)
      .put(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/study-progress/${created.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "in_progress", progressPercentage: 40 });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.success, true);
    assert.equal(updated.body.data.status, "in_progress");
    assert.equal(updated.body.data.progressPercentage, 40);
  });

  it("POST study-progress for an unassigned student returns 403", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);
    assert.equal(teacher.status, 201);
    assert.equal(student.status, 201);

    const res = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/study-progress`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Mathematics", topic: "Quadratic Equations" });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Student is not assigned to this teacher");
  });

  it("POST study-progress rejects an invalid status", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const res = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/study-progress`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Mathematics", topic: "Quadratic Equations", status: "done" });

    assert.equal(res.status, 400);
  });

  it("PUT study-progress with a valid but nonexistent progressId returns 404", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    const student = await createStudent(token, studentPayload);

    await assignStudent(token, teacher.body.data._id, student.body.data._id);

    const missingId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/api/v1/teachers/${teacher.body.data._id}/students/${student.body.data._id}/study-progress/${missingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ progressPercentage: 20 });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Study progress record not found");
  });

  it("GET /api/v1/teachers/:id/dashboard returns student snapshots with needsAttention", async () => {
    const token = await issueAdminToken();
    const teacher = await createTeacher(token, teacherPayload);
    assert.equal(teacher.status, 201);

    const studentA = await createStudent(token, studentPayload);
    assert.equal(studentA.status, 201);
    const studentB = await createStudent(token, { ...studentPayload, name: "Jane Doe" });
    assert.equal(studentB.status, 201);

    await assignStudent(token, teacher.body.data._id, studentA.body.data._id);
    await assignStudent(token, teacher.body.data._id, studentB.body.data._id);

    const examA = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${studentA.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        examName: "Midterm",
        subject: "Mathematics",
        examDate: "2026-01-15",
        totalMarks: 60,
        obtainedMarks: 45,
      });
    assert.equal(examA.status, 201);

    const progressB = await request(app)
      .post(`/api/v1/teachers/${teacher.body.data._id}/students/${studentB.body.data._id}/study-progress`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        subject: "Mathematics",
        topic: "Quadratic Equations",
        status: "completed",
        progressPercentage: 100,
      });
    assert.equal(progressB.status, 201);

    const res = await request(app)
      .get(`/api/v1/teachers/${teacher.body.data._id}/dashboard`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.totalStudents, 2);
    assert.equal(res.body.data.students.length, 2);
    assert.equal(res.body.data.students[0].overallExamAverage, 75);
    assert.equal(res.body.data.students[0].examsCount, 1);
    assert.equal(res.body.data.students[0].studyProgressSummary.total, 0);
    assert.equal(res.body.data.students[1].examsCount, 0);
    assert.equal(res.body.data.students[1].studyProgressSummary.total, 1);
    assert.equal(res.body.data.students[1].studyProgressSummary.completed, 1);

    const aAttention = res.body.data.needsAttention.find((s) => s.studentId === studentA.body.data._id);
    const bAttention = res.body.data.needsAttention.find((s) => s.studentId === studentB.body.data._id);

    assert.ok(aAttention);
    assert.equal(aAttention.name, "John Doe");
    assert.ok(aAttention.reasons.includes("no study-progress record"));

    assert.ok(bAttention);
    assert.equal(bAttention.name, "Jane Doe");
    assert.ok(bAttention.reasons.includes("no exam record"));
  });
});
