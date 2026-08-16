const express = require("express");
/**
 * @swagger
 * /api/v1/donations:
 *   post:
 *     tags: [Donations]
 *     summary: Add a donation
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
 *               - category
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 250
 *               category:
 *                 type: string
 *                 enum: [zakat, sadaqah]
 *                 example: zakat
 *               year:
 *                 type: integer
 *                 description: 4-digit year, defaults to the current year
 *                 example: 2026
 *               description:
 *                 type: string
 *                 example: For the education fund
 *     responses:
 *       201:
 *         description: Donation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Donation'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
/**
 * @swagger
 * /api/v1/donations/totals:
 *   get:
 *     tags: [Donations]
 *     summary: Get donation totals for a year
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: year
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Year to get totals for, defaults to the current year
 *     responses:
 *       200:
 *         description: Donation totals and records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     year: { type: integer, example: 2026 }
 *                     zakat: { type: number, example: 500 }
 *                     sadaqah: { type: number, example: 300 }
 *                     total: { type: number, example: 800 }
 *                     records:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Donation'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
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
