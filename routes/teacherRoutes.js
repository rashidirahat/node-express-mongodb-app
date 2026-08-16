const express = require("express");
const router = express.Router();
const {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  assignStudent,
  getTeacherStudents,
  removeAssignedStudent,
  getTeacherStudentDetails,
  addStudentExam,
  updateStudentExam,
  addStudentStudyProgress,
  updateStudentStudyProgress,
  getTeacherDashboard
} = require("../controllers/teacherController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/rbac");
const { ROLES } = require("../config/roles");
const { verifyTeacherStudentAssignment } = require("../middleware/teacherAssignment");

/**
 * @swagger
 * /api/v1/teachers:
 *   post:
 *     tags: [Teachers]
 *     summary: Create a teacher (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Teacher'
 *     responses:
 *       201:
 *         description: Teacher created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Teacher'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
/**
 * @swagger
 * /api/v1/teachers:
 *   get:
 *     tags: [Teachers]
 *     summary: Get all teachers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of teachers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 2 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Teacher'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get a teacher by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Teacher'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}:
 *   put:
 *     tags: [Teachers]
 *     summary: Update a teacher (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Teacher'
 *     responses:
 *       200:
 *         description: Teacher updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Teacher'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}:
 *   delete:
 *     tags: [Teachers]
 *     summary: Delete a teacher (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Teacher deleted successfully" }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/students:
 *   post:
 *     tags: [Teachers]
 *     summary: Assign a student to a teacher (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: string
 *                 description: Student ObjectId
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       201:
 *         description: Student assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Student assigned successfully" }
 *                 data:
 *                   $ref: '#/components/schemas/Teacher'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/students:
 *   get:
 *     tags: [Teachers]
 *     summary: Get all students assigned to a teacher
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: List of assigned students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 3 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/students/{studentId}:
 *   delete:
 *     tags: [Teachers]
 *     summary: Remove an assigned student from a teacher (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Student removed successfully" }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/students/{studentId}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get assigned student details with performance summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student details with performance summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/students/{studentId}/exams:
 *   post:
 *     tags: [Teachers]
 *     summary: Add an exam for an assigned student (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Exam'
 *     responses:
 *       201:
 *         description: Exam added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Exam'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/students/{studentId}/exams/{examId}:
 *   put:
 *     tags: [Teachers]
 *     summary: Update an exam for an assigned student (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Exam'
 *     responses:
 *       200:
 *         description: Exam updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Exam'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/students/{studentId}/study-progress:
 *   post:
 *     tags: [Teachers]
 *     summary: Add study progress for an assigned student (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudyProgress'
 *     responses:
 *       201:
 *         description: Study progress added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/StudyProgress'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/students/{studentId}/study-progress/{progressId}:
 *   put:
 *     tags: [Teachers]
 *     summary: Update study progress for an assigned student (admin)
 *     description: Requires admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *       - in: path
 *         name: progressId
 *         required: true
 *         schema:
 *           type: string
 *         description: Study progress ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudyProgress'
 *     responses:
 *       200:
 *         description: Study progress updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/StudyProgress'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @swagger
 * /api/v1/teachers/{id}/dashboard:
 *   get:
 *     tags: [Teachers]
 *     summary: Get teacher dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     teacher:
 *                       type: object
 *                       properties:
 *                         id: { type: string, description: Teacher ObjectId }
 *                         name: { type: string }
 *                         teacherId: { type: string }
 *                         specialization: { type: string }
 *                         qualification: { type: string }
 *                         status: { type: string }
 *                     totalStudents: { type: integer, example: 3 }
 *                     students:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, description: Student ObjectId }
 *                           studentId: { type: string }
 *                           name: { type: string }
 *                           age: { type: integer }
 *                           gender: { type: string }
 *                           className: { type: string }
 *                           guardianName: { type: string }
 *                           phone: { type: string }
 *                           examsCount: { type: integer }
 *                           latestExam:
 *                             $ref: '#/components/schemas/Exam'
 *                           overallExamAverage: { type: number }
 *                           studyProgressSummary: { type: object }
 *                           needsAttention: { type: array, items: { type: string } }
 *                     needsAttention:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           studentId: { type: string }
 *                           name: { type: string }
 *                           reasons: { type: array, items: { type: string } }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router
  .route("/")
  .post(protect, authorize(ROLES.ADMIN), createTeacher)
  .get(protect, getTeachers);
router
  .route("/:id")
  .get(protect, getTeacherById)
  .put(protect, authorize(ROLES.ADMIN), updateTeacher)
  .delete(protect, authorize(ROLES.ADMIN), deleteTeacher);
router
  .route("/:id/students")
  .post(protect, authorize(ROLES.ADMIN), assignStudent)
  .get(protect, getTeacherStudents);
router
  .route("/:id/students/:studentId")
  .delete(protect, authorize(ROLES.ADMIN), removeAssignedStudent)
  .get(protect, verifyTeacherStudentAssignment, getTeacherStudentDetails);
router
  .route("/:id/students/:studentId/exams")
  .post(protect, authorize(ROLES.ADMIN), verifyTeacherStudentAssignment, addStudentExam);
router
  .route("/:id/students/:studentId/exams/:examId")
  .put(protect, authorize(ROLES.ADMIN), verifyTeacherStudentAssignment, updateStudentExam);
router
  .route("/:id/students/:studentId/study-progress")
  .post(protect, authorize(ROLES.ADMIN), verifyTeacherStudentAssignment, addStudentStudyProgress);
router
  .route("/:id/students/:studentId/study-progress/:progressId")
  .put(protect, authorize(ROLES.ADMIN), verifyTeacherStudentAssignment, updateStudentStudyProgress);
router
  .route("/:id/dashboard")
  .get(protect, getTeacherDashboard);

module.exports = router;
