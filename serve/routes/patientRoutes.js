const { Router } = require("express");
const patientController = require("../controllers/patientController");
const validateRequest = require("../middleware/validateRequest");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { patientProfileSchema } = require("./validators");

const router = Router();

router.get("/", authenticate, patientController.listPatients);
router.get("/:patientId", authenticate, patientController.getPatient);
router.post(
  "/",
  authenticate,
  requireRole("patient"),
  validateRequest(patientProfileSchema),
  patientController.createProfile
);
router.patch(
  "/:patientId",
  authenticate,
  requireRole("patient"),
  validateRequest(patientProfileSchema.partial()),
  patientController.updateProfile
);
router.get("/:patientId/records", authenticate, patientController.getPatientRecords);

module.exports = router;
