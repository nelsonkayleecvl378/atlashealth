const asyncHandler = require("../middleware/asyncHandler");
const authService = require("../services/authService");

const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

const me = asyncHandler((req, res) => {
  res.json({ user: authService.sanitizeUser(req.user) });
});

module.exports = {
  signup,
  login,
  me,
};


