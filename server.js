require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");
const studentRoutes = require("./routes/studentRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const historyRoutes = require("./routes/historyRoutes");
const { authIpLimiter } = require("./middleware/rateLimiters");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// Health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// Routes
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/auth", authIpLimiter, authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/history", historyRoutes);

// 404 + error handling (must be registered last)
app.use(notFound);
app.use(errorHandler);

// Only connect to DB and listen when run directly (allows tests to import app)
if (require.main === module) {
  connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
