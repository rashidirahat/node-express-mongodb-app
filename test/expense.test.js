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

const addAmount = (token, payload) => {
  return request(app)
    .post("/api/v1/expenses/add")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
};

const spendAmount = (token, payload) => {
  return request(app)
    .post("/api/v1/expenses/spend")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
};

describe("Expense API", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("POST /api/v1/expenses/add by admin records ADD_FUND history", async () => {
    const token = await issueAdminToken();

    const res = await addAmount(token, { amount: 5000, description: "Donation" });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currentAmount, 5000);

    const h = await History.findOne({ action: "ADD_FUND" });
    assert.ok(h);
    assert.equal(h.action, "ADD_FUND");
    assert.equal(h.targetModel, "Expense");
    assert.equal(h.description, "Donation");
    assert.equal(h.userRole, "admin");
    assert.equal(h.targetName, "Expense Account");
  });

  it("POST /api/v1/expenses/spend after add deducts and records SPEND_FUND history", async () => {
    const token = await issueAdminToken();
    await addAmount(token, { amount: 5000, description: "Donation" });

    const res = await spendAmount(token, { amount: 1500, description: "Stationery" });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currentAmount, 3500);
    assert.equal(res.body.data.totalAdded, 5000);
    assert.equal(res.body.data.totalSpent, 1500);

    const h = await History.findOne({ action: "SPEND_FUND" });
    assert.ok(h);
    assert.equal(h.action, "SPEND_FUND");
    assert.equal(h.targetModel, "Expense");
    assert.equal(h.description, "Stationery");
  });

  it("repeated adds update the running total", async () => {
    const token = await issueAdminToken();
    const first = await addAmount(token, { amount: 1000, description: "Add 1" });
    assert.equal(first.body.data.currentAmount, 1000);
    assert.equal(first.body.data.totalAdded, 1000);

    const second = await addAmount(token, { amount: 1000, description: "Add 2" });
    assert.equal(second.body.data.currentAmount, 2000);
    assert.equal(second.body.data.totalAdded, 2000);

    const res = await request(app)
      .get("/api/v1/expenses")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currentAmount, 2000);
  });

  it("spend can make the balance negative", async () => {
    const token = await issueAdminToken();
    await addAmount(token, { amount: 100, description: "Small" });

    const res = await spendAmount(token, { amount: 200, description: "Overdraft" });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currentAmount, -100);
  });

  it("GET /api/v1/expenses is allowed for any authenticated user", async () => {
    const token = await issueAdminToken();
    await addAmount(token, { amount: 500, description: "Seed" });

    const { data } = await signupUser();
    const res = await request(app)
      .get("/api/v1/expenses")
      .set("Authorization", `Bearer ${data.accessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currentAmount, 500);
  });

  it("POST /api/v1/expenses/add and /spend require admin", async () => {
    const { data } = await signupUser();

    const addRes = await addAmount(data.accessToken, { amount: 100, description: "Hack" });
    assert.equal(addRes.status, 403);
    assert.equal(addRes.body.errorCode, "FORBIDDEN");

    const spendRes = await spendAmount(data.accessToken, { amount: 100, description: "Hack" });
    assert.equal(spendRes.status, 403);
    assert.equal(spendRes.body.errorCode, "FORBIDDEN");
  });

  it("POST add rejects non-positive amounts", async () => {
    const token = await issueAdminToken();

    const zeroRes = await addAmount(token, { amount: 0, description: "Zero" });
    assert.equal(zeroRes.status, 400);
    assert.equal(zeroRes.body.errorCode, "VALIDATION_ERROR");

    const negativeRes = await addAmount(token, { amount: -50, description: "Negative" });
    assert.equal(negativeRes.status, 400);
    assert.equal(negativeRes.body.errorCode, "VALIDATION_ERROR");
  });

  it("GET /api/v1/expenses returns 0 when no account exists yet", async () => {
    const token = await issueAdminToken();

    const res = await request(app)
      .get("/api/v1/expenses")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currentAmount, 0);
  });
});
