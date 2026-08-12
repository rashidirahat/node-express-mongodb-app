const express = require("express");
const router = express.Router();
const { getHistory } = require("../controllers/historyController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { ROLES } = require("../config/roles");

router.get("/", protect, getHistory);

module.exports = router;
