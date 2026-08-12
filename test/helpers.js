const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const sendEmailUtil = require("../utils/sendEmail");
const app = require("../server");

let mongod;
let latestResetToken = null;
let emailCounter = 0;

const uniqueEmail = () => {
  emailCounter += 1;
  return `user${emailCounter}@example.com`;
};

// Replace the email sender with an in-memory capturer so tests
// can read the generated reset token without a real SMTP server.
sendEmailUtil.sendEmail = async ({ to, subject, text }) => {
  const match = String(text || "").match(/[a-f0-9]{64}/);
  latestResetToken = match ? match[0] : null;
  return { provider: "test", messageId: "test" };
};

const getLatestResetToken = () => latestResetToken;

const clearEmailCapture = () => {
  latestResetToken = null;
};

const startDb = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("auth-test"));
};

const stopDb = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

const clearDb = async () => {
  const collections = await mongoose.connection.db.collections();
  for (const col of collections) {
    await col.deleteMany({});
  }
};

const signup = (payload) => {
  return request(app).post("/api/v1/auth/signup").send(payload);
};

const signupUser = async (overrides = {}) => {
  const payload = {
    name: "Test User",
    email: uniqueEmail(),
    password: "Password123!",
    ...overrides,
  };
  const res = await signup(payload);
  return { res, payload, data: res.body.data };
};

const login = (email, password) => {
  return request(app).post("/api/v1/auth/login").send({ email, password });
};

const forgotPassword = (email) => {
  return request(app).post("/api/v1/auth/forgot-password").send({ email });
};

const resetPassword = (token, password) => {
  return request(app).post(`/api/v1/auth/reset-password/${token}`).send({ password });
};

const getUsers = (token) => {
  return request(app)
    .get("/api/v1/users")
    .set("Authorization", `Bearer ${token}`);
};

const getMe = (token) => {
  return request(app)
    .get("/api/v1/users/me")
    .set("Authorization", `Bearer ${token}`);
};

module.exports = {
  app,
  request,
  startDb,
  stopDb,
  clearDb,
  getMe,
  getLatestResetToken,
  clearEmailCapture,
  uniqueEmail,
  signup,
  signupUser,
  login,
  forgotPassword,
  resetPassword,
  getUsers,
};
