const { v4: uuidv4 } = require("uuid");
const { readDb, withDb } = require("../db");
const notificationService = require("./notificationService");

const APPOINTMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  DECLINED: "declined",
  CANCELLED: "cancelled",
};

const createAppointment = (patient, doctor, payload) => {
  const appointment = {
    id: uuidv4(),
    patientId: patient.id,
    doctorId: doctor.id,
    scheduledFor: payload.scheduledFor,
    reason: payload.reason || "",
    status: APPOINTMENT_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  withDb((db) => {
    db.appointments.push(appointment);
    return db;
  });

  notificationService.createNotification(doctor.userId, {
    type: notificationService.NOTIFICATION_TYPE.APPOINTMENT_REQUEST,
    title: "New appointment request",
    message: `${patient.name} requested an appointment.`,
    data: { appointmentId: appointment.id, patientId: patient.id },
  });

  return appointment;
};

const listAppointmentsForUser = (user) => {
  const db = readDb();
  const patientProfile = db.patients.find((p) => p.userId === user.id);
  const doctorProfile = db.doctors.find((d) => d.userId === user.id);

  if (user.role === "admin") {
    return db.appointments;
  }

  if (user.role === "patient" && patientProfile) {
    return db.appointments.filter((appt) => appt.patientId === patientProfile.id);
  }

  if (user.role === "doctor" && doctorProfile) {
    return db.appointments.filter((appt) => appt.doctorId === doctorProfile.id);
  }

  return [];
};

const updateAppointmentStatus = (appointmentId, user, status) => {
  const db = readDb();
  const index = db.appointments.findIndex((appt) => appt.id === appointmentId);

  if (index === -1) {
    const error = new Error("Appointment not found.");
    error.statusCode = 404;
    throw error;
  }

  const appointment = db.appointments[index];
  const patientProfile = db.patients.find((p) => p.userId === user.id);
  const doctorProfile = db.doctors.find((d) => d.userId === user.id);

  const isPatient = patientProfile && appointment.patientId === patientProfile.id;
  const isDoctor = doctorProfile && appointment.doctorId === doctorProfile.id;
  const isAdmin = user.role === "admin";

  if (!isPatient && !isDoctor && !isAdmin) {
    const error = new Error("Not authorized to update this appointment.");
    error.statusCode = 403;
    throw error;
  }

  const nextStatus = status;
  if (!Object.values(APPOINTMENT_STATUS).includes(nextStatus)) {
    const error = new Error("Invalid appointment status.");
    error.statusCode = 400;
    throw error;
  }

  if (isPatient && ![APPOINTMENT_STATUS.CANCELLED].includes(nextStatus)) {
    const error = new Error("Patients can only cancel appointments.");
    error.statusCode = 403;
    throw error;
  }

  if (isDoctor && nextStatus === APPOINTMENT_STATUS.CANCELLED) {
    const error = new Error("Doctors cannot cancel appointments.");
    error.statusCode = 403;
    throw error;
  }

  const updated = {
    ...appointment,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  withDb((state) => {
    state.appointments[index] = updated;
    return state;
  });

  const patient = db.patients.find((p) => p.id === appointment.patientId);
  if (patient) {
    notificationService.createNotification(patient.userId, {
      type: notificationService.NOTIFICATION_TYPE.APPOINTMENT_UPDATE,
      title: "Appointment update",
      message: `Your appointment status is now ${nextStatus}.`,
      data: { appointmentId: appointment.id },
    });
  }

  return updated;
};

module.exports = {
  APPOINTMENT_STATUS,
  createAppointment,
  listAppointmentsForUser,
  updateAppointmentStatus,
};
