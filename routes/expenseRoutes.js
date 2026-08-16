const express = require("express");
/**
 * @swagger
 * /api/v1/expenses/add:
 *   post:
 *     tags: [Expenses]
 *     summary: Add funds to the expense account (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 500
 *               description:
 *                 type: string
 *                 example: Monthly donation received
 *     responses:
 *       200:
 *         description: Funds added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentAmount: { type: number, example: 1500 }
 *                     totalAdded: { type: number, example: 5000 }
 *                     totalSpent: { type: number, example: 3500 }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @swagger
 * /api/v1/expenses/spend:
 *   post:
 *     tags: [Expenses]
 *     summary: Spend funds from the expense account (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 200
 *               description:
 *                 type: string
 *                 example: Bought books
 *     responses:
 *       200:
 *         description: Funds spent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentAmount: { type: number, example: 1300 }
 *                     totalAdded: { type: number, example: 5000 }
 *                     totalSpent: { type: number, example: 3700 }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @swagger
 * /api/v1/expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: Get the expense account totals
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expense account totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentAmount: { type: number, example: 1300 }
 *                     totalAdded: { type: number, example: 5000 }
 *                     totalSpent: { type: number, example: 3700 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
