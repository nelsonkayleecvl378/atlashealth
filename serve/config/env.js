const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config(); // Also load from root if exists

const env = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 4000,
  host: process.env.HOST || "0.0.0.0",

  // JWT Configuration
  jwtSecret:
    process.env.JWT_SECRET || "medical-record-dev-secret-key-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",

  // CORS Configuration
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001").split(","),

  // Rate Limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60000, // 1 minute
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // requests per window

  // Database Configuration (for future database integration)
  dbPath: process.env.DB_PATH || path.join(__dirname, "../../data/db.json"),

  // Email Configuration (for notifications)
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "noreply@medical-record-chain.com",

  // Twilio Configuration (for SMS)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",

  // File Storage
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads"),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB

  // Cache Configuration
  cacheEnabled: process.env.CACHE_ENABLED !== "false",
  cacheTTL: parseInt(process.env.CACHE_TTL, 10) || 300000, // 5 minutes

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // Feature Flags
  enableNotifications: process.env.ENABLE_NOTIFICATIONS !== "false",
  maintenanceMode: process.env.MAINTENANCE_MODE === "true",

  // Helper methods
  isProduction: () => env.nodeEnv === "production",
  isDevelopment: () => env.nodeEnv === "development",
  isTest: () => env.nodeEnv === "test",
};

// Validate required configuration in production
if (env.nodeEnv === "production") {
  const requiredVars = ["JWT_SECRET"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`[Config] Warning: Missing recommended env vars: ${missing.join(", ")}`);
  }
}

module.exports = env;

