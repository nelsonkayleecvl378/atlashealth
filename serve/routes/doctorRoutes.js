const { Router } = require("express");
const doctorController = require("../controllers/doctorController");
const validateRequest = require("../middleware/validateRequest");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { doctorProfileSchema } = require("./validators");

const router = Router();

router.get("/", authenticate, doctorController.listDoctors);
router.get("/:doctorId", authenticate, doctorController.getDoctor);
router.post(
  "/",
  authenticate,
  requireRole("doctor"),
  validateRequest(doctorProfileSchema),
  doctorController.createProfile
);
router.patch(
  "/:doctorId",
  authenticate,
  requireRole("doctor"),
  validateRequest(doctorProfileSchema.partial()),
  doctorController.updateProfile
);

module.exports = router;
