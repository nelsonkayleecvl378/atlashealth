const { Router } = require("express");
const appointmentController = require("../controllers/appointmentController");
const validateRequest = require("../middleware/validateRequest");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { appointmentCreateSchema, appointmentUpdateSchema } = require("./validators");

const router = Router();

router.get("/", authenticate, appointmentController.listAppointments);
router.post(
  "/",
  authenticate,
  requireRole("patient"),
  validateRequest(appointmentCreateSchema),
  appointmentController.createAppointment
);
router.patch(
  "/:appointmentId",
  authenticate,
  validateRequest(appointmentUpdateSchema),
  appointmentController.updateAppointmentStatus
);

module.exports = router;
