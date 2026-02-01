const { Router } = require("express");
const authRoutes = require("./authRoutes");
const healthRoutes = require("./healthRoutes");
const patientRoutes = require("./patientRoutes");
const doctorRoutes = require("./doctorRoutes");
const appointmentRoutes = require("./appointmentRoutes");
const recordRoutes = require("./recordRoutes");
const accessRoutes = require("./accessRoutes");
const notificationRoutes = require("./notificationRoutes");

const router = Router();

// Health check
router.use("/health", healthRoutes);

// Authentication
router.use("/auth", authRoutes);

// Patient/Doctor profiles
router.use("/patients", patientRoutes);
router.use("/doctors", doctorRoutes);

// Appointments & records
router.use("/appointments", appointmentRoutes);
router.use("/records", recordRoutes);

// Access control
router.use("/access", accessRoutes);

// Notifications
router.use("/notifications", notificationRoutes);

module.exports = router;


