const express = require("express");
/**
 * @swagger
 * /api/v1/history:
 *   get:
 *     tags: [History]
 *     summary: Get audit history with pagination and filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of records per page
 *       - name: action
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by action name
 *       - name: targetModel
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Student, User, Teacher, Expense, Donation]
 *         description: Filter by target model
 *       - name: userId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Paginated audit history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 20 }
 *                 total: { type: integer, example: 150 }
 *                 page: { type: integer, example: 1 }
 *                 pages: { type: integer, example: 8 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/History'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
const router = express.Router();
const { getHistory } = require("../controllers/historyController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { ROLES } = require("../config/roles");

router.get("/", protect, getHistory);

module.exports = router;
