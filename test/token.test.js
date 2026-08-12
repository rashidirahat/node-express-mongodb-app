const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const {
  request,
  app,
  startDb,
  stopDb,
  clearDb,
  signupUser,
  getMe,
} = require("./helpers");

describe("Token APIs", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe("Access token", () => {
    it("contains userId and role in the payload", async () => {
      const { data } = await signupUser();
      const payload = jwt.decode(data.accessToken);

      assert.equal(payload.userId, data.user.id);
      assert.equal(payload.role, "user");
    });

    it("allows access to /users/me with a valid token", async () => {
      const { data } = await signupUser();
      const res = await getMe(data.accessToken);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.email, data.user.email);
    });

    it("rejects an invalid access token", async () => {
      const res = await getMe("not-a-valid-token");
      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "INVALID_TOKEN");
    });

    it("rejects an expired access token", async () => {
      const { data } = await signupUser();
      const expired = jwt.sign(
        { userId: data.user.id, role: "user" },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "-1s" }
      );

      const res = await getMe(expired);
      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "INVALID_TOKEN");
    });
  });

  describe("Refresh token", () => {
    it("issues a new access token and rotates the refresh token", async () => {
      const { data } = await signupUser();

      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: data.refreshToken });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      assert.notEqual(res.body.data.refreshToken, data.refreshToken);
    });

    it("rejects an expired refresh token", async () => {
      const { data } = await signupUser();
      const expired = jwt.sign(
        { userId: data.user.id, type: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "-1s" }
      );

      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: expired });

      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "INVALID_REFRESH_TOKEN");
    });

    it("rejects a revoked refresh token", async () => {
      const { data } = await signupUser();

      await request(app)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: data.refreshToken })
        .expect(200);

      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: data.refreshToken });

      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "REFRESH_TOKEN_REVOKED");
    });

    it("cannot be reused after rotation", async () => {
      const { data } = await signupUser();

      await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: data.refreshToken })
        .expect(200);

      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: data.refreshToken });

      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "REFRESH_TOKEN_REVOKED");
    });
  });
});
