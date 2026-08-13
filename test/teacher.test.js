const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
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

const createTeacher = (token, payload) => {
  return request(app)
    .post("/api/v1/teachers")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
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

describe("Teacher API", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("POST /api/v1/teachers creates a teacher with 8-digit teacherId and history", async () => {
    const token = await issueAdminToken();

    const res = await createTeacher(token, teacherPayload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, "Mr. Smith");
    assert.match(res.body.data.teacherId, /^\d{8}$/);
    assert.equal(res.body.data.status, "active");
    assert.equal(res.body.data.subjects.length, 2);

    const h = await History.findOne({ action: "CREATE" });
    assert.ok(h);
    assert.equal(h.targetModel, "Teacher");
    assert.equal(h.targetName, "Mr. Smith");
    assert.equal(h.userRole, "admin");
    assert.equal(h.after.name, "Mr. Smith");
  });

  it("POST accepts a client-supplied 8-digit teacherId", async () => {
    const token = await issueAdminToken();

    const res = await createTeacher(token, { ...teacherPayload, teacherId: "12345678" });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.teacherId, "12345678");
  });

  it("POST rejects an invalid teacherId", async () => {
    const token = await issueAdminToken();

    const res = await createTeacher(token, { ...teacherPayload, teacherId: "12345" });
    assert.equal(res.status, 400);
  });

  it("GET /api/v1/teachers is allowed for any authenticated user", async () => {
    const token = await issueAdminToken();
    await createTeacher(token, teacherPayload);

    const { data } = await signupUser();
    const res = await request(app)
      .get("/api/v1/teachers")
      .set("Authorization", `Bearer ${data.accessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].name, "Mr. Smith");
  });

  it("POST /api/v1/teachers requires admin", async () => {
    const { data } = await signupUser();

    const res = await createTeacher(data.accessToken, teacherPayload);
    assert.equal(res.status, 403);
    assert.equal(res.body.errorCode, "FORBIDDEN");
  });

  it("GET /api/v1/teachers/:id is allowed for any authenticated user", async () => {
    const token = await issueAdminToken();
    const created = await createTeacher(token, teacherPayload);
    assert.equal(created.status, 201);

    const { data } = await signupUser();
    const res = await request(app)
      .get(`/api/v1/teachers/${created.body.data._id}`)
      .set("Authorization", `Bearer ${data.accessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, "Mr. Smith");
  });

  it("PUT /api/v1/teachers/:id requires admin and records before/after", async () => {
    const token = await issueAdminToken();
    const created = await createTeacher(token, teacherPayload);
    assert.equal(created.status, 201);

    const { data } = await signupUser();
    const forbidden = await request(app)
      .put(`/api/v1/teachers/${created.body.data._id}`)
      .set("Authorization", `Bearer ${data.accessToken}`)
      .send({ name: "Hacked" });
    assert.equal(forbidden.status, 403);

    const putRes = await request(app)
      .put(`/api/v1/teachers/${created.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mr. Smith Updated" });

    assert.equal(putRes.status, 200);
    assert.equal(putRes.body.data.name, "Mr. Smith Updated");

    const h = await History.findOne({ action: "UPDATE" });
    assert.ok(h);
    assert.equal(h.targetModel, "Teacher");
    assert.equal(h.before.name, "Mr. Smith");
    assert.equal(h.after.name, "Mr. Smith Updated");
  });

  it("DELETE /api/v1/teachers/:id requires admin and records history", async () => {
    const token = await issueAdminToken();
    const created = await createTeacher(token, teacherPayload);
    assert.equal(created.status, 201);

    const { data } = await signupUser();
    const forbidden = await request(app)
      .delete(`/api/v1/teachers/${created.body.data._id}`)
      .set("Authorization", `Bearer ${data.accessToken}`);
    assert.equal(forbidden.status, 403);

    const delRes = await request(app)
      .delete(`/api/v1/teachers/${created.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.message, "Teacher deleted successfully");

    const h = await History.findOne({ action: "DELETE" });
    assert.ok(h);
    assert.equal(h.targetModel, "Teacher");
    assert.equal(h.before.name, "Mr. Smith");
  });
});
