const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const Donation = require("../models/Donation");
const { request, app, startDb, stopDb, clearDb, signupUser, getMe } = require("./helpers");

const addDonation = (token, payload) => {
  return request(app)
    .post("/api/v1/donations")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
};

const getTotals = (token, query = {}) => {
  return request(app)
    .get("/api/v1/donations/totals")
    .query(query)
    .set("Authorization", `Bearer ${token}`);
};

describe("Donation API", () => {
  before(async () => {
    await startDb();
  });

  after(async () => {
    await stopDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("POST /api/v1/donations by a regular user creates a zakat donation owned by the user", async () => {
    const { data } = await signupUser();

    const res = await addDonation(data.accessToken, {
      amount: 5000,
      category: "zakat",
      description: "Ramadan",
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.category, "zakat");
    assert.equal(res.body.data.amount, 5000);
    assert.equal(res.body.data.user, data.user.id);

    const donation = await Donation.findOne({ category: "zakat", amount: 5000 });
    assert.ok(donation);
    assert.equal(donation.user.toString(), data.user.id);
  });

  it("POST rejects an invalid category with 400 VALIDATION_ERROR", async () => {
    const { data } = await signupUser();

    const res = await addDonation(data.accessToken, { amount: 100, category: "food" });
    assert.equal(res.status, 400);
    assert.equal(res.body.errorCode, "VALIDATION_ERROR");
  });

  it("POST rejects zero/negative amounts with 400 VALIDATION_ERROR", async () => {
    const { data } = await signupUser();

    const zeroRes = await addDonation(data.accessToken, { amount: 0, category: "zakat" });
    assert.equal(zeroRes.status, 400);
    assert.equal(zeroRes.body.errorCode, "VALIDATION_ERROR");

    const negativeRes = await addDonation(data.accessToken, { amount: -50, category: "sadaqah" });
    assert.equal(negativeRes.status, 400);
    assert.equal(negativeRes.body.errorCode, "VALIDATION_ERROR");
  });

  it("POST requires authentication (no token gets 401 UNAUTHORIZED)", async () => {
    const res = await request(app).post("/api/v1/donations").send({ amount: 100, category: "zakat" });
    assert.equal(res.status, 401);
    assert.equal(res.body.errorCode, "UNAUTHORIZED");
  });

  it("GET totals returns only the logged-in user's donations", async () => {
    const userA = await signupUser();
    const userB = await signupUser();
    const year = new Date().getFullYear();

    await Donation.create([
      { user: userA.data.user.id, category: "zakat", amount: 5000, year },
      { user: userA.data.user.id, category: "sadaqah", amount: 1000, year },
      { user: userB.data.user.id, category: "zakat", amount: 9999, year },
    ]);

    const resA = await getTotals(userA.data.accessToken);
    assert.equal(resA.status, 200);
    assert.equal(resA.body.success, true);
    assert.equal(resA.body.data.year, year);
    assert.equal(resA.body.data.zakat, 5000);
    assert.equal(resA.body.data.sadaqah, 1000);
    assert.equal(resA.body.data.total, 6000);
    assert.equal(resA.body.data.records.length, 2);
    assert.deepEqual(
      resA.body.data.records.map((r) => r.amount),
      [1000, 5000]
    );

    const resB = await getTotals(userB.data.accessToken);
    assert.equal(resB.status, 200);
    assert.equal(resB.body.success, true);
    assert.equal(resB.body.data.year, year);
    assert.equal(resB.body.data.zakat, 9999);
    assert.equal(resB.body.data.sadaqah, 0);
    assert.equal(resB.body.data.total, 9999);
    assert.equal(resB.body.data.records.length, 1);
    assert.equal(resB.body.data.records[0].amount, 9999);
  });

  it("GET totals honors ?year= filter", async () => {
    const { data } = await signupUser();
    const year = new Date().getFullYear();

    await Donation.create([
      { user: data.user.id, category: "zakat", amount: 5000, year },
      { user: data.user.id, category: "sadaqah", amount: 1000, year },
      { user: data.user.id, category: "zakat", amount: 9000, year: 2000 },
      { user: data.user.id, category: "sadaqah", amount: 500, year: 2000 },
    ]);

    const res = await getTotals(data.accessToken, { year: 2000 });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.year, 2000);
    assert.equal(res.body.data.zakat, 9000);
    assert.equal(res.body.data.sadaqah, 500);
    assert.equal(res.body.data.total, 9500);
    assert.equal(res.body.data.records.length, 2);
    assert.deepEqual(
      res.body.data.records.map((r) => r.amount),
      [500, 9000]
    );
  });

  it("GET totals returns zeros for a year with no donations", async () => {
    const { data } = await signupUser();

    const res = await getTotals(data.accessToken, { year: 2100 });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.year, 2100);
    assert.equal(res.body.data.zakat, 0);
    assert.equal(res.body.data.sadaqah, 0);
    assert.equal(res.body.data.total, 0);
    assert.equal(res.body.data.records.length, 0);
  });

  it("GET /api/v1/users/me includes lifetime and current-year donation totals", async () => {
    const { data } = await signupUser();
    const year = new Date().getFullYear();

    await Donation.create([
      { user: data.user.id, category: "zakat", amount: 5000, year },
      { user: data.user.id, category: "sadaqah", amount: 1000, year },
      { user: data.user.id, category: "zakat", amount: 2000, year: 2000 },
    ]);

    const res = await getMe(data.accessToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data.donations, {
      zakat: 7000,
      sadaqah: 1000,
      total: 8000,
      year,
      yearZakat: 5000,
      yearSadaqah: 1000,
    });
  });
});
