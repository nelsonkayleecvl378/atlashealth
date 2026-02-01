const { v4: uuidv4 } = require("uuid");
const { readDb, withDb } = require("../db");
const notificationService = require("./notificationService");

const getAccessGrant = (patientId, doctorId) => {
  const db = readDb();
  return db.accessGrants.find(
    (grant) => grant.patientId === patientId && grant.doctorId === doctorId
  );
};

const listAccessGrantsForPatient = (patientId) => {
  const db = readDb();
  return db.accessGrants.filter((grant) => grant.patientId === patientId);
};

const listAccessGrantsForDoctor = (doctorId) => {
  const db = readDb();
  return db.accessGrants.filter((grant) => grant.doctorId === doctorId);
};

const listAllGrants = () => {
  const db = readDb();
  return db.accessGrants;
};

const grantAccess = (patient, doctor) => {
  const existing = getAccessGrant(patient.id, doctor.id);

  if (existing && existing.status === "active") {
    return existing;
  }

  const grant = existing || {
    id: uuidv4(),
    patientId: patient.id,
    doctorId: doctor.id,
    status: "active",
    grantedAt: new Date().toISOString(),
    revokedAt: null,
  };

  if (existing) {
    grant.status = "active";
    grant.grantedAt = new Date().toISOString();
    grant.revokedAt = null;
  }

  withDb((db) => {
    if (!existing) {
      db.accessGrants.push(grant);
    } else {
      const index = db.accessGrants.findIndex((g) => g.id === grant.id);
      db.accessGrants[index] = grant;
    }
    return db;
  });

  notificationService.createNotification(doctor.userId, {
    type: notificationService.NOTIFICATION_TYPE.ACCESS_GRANTED,
    title: "Access granted",
    message: `${patient.name} granted you access to their records.`,
    data: { patientId: patient.id },
  });

  return grant;
};

const revokeAccess = (patient, doctor) => {
  const existing = getAccessGrant(patient.id, doctor.id);
  if (!existing || existing.status !== "active") {
    const error = new Error("Access grant not found.");
    error.statusCode = 404;
    throw error;
  }

  const updated = {
    ...existing,
    status: "revoked",
    revokedAt: new Date().toISOString(),
  };

  withDb((db) => {
    const index = db.accessGrants.findIndex((g) => g.id === updated.id);
    db.accessGrants[index] = updated;
    return db;
  });

  notificationService.createNotification(doctor.userId, {
    type: notificationService.NOTIFICATION_TYPE.ACCESS_REVOKED,
    title: "Access revoked",
    message: `${patient.name} revoked your access to their records.`,
    data: { patientId: patient.id },
  });

  return updated;
};

const hasAccess = (patientId, doctorId) => {
  const grant = getAccessGrant(patientId, doctorId);
  return Boolean(grant && grant.status === "active");
};

module.exports = {
  getAccessGrant,
  listAccessGrantsForPatient,
  listAccessGrantsForDoctor,
  listAllGrants,
  grantAccess,
  revokeAccess,
  hasAccess,
};
