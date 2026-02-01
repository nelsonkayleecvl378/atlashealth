const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { readDb } = require("../db");

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token." });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const db = readDb();
    const user = db.users.find((item) => item.id === payload.sub);

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token verification failed." });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ message: "Forbidden for this role." });
  }
  next();
};

module.exports = {
  authenticate,
  requireRole,
};


