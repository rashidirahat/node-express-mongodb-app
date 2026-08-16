const express = require("express");
/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the current authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile with donation totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         donations:
 *                           type: object
 *                           properties:
 *                             zakat: { type: number, example: 0 }
 *                             sadaqah: { type: number, example: 0 }
 *                             total: { type: number, example: 0 }
 *                             year: { type: integer, example: 2026 }
 *                             yearZakat: { type: number, example: 0 }
 *                             yearSadaqah: { type: number, example: 0 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 10 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user's role (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [student, parent, teacher, admin, user, editor]
 *                 example: editor
 *     responses:
 *       200:
 *         description: User role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
const router = express.Router();
const { getMe, getUsers, updateUserRole } = require("../controllers/user.controller");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const validate = require("../middleware/validate");
const { ROLES } = require("../config/roles");

router.get("/me", protect, getMe);
router.get("/", protect, authorize(ROLES.ADMIN), getUsers);
router.patch(
  "/:id/role",
  protect,
  authorize(ROLES.ADMIN),
  validate({ role: { required: true, type: "string" } }),
  updateUserRole
);

module.exports = router;
