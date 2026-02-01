const { v4: uuidv4 } = require("uuid");
const { readDb, withDb } = require("../db");

const getPatientById = (patientId) => {
  const db = readDb();
  return db.patients.find((patient) => patient.id === patientId) || null;
};

const getPatientByUserId = (userId) => {
  const db = readDb();
  return db.patients.find((patient) => patient.userId === userId) || null;
};

const listPatients = () => {
  const db = readDb();
  return db.patients;
};

const createPatientProfile = (user, payload) => {
  if (user.role !== "patient") {
    const error = new Error("Only patients can create patient profiles.");
    error.statusCode = 403;
    throw error;
  }

  const existing = getPatientByUserId(user.id);
  if (existing) {
    const error = new Error("Patient profile already exists.");
    error.statusCode = 409;
    throw error;
  }

  const patient = {
    id: uuidv4(),
    userId: user.id,
    name: payload.name || user.name,
    email: user.email,
    dateOfBirth: payload.dateOfBirth || null,
    gender: payload.gender || null,
    bloodType: payload.bloodType || null,
    allergies: payload.allergies || [],
    conditions: payload.conditions || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  withDb((db) => {
    db.patients.push(patient);
    return db;
  });

  return patient;
};

const updatePatientProfile = (patientId, user, payload) => {
  const db = readDb();
  const index = db.patients.findIndex((patient) => patient.id === patientId);

  if (index === -1) {
    const error = new Error("Patient not found.");
    error.statusCode = 404;
    throw error;
  }

  const patient = db.patients[index];
  if (patient.userId !== user.id) {
    const error = new Error("Not authorized to update this profile.");
    error.statusCode = 403;
    throw error;
  }

  const updated = {
    ...patient,
    name: payload.name ?? patient.name,
    dateOfBirth: payload.dateOfBirth ?? patient.dateOfBirth,
    gender: payload.gender ?? patient.gender,
    bloodType: payload.bloodType ?? patient.bloodType,
    allergies: payload.allergies ?? patient.allergies,
    conditions: payload.conditions ?? patient.conditions,
    updatedAt: new Date().toISOString(),
  };

  withDb((state) => {
    state.patients[index] = updated;
    return state;
  });

  return updated;
};

module.exports = {
  getPatientById,
  getPatientByUserId,
  listPatients,
  createPatientProfile,
  updatePatientProfile,
};
