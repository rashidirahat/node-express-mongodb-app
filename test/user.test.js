const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  request,
  app,
  startDb,
  stopDb,
  clearDb,
  signupUser,
  getMe,
} = require("./helpers");

describe("GET /api/v1/users/me", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("returns the current user with a valid token", async () => {
    const { data } = await signupUser();
    const res = await getMe(data.accessToken);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, data.user.email);
    assert.equal(res.body.data.role, "user");
    assert.ok(res.body.data.id);
  });

  it("rejects a request without a token", async () => {
    const res = await request(app).get("/api/v1/users/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.errorCode, "UNAUTHORIZED");
  });

  it("rejects a request with an invalid token", async () => {
    const res = await getMe("garbage-token");
    assert.equal(res.status, 401);
    assert.equal(res.body.errorCode, "INVALID_TOKEN");
  });
});
