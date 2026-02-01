const { Router } = require("express");
const authController = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");
const { signupSchema, loginSchema } = require("./validators");
const { authenticate } = require("../middleware/authMiddleware");

const router = Router();

router.post("/signup", validateRequest(signupSchema), authController.signup);
router.post("/login", validateRequest(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);

module.exports = router;


