const express = require("express");
const router = express.Router();
const { addAmount, spendAmount, getTotal } = require("../controllers/expenseController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { ROLES } = require("../config/roles");
const validate = require("../middleware/validate");

const fundValidation = {
  amount: { required: true, type: "number" },
  description: { required: true, type: "string", minLength: 1 },
};

router.post("/add", protect, authorize(ROLES.ADMIN), validate(fundValidation), addAmount);
router.post("/spend", protect, authorize(ROLES.ADMIN), validate(fundValidation), spendAmount);
router.get("/", protect, getTotal);

module.exports = router;
