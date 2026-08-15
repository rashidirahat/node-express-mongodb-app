const express = require("express");
const router = express.Router();
const { addDonation, getTotals } = require("../controllers/donationController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");

const donationValidation = {
  amount: { required: true, type: "number" },
  category: { required: true, type: "string" },
};

router.post("/", protect, validate(donationValidation), addDonation);
router.get("/totals", protect, getTotals);

module.exports = router;
