const { Router } = require("express");
const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middleware/authMiddleware");

const router = Router();

router.get("/", authenticate, notificationController.listNotifications);
router.patch(
  "/:notificationId/read",
  authenticate,
  notificationController.markAsRead
);
router.patch("/read-all", authenticate, notificationController.markAllAsRead);

module.exports = router;
