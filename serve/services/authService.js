const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const env = require("../config/env");
const { readDb, withDb } = require("../db");

const ALLOWED_ROLES = ["patient", "doctor", "admin"];

const sanitizeUser = (user) => {
  const { passwordHash, ...rest } = user;
  return rest;
};

const generateToken = (user) =>
  jwt.sign(
    {
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
    { subject: user.id, expiresIn: env.jwtExpiresIn }
  );

const findUserByEmail = (email) => {
  const db = readDb();
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
};

const signup = async ({ name, email, password, role }) => {
  const existing = findUserByEmail(email);
  if (existing) {
    const error = new Error("An account already exists for that email.");
    error.statusCode = 409;
    throw error;
  }

  if (!ALLOWED_ROLES.includes(role)) {
    const error = new Error("Invalid role.");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuid(),
    name,
    email: email.toLowerCase(),
    role,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  withDb((db) => {
    db.users.push(newUser);
    return db;
  });

  const token = generateToken(newUser);
  return {
    token,
    user: sanitizeUser(newUser),
  };
};

const login = async ({ email, password }) => {
  const user = findUserByEmail(email);

  if (!user) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);
  return {
    token,
    user: sanitizeUser(user),
  };
};

module.exports = {
  signup,
  login,
  sanitizeUser,
  ALLOWED_ROLES,
};
