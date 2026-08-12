const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const {
  request,
  app,
  startDb,
  stopDb,
  clearDb,
  signup,
  signupUser,
  login,
  forgotPassword,
  resetPassword,
  uniqueEmail,
  getLatestResetToken,
  clearEmailCapture,
} = require("./helpers");

describe("Password Auth API", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
    clearEmailCapture();
  });

  describe("POST /api/v1/auth/signup", () => {
    it("creates a user and returns tokens without the password hash", async () => {
      const { res, payload } = await signupUser();

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, "Account created successfully");

      const { user, accessToken, refreshToken } = res.body.data;
      assert.equal(user.name, payload.name);
      assert.equal(user.email, payload.email);
      assert.equal(user.role, "user");
      assert.equal(user.isVerified, true);
      assert.equal(user.password, undefined);
      assert.ok(accessToken);
      assert.ok(refreshToken);

      const stored = await User.findOne({ email: payload.email }).select("+password");
      assert.ok(stored);
      assert.notEqual(stored.password, payload.password);
      assert.ok(stored.password.length > 0);
    });

    it("rejects a duplicate email", async () => {
      const email = uniqueEmail();
      await signup({ name: "First", email, password: "Password123!" }).expect(201);

      const res = await signup({ name: "Second", email, password: "Password123!" });
      assert.equal(res.status, 409);
      assert.equal(res.body.errorCode, "EMAIL_ALREADY_REGISTERED");
    });

    it("does not allow a client to self-assign the admin role", async () => {
      const { res } = await signupUser({ role: "admin" });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.user.role, "user");

      const stored = await User.findOne({ email: res.body.data.user.email });
      assert.equal(stored.role, "user");
    });

    it("rejects missing fields", async () => {
      const res = await signup({ name: "No Password", email: uniqueEmail() });
      assert.equal(res.status, 400);
      assert.equal(res.body.errorCode, "VALIDATION_ERROR");
    });

    it("rejects an invalid email", async () => {
      const res = await signup({ name: "Bad", email: "not-an-email", password: "Password123!" });
      assert.equal(res.status, 400);
    });

    it("rejects a short password", async () => {
      const res = await signup({ name: "Short", email: uniqueEmail(), password: "short" });
      assert.equal(res.status, 400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("logs in with correct credentials", async () => {
      const { payload } = await signupUser();
      const res = await login(payload.email, payload.password);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, "Login successful");
      assert.equal(res.body.data.user.email, payload.email);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
    });

    it("rejects a wrong password with a generic message", async () => {
      const { payload } = await signupUser();
      const res = await login(payload.email, "WrongPassword1!");

      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "INVALID_CREDENTIALS");
      assert.equal(res.body.message, "Invalid email or password");
    });

    it("rejects an unknown email with the same generic message", async () => {
      const res = await login(uniqueEmail(), "SomePassword123!");

      assert.equal(res.status, 401);
      assert.equal(res.body.errorCode, "INVALID_CREDENTIALS");
      assert.equal(res.body.message, "Invalid email or password");
    });

    it("blocks an inactive account", async () => {
      const { payload } = await signupUser();
      await User.updateOne({ email: payload.email }, { $set: { status: "inactive" } });

      const res = await login(payload.email, payload.password);
      assert.equal(res.status, 403);
      assert.equal(res.body.errorCode, "ACCOUNT_INACTIVE");
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("sends a reset link for a known email without revealing account existence", async () => {
      const { payload } = await signupUser();
      const res = await forgotPassword(payload.email);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(
        res.body.message,
        "If an account exists for that email, a reset link has been sent"
      );

      const stored = await User.findOne({ email: payload.email });
      assert.ok(stored.resetPasswordToken);
      assert.equal(stored.resetPasswordToken.length, 64);
      assert.ok(stored.resetPasswordExpires > new Date());

      const token = getLatestResetToken();
      assert.ok(token);
      assert.equal(token.length, 64);
    });

    it("returns the same generic message for an unknown email", async () => {
      const res = await forgotPassword(uniqueEmail());

      assert.equal(res.status, 200);
      assert.equal(
        res.body.message,
        "If an account exists for that email, a reset link has been sent"
      );
      assert.equal(getLatestResetToken(), null);
    });
  });

  describe("POST /api/v1/auth/reset-password/:token", () => {
    it("resets the password, invalidates old refresh tokens, and allows login with the new password", async () => {
      const { payload, data } = await signupUser();
      await forgotPassword(payload.email).expect(200);
      const token = getLatestResetToken();
      assert.ok(token);

      const newPassword = "NewPassword456!";
      const res = await resetPassword(token, newPassword);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.message, "Password has been reset successfully");

      const stored = await User.findOne({ email: payload.email });
      assert.equal(stored.resetPasswordToken, null);
      assert.equal(stored.resetPasswordExpires, null);

      const oldLogin = await login(payload.email, payload.password);
      assert.equal(oldLogin.status, 401);

      const newLogin = await login(payload.email, newPassword);
      assert.equal(newLogin.status, 200);

      const refreshRes = await request(app)
        .post("/api/v1/auth/refresh-token")
        .send({ refreshToken: data.refreshToken });
      assert.equal(refreshRes.status, 401);
      assert.equal(refreshRes.body.errorCode, "REFRESH_TOKEN_REVOKED");
    });

    it("rejects an invalid token", async () => {
      const res = await resetPassword("a".repeat(64), "NewPassword456!");

      assert.equal(res.status, 400);
      assert.equal(res.body.errorCode, "INVALID_RESET_TOKEN");
    });

    it("rejects an expired token", async () => {
      const { payload } = await signupUser();
      await forgotPassword(payload.email).expect(200);
      const token = getLatestResetToken();

      await User.updateOne(
        { email: payload.email },
        { $set: { resetPasswordExpires: new Date(Date.now() - 1000) } }
      );

      const res = await resetPassword(token, "NewPassword456!");

      assert.equal(res.status, 400);
      assert.equal(res.body.errorCode, "RESET_TOKEN_EXPIRED");
    });
  });
});
