const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Madarsa Backend API",
      version: "1.0.0",
      description:
        "REST API for the madarsa (school) management system: students, teachers, exams, study progress, users, expenses and donations. All protected routes require a Bearer access token obtained from the auth endpoints.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste your JWT access token here. Get one from POST /api/v1/auth/login or /signup.",
        },
      },
      responses: {
        BadRequest: {
          description: "Invalid input or validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { success: false, message: "Validation error", errorCode: "VALIDATION_ERROR" },
            },
          },
        },
        Unauthorized: {
          description: "Missing or invalid access token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { success: false, message: "Not authorized, no token provided", errorCode: "UNAUTHORIZED" },
            },
          },
        },
        Forbidden: {
          description: "Authenticated but insufficient permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { success: false, message: "Forbidden: insufficient permissions", errorCode: "FORBIDDEN" },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { success: false, message: "Resource not found" },
            },
          },
        },
        ServerError: {
          description: "Unexpected server error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { success: false, message: "Server Error" },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Something went wrong" },
            errorCode: { type: "string", example: "VALIDATION_ERROR", nullable: true },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", nullable: true },
            data: { nullable: true },
            count: { type: "integer", nullable: true },
            total: { type: "integer", nullable: true },
            page: { type: "integer", nullable: true },
            pages: { type: "integer", nullable: true },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "65f4a1b2c3d4e5f6a7b8c9d0" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            role: { type: "string", enum: ["student", "parent", "teacher", "admin", "user", "editor"] },
            status: { type: "string", enum: ["active", "inactive", "suspended"] },
            isVerified: { type: "boolean" },
            createdAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Login successful" },
            data: {
              type: "object",
              properties: {
                user: { $ref: "#/components/schemas/User" },
                accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
                refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
              },
            },
          },
        },
        Exam: {
          type: "object",
          properties: {
            _id: { type: "string" },
            examName: { type: "string", example: "Midterm" },
            subject: { type: "string", example: "Mathematics" },
            examDate: { type: "string", format: "date", example: "2025-03-15" },
            totalMarks: { type: "number", example: 100 },
            obtainedMarks: { type: "number", example: 87 },
            grade: { type: "string", example: "A", nullable: true },
            remarks: { type: "string", example: "Excellent", nullable: true },
            percentage: { type: "number", example: 87 },
          },
        },
        StudyProgress: {
          type: "object",
          properties: {
            _id: { type: "string" },
            subject: { type: "string", example: "Mathematics" },
            topic: { type: "string", example: "Algebra" },
            status: { type: "string", enum: ["not_started", "in_progress", "completed"] },
            progressPercentage: { type: "number", example: 50 },
            notes: { type: "string", nullable: true },
            lastUpdated: { type: "string", format: "date-time" },
          },
        },
        Student: {
          type: "object",
          properties: {
            _id: { type: "string" },
            studentId: { type: "string", example: "STU-1001" },
            name: { type: "string", example: "Ali Ahmed" },
            age: { type: "number", example: 12 },
            address: { type: "string", example: "House 12, Main Street" },
            gender: { type: "string", enum: ["male", "female"] },
            guardianName: { type: "string", example: "Ahmed Khan" },
            className: { type: "string", example: "7th" },
            studentType: { type: "string", enum: ["day", "hostel"] },
            phone: { type: "string", example: "+923001234567", nullable: true },
            exams: { type: "array", items: { $ref: "#/components/schemas/Exam" } },
            studyProgress: { type: "array", items: { $ref: "#/components/schemas/StudyProgress" } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Teacher: {
          type: "object",
          properties: {
            _id: { type: "string" },
            teacherId: { type: "string", example: "12345678" },
            name: { type: "string", example: "Fatima Noor" },
            address: { type: "string", example: "House 5, Green Lane" },
            qualification: { type: "string", example: "MSc Mathematics" },
            specialization: { type: "string", example: "Mathematics" },
            joiningDate: { type: "string", format: "date", example: "2023-09-01" },
            teachingExperience: { type: "number", example: 5 },
            gender: { type: "string", enum: ["male", "female"] },
            status: { type: "string", enum: ["active", "inactive", "suspended"] },
            subjects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  subject: { type: "string", example: "Mathematics" },
                  className: { type: "string", example: "7th" },
                },
              },
            },
            students: { type: "array", items: { type: "string" }, description: "Assigned student ObjectIds" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Expense: {
          type: "object",
          properties: {
            _id: { type: "string" },
            type: { type: "string", example: "main" },
            currentAmount: { type: "number", example: 1500 },
            totalAdded: { type: "number", example: 5000 },
            totalSpent: { type: "number", example: 3500 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Donation: {
          type: "object",
          properties: {
            _id: { type: "string" },
            user: { type: "string", description: "User ObjectId" },
            category: { type: "string", enum: ["zakat", "sadaqah"] },
            amount: { type: "number", example: 5000 },
            year: { type: "number", example: 2025 },
            description: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        History: {
          type: "object",
          properties: {
            _id: { type: "string" },
            user: { type: "string", description: "User ObjectId or populated user" },
            userName: { type: "string", nullable: true },
            userRole: { type: "string", nullable: true },
            action: { type: "string", enum: ["CREATE", "UPDATE", "DELETE", "ROLE_CHANGE", "ADD_FUND", "SPEND_FUND"] },
            targetModel: { type: "string", enum: ["Student", "User", "Teacher", "Expense", "Donation"] },
            targetId: { type: "string", nullable: true },
            targetName: { type: "string", nullable: true },
            description: { type: "string" },
            before: { type: "object" },
            after: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Registration, login, password reset and token management" },
      { name: "Users", description: "User profile and administration" },
      { name: "Students", description: "Student management, exams and study progress" },
      { name: "Teachers", description: "Teacher management and student assignment" },
      { name: "Expenses", description: "Fund management (add/spend/total)" },
      { name: "Donations", description: "Donation recording and totals" },
      { name: "History", description: "Audit history of all actions" },
    ],
  },
  apis: [path.join(__dirname, "../routes/*.js")],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
