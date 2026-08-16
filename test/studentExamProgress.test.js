const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const History = require("../models/History");
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

const createStudent = (token, payload) => {
  return request(app)
    .post("/api/v1/students")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
};

const createExam = (token, studentId, payload) => {
  return request(app)
    .post(`/api/v1/students/${studentId}/exams`)
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
};

const createProgress = (token, studentId, payload) => {
  return request(app)
    .post(`/api/v1/students/${studentId}/study-progress`)
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
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

describe("Student Exam & Study Progress API", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("POST /api/v1/students/:id/exams adds a record with computed percentage and history", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const res = await createExam(token, created.body.data._id, {
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

    const h = await History.findOne({
      action: "CREATE",
      targetModel: "Student",
      "after.examName": "Midterm",
    });
    assert.ok(h);
    assert.equal(h.targetName, "John Doe");
  });

  it("POST exam rejects obtainedMarks greater than totalMarks", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const res = await createExam(token, created.body.data._id, {
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
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const res = await createExam(token, created.body.data._id, {
      subject: "Mathematics",
      examDate: "2026-01-15",
      totalMarks: 50,
      obtainedMarks: 40,
    });

    assert.equal(res.status, 400);
  });

  it("GET /api/v1/students/:id/exams returns exams sorted by examDate descending", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    await createExam(token, created.body.data._id, {
      examName: "Midterm",
      subject: "Mathematics",
      examDate: "2026-01-15",
      totalMarks: 60,
      obtainedMarks: 45,
    });
    await createExam(token, created.body.data._id, {
      examName: "Final",
      subject: "Physics",
      examDate: "2026-05-01",
      totalMarks: 100,
      obtainedMarks: 80,
    });

    const res = await request(app)
      .get(`/api/v1/students/${created.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 2);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.data[0].examName, "Final");
    assert.equal(res.body.data[1].examName, "Midterm");
  });

  it("PUT /api/v1/students/:id/exams/:examId updates fields and recomputes percentage", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const exam = await createExam(token, created.body.data._id, {
      examName: "Midterm",
      subject: "Mathematics",
      examDate: "2026-01-15",
      totalMarks: 60,
      obtainedMarks: 45,
    });
    assert.equal(exam.status, 201);

    const res = await request(app)
      .put(`/api/v1/students/${created.body.data._id}/exams/${exam.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ totalMarks: 50, obtainedMarks: 25, grade: "B" });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.grade, "B");
    assert.equal(res.body.data.totalMarks, 50);
    assert.equal(res.body.data.obtainedMarks, 25);
    assert.equal(res.body.data.percentage, 50);
  });

  it("DELETE /api/v1/students/:id/exams/:examId removes the record and records history", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const exam = await createExam(token, created.body.data._id, {
      examName: "Midterm",
      subject: "Mathematics",
      examDate: "2026-01-15",
      totalMarks: 60,
      obtainedMarks: 45,
    });
    assert.equal(exam.status, 201);

    const delRes = await request(app)
      .delete(`/api/v1/students/${created.body.data._id}/exams/${exam.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);
    assert.equal(delRes.body.message, "Exam record deleted successfully");

    const getRes = await request(app)
      .get(`/api/v1/students/${created.body.data._id}/exams`)
      .set("Authorization", `Bearer ${token}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.count, 0);

    const h = await History.findOne({
      action: "DELETE",
      targetModel: "Student",
      "before.examName": "Midterm",
    });
    assert.ok(h);
  });

  it("POST /api/v1/students/:id/study-progress returns 201 with defaults and history", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const res = await createProgress(token, created.body.data._id, {
      subject: "Mathematics",
      topic: "Quadratic Equations",
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subject, "Mathematics");
    assert.equal(res.body.data.status, "not_started");
    assert.equal(res.body.data.progressPercentage, 0);

    const h = await History.findOne({
      action: "CREATE",
      targetModel: "Student",
      "after.subject": "Mathematics",
    });
    assert.ok(h);
  });

  it("POST study-progress rejects an invalid status", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const res = await createProgress(token, created.body.data._id, {
      subject: "Mathematics",
      topic: "Quadratic Equations",
      status: "done",
    });

    assert.equal(res.status, 400);
  });

  it("PUT /api/v1/students/:id/study-progress/:progressId updates status and percentage", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const progress = await createProgress(token, created.body.data._id, {
      subject: "Mathematics",
      topic: "Quadratic Equations",
    });
    assert.equal(progress.status, 201);

    const res = await request(app)
      .put(`/api/v1/students/${created.body.data._id}/study-progress/${progress.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "in_progress", progressPercentage: 40 });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, "in_progress");
    assert.equal(res.body.data.progressPercentage, 40);
  });

  it("DELETE /api/v1/students/:id/study-progress/:progressId removes the record and records history", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const progress = await createProgress(token, created.body.data._id, {
      subject: "Mathematics",
      topic: "Quadratic Equations",
    });
    assert.equal(progress.status, 201);

    const delRes = await request(app)
      .delete(`/api/v1/students/${created.body.data._id}/study-progress/${progress.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);
    assert.equal(delRes.body.message, "Study progress record deleted successfully");

    const getRes = await request(app)
      .get(`/api/v1/students/${created.body.data._id}/study-progress`)
      .set("Authorization", `Bearer ${token}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.count, 0);

    const h = await History.findOne({
      action: "DELETE",
      targetModel: "Student",
      "before.subject": "Mathematics",
    });
    assert.ok(h);
  });

  it("GET /api/v1/students/:id returns overallExamAverage and studyProgressSummary", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    await createExam(token, created.body.data._id, {
      examName: "Midterm",
      subject: "Mathematics",
      examDate: "2026-01-15",
      totalMarks: 60,
      obtainedMarks: 45,
    });
    await createExam(token, created.body.data._id, {
      examName: "Final",
      subject: "Physics",
      examDate: "2026-05-01",
      totalMarks: 50,
      obtainedMarks: 30,
    });
    await createProgress(token, created.body.data._id, {
      subject: "Mathematics",
      topic: "Quadratic Equations",
      status: "completed",
      progressPercentage: 100,
    });
    await createProgress(token, created.body.data._id, {
      subject: "Physics",
      topic: "Optics",
      status: "in_progress",
      progressPercentage: 50,
    });

    const res = await request(app)
      .get(`/api/v1/students/${created.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.exams.length, 2);
    assert.equal(res.body.data.studyProgress.length, 2);
    assert.equal(res.body.data.overallExamAverage, 67.5);
    assert.equal(res.body.data.studyProgressSummary.total, 2);
    assert.equal(res.body.data.studyProgressSummary.notStarted, 0);
    assert.equal(res.body.data.studyProgressSummary.inProgress, 1);
    assert.equal(res.body.data.studyProgressSummary.completed, 1);
    assert.equal(res.body.data.studyProgressSummary.averageProgressPercentage, 75);
  });

  it("POST exam with a nonexistent student returns 404", async () => {
    const token = await issueAdminToken();
    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await createExam(token, missingId, {
      examName: "Midterm",
      subject: "Mathematics",
      examDate: "2026-01-15",
      totalMarks: 60,
      obtainedMarks: 45,
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Student not found");
  });

  it("PUT exam with an invalid exam id format returns 400", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const res = await request(app)
      .put(`/api/v1/students/${created.body.data._id}/exams/not-a-valid-id`)
      .set("Authorization", `Bearer ${token}`)
      .send({ grade: "A" });

    assert.equal(res.status, 400);
    assert.equal(res.body.message, "Invalid exam ID format");
  });

  it("PUT study-progress with a valid but nonexistent progress id returns 404", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/v1/students/${created.body.data._id}/study-progress/${missingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ progressPercentage: 20 });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Study progress record not found");
  });
});
