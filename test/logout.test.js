const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  request,
  app,
  startDb,
  stopDb,
  clearDb,
  signupUser,
} = require("./helpers");

describe("Logout API", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("logs out successfully", async () => {
    const { data } = await signupUser();

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: data.refreshToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Logged out successfully");
  });

  it("cannot reuse a revoked refresh token after logout", async () => {
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
});
