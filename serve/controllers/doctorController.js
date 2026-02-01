const asyncHandler = require("../middleware/asyncHandler");
const doctorService = require("../services/doctorService");

const listDoctors = asyncHandler((req, res) => {
  const doctors = doctorService.listDoctors();
  res.json({ doctors });
});

const getDoctor = asyncHandler((req, res) => {
  const doctor = doctorService.getDoctorById(req.params.doctorId);
  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found." });
  }
  res.json({ doctor });
});

const createProfile = asyncHandler((req, res) => {
  const doctor = doctorService.createDoctorProfile(req.user, req.body);
  res.status(201).json({ doctor });
});

const updateProfile = asyncHandler((req, res) => {
  const doctor = doctorService.updateDoctorProfile(
    req.params.doctorId,
    req.user,
    req.body
  );
  res.json({ doctor });
});

module.exports = {
  listDoctors,
  getDoctor,
  createProfile,
  updateProfile,
};
