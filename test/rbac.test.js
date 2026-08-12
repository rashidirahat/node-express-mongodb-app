const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const {
  request,
  app,
  startDb,
  stopDb,
  clearDb,
  signupUser,
  uniqueEmail,
} = require("./helpers");

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

describe("Role-Based Access Control", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe("GET /api/v1/users (admin only)", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/api/v1/users");

      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "UNAUTHORIZED");
    });

    it("returns 403 for a non-admin role", async () => {
      const { data } = await signupUser();

      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${data.accessToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.errorCode, "FORBIDDEN");
    });

    it("returns 200 with the user list for an admin", async () => {
      const token = await issueAdminToken();

      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.count, 1);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].role, "admin");
    });
  });

  describe("GET /api/v1/users/me (any authenticated user)", () => {
    it("returns the profile for any authenticated role", async () => {
      const { data } = await signupUser();

      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${data.accessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.role, "user");
      assert.equal(res.body.data.email, data.user.email);
    });
  });

  describe("PATCH /api/v1/users/:id/role (admin only)", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).patch("/api/v1/users/anyid/role").send({ role: "admin" });

      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "UNAUTHORIZED");
    });

    it("returns 403 for a non-admin role", async () => {
      const { data } = await signupUser();
      const target = await signupUser();

      const res = await request(app)
        .patch(`/api/v1/users/${target.data.user.id}/role`)
        .set("Authorization", `Bearer ${data.accessToken}`)
        .send({ role: "admin" });

      assert.equal(res.status, 403);
      assert.equal(res.body.errorCode, "FORBIDDEN");
    });

    it("returns 400 for an invalid role value", async () => {
      const token = await issueAdminToken();
      const target = await signupUser();

      const res = await request(app)
        .patch(`/api/v1/users/${target.data.user.id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .send({ role: "superuser" });

      assert.equal(res.status, 400);
      assert.equal(res.body.errorCode, "VALIDATION_ERROR");
    });

    it("returns 404 when the target user does not exist", async () => {
      const token = await issueAdminToken();

      const res = await request(app)
        .patch(`/api/v1/users/${new mongoose.Types.ObjectId()}/role`)
        .set("Authorization", `Bearer ${token}`)
        .send({ role: "editor" });

      assert.equal(res.status, 404);
      assert.equal(res.body.errorCode, "USER_NOT_FOUND");
    });

    it("promotes a user to admin", async () => {
      const token = await issueAdminToken();
      const target = await signupUser();

      const res = await request(app)
        .patch(`/api/v1/users/${target.data.user.id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .send({ role: "admin" });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.role, "admin");

      const updated = await User.findById(target.data.user.id);
      assert.equal(updated.role, "admin");
    });

    it("prevents an admin from changing their own role", async () => {
      const user = await User.create({
        name: "Admin",
        email: uniqueEmail(),
        role: "admin",
        status: "active",
      });
      const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
      );

      const res = await request(app)
        .patch(`/api/v1/users/${user._id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .send({ role: "editor" });

      assert.equal(res.status, 400);
      assert.equal(res.body.errorCode, "ROLE_CHANGE_DENIED");
    });

    it("prevents removing the last admin", async () => {
      const user = await User.create({
        name: "Admin",
        email: uniqueEmail(),
        role: "admin",
        status: "active",
      });
      const target = await signupUser();
      const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
      );

      const res = await request(app)
        .patch(`/api/v1/users/${target.data.user.id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .send({ role: "admin" });

      assert.equal(res.status, 200);

      const demoteRes = await request(app)
        .patch(`/api/v1/users/${user._id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .send({ role: "editor" });

      assert.equal(demoteRes.status, 400);
      assert.equal(demoteRes.body.errorCode, "ROLE_CHANGE_DENIED");

      const otherAdmin = await User.create({
        name: "Admin 2",
        email: uniqueEmail(),
        role: "admin",
        status: "active",
      });

      const demoteOtherRes = await request(app)
        .patch(`/api/v1/users/${otherAdmin._id}/role`)
        .set("Authorization", `Bearer ${token}`)
        .send({ role: "editor" });

      assert.equal(demoteOtherRes.status, 200);
      assert.equal(demoteOtherRes.body.data.role, "editor");
    });
  });
});
