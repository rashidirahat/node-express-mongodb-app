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

const studentPayload = {
  name: "John Doe",
  age: 15,
  address: "123 Main St",
  gender: "male",
  guardianName: "Jane Doe",
  className: "Class 10",
  studentType: "day",
};

describe("Admin Activity History", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("POST /api/v1/students creates a history entry", async () => {
    const token = await issueAdminToken();

    const res = await createStudent(token, studentPayload);
    assert.equal(res.status, 201);

    const h = await History.findOne({ action: "CREATE" });
    assert.ok(h);
    assert.equal(h.targetModel, "Student");
    assert.equal(h.targetName, "John Doe");
    assert.equal(h.userName, "Admin");
    assert.equal(h.userRole, "admin");

    const admin = await User.findOne({ role: "admin" });
    assert.equal(h.user.toString(), admin._id.toString());
    assert.equal(h.after.name, "John Doe");
    assert.ok(h.createdAt instanceof Date);
  });

  it("PUT /api/v1/students/:id records before/after", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const putRes = await request(app)
      .put(`/api/v1/students/${created.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "John Updated" });

    assert.equal(putRes.status, 200);
    assert.equal(putRes.body.data.name, "John Updated");

    const h = await History.findOne({ action: "UPDATE" });
    assert.ok(h);
    assert.equal(h.before.name, "John Doe");
    assert.equal(h.after.name, "John Updated");
  });

  it("DELETE /api/v1/students/:id records a history entry", async () => {
    const token = await issueAdminToken();
    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const delRes = await request(app)
      .delete(`/api/v1/students/${created.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.equal(delRes.status, 200);

    const h = await History.findOne({ action: "DELETE" });
    assert.ok(h);
    assert.equal(h.before.name, "John Doe");
  });

  it("PATCH /api/v1/users/:id/role records ROLE_CHANGE", async () => {
    const token = await issueAdminToken();
    const target = await signupUser();

    const patchRes = await request(app)
      .patch(`/api/v1/users/${target.data.user.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "admin" });

    assert.equal(patchRes.status, 200);

    const h = await History.findOne({ action: "ROLE_CHANGE" });
    assert.ok(h);
    assert.equal(h.before.role, "user");
    assert.equal(h.after.role, "admin");
    assert.equal(h.targetName, target.data.user.name);
  });

  it("GET /api/v1/history requires admin", async () => {
    const { data } = await signupUser();

    const res = await request(app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${data.accessToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.errorCode, "FORBIDDEN");
  });

  it("GET /api/v1/history returns history newest first with pagination", async () => {
    const token = await issueAdminToken();

    for (let i = 0; i < 3; i += 1) {
      const res = await createStudent(token, studentPayload);
      assert.equal(res.status, 201);
    }

    const res = await request(app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.total, 3);
    assert.equal(res.body.count, 3);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.pages, 1);
    assert.equal(res.body.data.length, 3);

    assert.equal(res.body.data[0].user.name, "Admin");
    assert.ok(
      res.body.data.every((entry) => entry.action === "CREATE")
    );

    assert.ok(
      new Date(res.body.data[0].createdAt) >= new Date(res.body.data[1].createdAt)
    );
    assert.ok(
      new Date(res.body.data[1].createdAt) >= new Date(res.body.data[2].createdAt)
    );
  });

  it("GET /api/v1/history filters by action and targetModel", async () => {
    const token = await issueAdminToken();

    const created = await createStudent(token, studentPayload);
    assert.equal(created.status, 201);

    const target = await signupUser();
    const patchRes = await request(app)
      .patch(`/api/v1/users/${target.data.user.id}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "admin" });
    assert.equal(patchRes.status, 200);

    const byAction = await request(app)
      .get("/api/v1/history?action=ROLE_CHANGE")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(byAction.status, 200);
    assert.equal(byAction.body.total, 1);
    assert.equal(byAction.body.data[0].action, "ROLE_CHANGE");

    const byModel = await request(app)
      .get("/api/v1/history?targetModel=Student")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(byModel.status, 200);
    assert.equal(byModel.body.total, 1);
    assert.equal(byModel.body.data[0].targetModel, "Student");
  });
});
