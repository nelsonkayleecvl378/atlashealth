const { v4: uuidv4 } = require("uuid");
const { readDb, withDb } = require("../db");
const accessService = require("./accessService");
const notificationService = require("./notificationService");

const createRecord = (doctor, patient, payload) => {
  if (!accessService.hasAccess(patient.id, doctor.id)) {
    const error = new Error("Doctor does not have access to this patient.");
    error.statusCode = 403;
    throw error;
  }

  const record = {
    id: uuidv4(),
    patientId: patient.id,
    doctorId: doctor.id,
    title: payload.title,
    description: payload.description || "",
    attachments: payload.attachments || [],
    createdAt: new Date().toISOString(),
  };

  withDb((db) => {
    db.records.push(record);
    return db;
  });

  notificationService.createNotification(patient.userId, {
    type: notificationService.NOTIFICATION_TYPE.RECORD_ADDED,
    title: "New medical record",
    message: "A new medical record was added to your profile.",
    data: { recordId: record.id },
  });

  return record;
};

const listRecordsForPatient = (patientId, user, doctorProfile) => {
  const db = readDb();

  if (user.role === "admin") {
    return db.records.filter((record) => record.patientId === patientId);
  }

  if (user.role === "patient") {
    const patientProfile = db.patients.find((p) => p.userId === user.id);
    if (!patientProfile || patientProfile.id !== patientId) {
      const error = new Error("Not authorized to view these records.");
      error.statusCode = 403;
      throw error;
    }
  } else if (user.role === "doctor") {
    const resolvedDoctor = doctorProfile || db.doctors.find((d) => d.userId === user.id);
    if (!resolvedDoctor || !accessService.hasAccess(patientId, resolvedDoctor.id)) {
      const error = new Error("Not authorized to view these records.");
      error.statusCode = 403;
      throw error;
    }
  } else {
    const error = new Error("Not authorized to view these records.");
    error.statusCode = 403;
    throw error;
  }

  return db.records.filter((record) => record.patientId === patientId);
};

module.exports = {
  createRecord,
  listRecordsForPatient,
};
