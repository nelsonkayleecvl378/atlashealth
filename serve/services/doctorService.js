const { v4: uuidv4 } = require("uuid");
const { readDb, withDb } = require("../db");

const getDoctorById = (doctorId) => {
  const db = readDb();
  return db.doctors.find((doctor) => doctor.id === doctorId) || null;
};

const getDoctorByUserId = (userId) => {
  const db = readDb();
  return db.doctors.find((doctor) => doctor.userId === userId) || null;
};

const listDoctors = () => {
  const db = readDb();
  return db.doctors;
};

const createDoctorProfile = (user, payload) => {
  if (user.role !== "doctor") {
    const error = new Error("Only doctors can create doctor profiles.");
    error.statusCode = 403;
    throw error;
  }

  const existing = getDoctorByUserId(user.id);
  if (existing) {
    const error = new Error("Doctor profile already exists.");
    error.statusCode = 409;
    throw error;
  }

  const doctor = {
    id: uuidv4(),
    userId: user.id,
    name: payload.name || user.name,
    email: user.email,
    specialty: payload.specialty || null,
    licenseNumber: payload.licenseNumber || null,
    hospital: payload.hospital || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  withDb((db) => {
    db.doctors.push(doctor);
    return db;
  });

  return doctor;
};

const updateDoctorProfile = (doctorId, user, payload) => {
  const db = readDb();
  const index = db.doctors.findIndex((doctor) => doctor.id === doctorId);

  if (index === -1) {
    const error = new Error("Doctor not found.");
    error.statusCode = 404;
    throw error;
  }

  const doctor = db.doctors[index];
  if (doctor.userId !== user.id) {
    const error = new Error("Not authorized to update this profile.");
    error.statusCode = 403;
    throw error;
  }

  const updated = {
    ...doctor,
    name: payload.name ?? doctor.name,
    specialty: payload.specialty ?? doctor.specialty,
    licenseNumber: payload.licenseNumber ?? doctor.licenseNumber,
    hospital: payload.hospital ?? doctor.hospital,
    updatedAt: new Date().toISOString(),
  };

  withDb((state) => {
    state.doctors[index] = updated;
    return state;
  });

  return updated;
};

module.exports = {
  getDoctorById,
  getDoctorByUserId,
  listDoctors,
  createDoctorProfile,
  updateDoctorProfile,
};
