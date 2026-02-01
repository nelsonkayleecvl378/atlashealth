const asyncHandler = require("../middleware/asyncHandler");
const patientService = require("../services/patientService");
const recordService = require("../services/recordService");

const listPatients = asyncHandler((req, res) => {
  const patients = patientService.listPatients();
  res.json({ patients });
});

const getPatient = asyncHandler((req, res) => {
  const patient = patientService.getPatientById(req.params.patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found." });
  }
  res.json({ patient });
});

const createProfile = asyncHandler((req, res) => {
  const patient = patientService.createPatientProfile(req.user, req.body);
  res.status(201).json({ patient });
});

const updateProfile = asyncHandler((req, res) => {
  const patient = patientService.updatePatientProfile(
    req.params.patientId,
    req.user,
    req.body
  );
  res.json({ patient });
});

const getPatientRecords = asyncHandler((req, res) => {
  const records = recordService.listRecordsForPatient(req.params.patientId, req.user);
  res.json({ records });
});

module.exports = {
  listPatients,
  getPatient,
  createProfile,
  updateProfile,
  getPatientRecords,
};
