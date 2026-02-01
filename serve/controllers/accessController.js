const asyncHandler = require("../middleware/asyncHandler");
const patientService = require("../services/patientService");
const doctorService = require("../services/doctorService");
const accessService = require("../services/accessService");

const listAccessGrants = asyncHandler((req, res) => {
  if (req.user.role === "patient") {
    const patient = patientService.getPatientByUserId(req.user.id);
    if (!patient) {
      return res.status(400).json({ message: "Patient profile not found." });
    }
    const grants = accessService.listAccessGrantsForPatient(patient.id);
    return res.json({ grants });
  }

  if (req.user.role === "doctor") {
    const doctor = doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) {
      return res.status(400).json({ message: "Doctor profile not found." });
    }
    const grants = accessService.listAccessGrantsForDoctor(doctor.id);
    return res.json({ grants });
  }

  if (req.user.role === "admin") {
    const grants = accessService.listAllGrants();
    return res.json({ grants });
  }

  return res.status(403).json({ message: "Forbidden." });
});

const grantAccess = asyncHandler((req, res) => {
  const patient = patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    return res.status(400).json({ message: "Patient profile not found." });
  }

  const doctor = doctorService.getDoctorById(req.body.doctorId);
  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found." });
  }

  const grant = accessService.grantAccess(patient, doctor);
  res.status(201).json({ grant });
});

const revokeAccess = asyncHandler((req, res) => {
  const patient = patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    return res.status(400).json({ message: "Patient profile not found." });
  }

  const doctor = doctorService.getDoctorById(req.body.doctorId);
  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found." });
  }

  const grant = accessService.revokeAccess(patient, doctor);
  res.json({ grant });
});

module.exports = {
  listAccessGrants,
  grantAccess,
  revokeAccess,
};
