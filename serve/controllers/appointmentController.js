const asyncHandler = require("../middleware/asyncHandler");
const appointmentService = require("../services/appointmentService");
const patientService = require("../services/patientService");
const doctorService = require("../services/doctorService");

const listAppointments = asyncHandler((req, res) => {
  const appointments = appointmentService.listAppointmentsForUser(req.user);
  res.json({ appointments });
});

const createAppointment = asyncHandler((req, res) => {
  const patientProfile = patientService.getPatientByUserId(req.user.id);
  if (!patientProfile) {
    return res.status(400).json({ message: "Patient profile not found." });
  }

  const doctorProfile = doctorService.getDoctorById(req.body.doctorId);
  if (!doctorProfile) {
    return res.status(404).json({ message: "Doctor not found." });
  }

  const appointment = appointmentService.createAppointment(
    patientProfile,
    doctorProfile,
    req.body
  );
  res.status(201).json({ appointment });
});

const updateAppointmentStatus = asyncHandler((req, res) => {
  const appointment = appointmentService.updateAppointmentStatus(
    req.params.appointmentId,
    req.user,
    req.body.status
  );
  res.json({ appointment });
});

module.exports = {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
};
