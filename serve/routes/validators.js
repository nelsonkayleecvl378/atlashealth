const { z } = require("zod");

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["patient", "doctor", "admin"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const patientProfileSchema = z.object({
  name: z.string().min(2).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
});

const doctorProfileSchema = z.object({
  name: z.string().min(2).optional(),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
  hospital: z.string().optional(),
});

const appointmentCreateSchema = z.object({
  doctorId: z.string().min(1),
  scheduledFor: z.string().min(1),
  reason: z.string().optional(),
});

const appointmentUpdateSchema = z.object({
  status: z.enum(["pending", "approved", "declined", "cancelled"]),
});

const recordCreateSchema = z.object({
  patientId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

const accessGrantSchema = z.object({
  doctorId: z.string().min(1),
});

module.exports = {
  signupSchema,
  loginSchema,
  patientProfileSchema,
  doctorProfileSchema,
  appointmentCreateSchema,
  appointmentUpdateSchema,
  recordCreateSchema,
  accessGrantSchema,
};


