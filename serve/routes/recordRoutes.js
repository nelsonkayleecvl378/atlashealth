const { Router } = require("express");
const recordController = require("../controllers/recordController");
const validateRequest = require("../middleware/validateRequest");
const { authenticate, requireRole } = require("../middleware/authMiddleware");
const { recordCreateSchema } = require("./validators");

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("doctor"),
  validateRequest(recordCreateSchema),
  recordController.createRecord
);

module.exports = router;
