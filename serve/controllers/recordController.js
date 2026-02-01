const asyncHandler = require("../middleware/asyncHandler");
const patientService = require("../services/patientService");
const doctorService = require("../services/doctorService");
const recordService = require("../services/recordService");

const createRecord = asyncHandler((req, res) => {
  const doctorProfile = doctorService.getDoctorByUserId(req.user.id);
  if (!doctorProfile) {
    return res.status(400).json({ message: "Doctor profile not found." });
  }

  const patientProfile = patientService.getPatientById(req.body.patientId);
  if (!patientProfile) {
    return res.status(404).json({ message: "Patient not found." });
  }

  const record = recordService.createRecord(doctorProfile, patientProfile, req.body);
  res.status(201).json({ record });
});

module.exports = {
  createRecord,
};
