const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const db = require("./db");

// Optional compression (install with: npm install compression)
let compression;
try {
  compression = require("compression");
} catch (e) {
  compression = null;
}

// Services for initialization
const cacheService = require("./services/cacheService");
const queueService = require("./services/queueService");
const rateLimitService = require("./services/rateLimitService");

/**
 * Medical Record Chain Server
 * API for patient records, access control, and appointments
 */

const app = express();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: env.nodeEnv === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      env.clientOrigin,
      "http://localhost:3000",
      "http://localhost:3001",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (env.nodeEnv !== "production") {
      callback(null, true); // Allow all in development
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Page", "X-Total-Pages"],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// =============================================================================
// PARSING & COMPRESSION MIDDLEWARE
// =============================================================================

// Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Response compression (if available)
if (compression) {
  app.use(compression());
}

// =============================================================================
// LOGGING MIDDLEWARE
// =============================================================================

// Custom morgan token for response time coloring
morgan.token("status-colored", (req, res) => {
  const status = res.statusCode;
  if (status >= 500) return `\x1b[31m${status}\x1b[0m`;
  if (status >= 400) return `\x1b[33m${status}\x1b[0m`;
  if (status >= 300) return `\x1b[36m${status}\x1b[0m`;
  return `\x1b[32m${status}\x1b[0m`;
});

// Request logging
if (env.nodeEnv === "production") {
  app.use(morgan("combined"));
} else {
  app.use(
    morgan(":method :url :status-colored :response-time ms - :res[content-length]")
  );
}

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

// Global rate limiting
app.use((req, res, next) => {
  const identifier = req.ip || req.connection.remoteAddress;
  const key = rateLimitService.createKey(identifier, "global");

  const result = rateLimitService.checkRateLimit(key, "DEFAULT");

  if (!result.allowed) {
    res.set("Retry-After", Math.ceil(result.resetIn / 1000));
    return res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
      retryAfter: Math.ceil(result.resetIn / 1000),
    });
  }

  // Add rate limit headers
  res.set("X-RateLimit-Limit", result.limit);
  res.set("X-RateLimit-Remaining", result.remaining);
  res.set("X-RateLimit-Reset", new Date(Date.now() + result.resetIn).toISOString());

  next();
});

// =============================================================================
// REQUEST CONTEXT MIDDLEWARE
// =============================================================================

// Add request ID and timestamp
app.use((req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestTime = new Date().toISOString();
  res.set("X-Request-Id", req.requestId);
  next();
});

// =============================================================================
// HEALTH CHECK ENDPOINT (before routes)
// =============================================================================

app.get("/health", (req, res) => {
  const healthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.nodeEnv,
    version: process.env.npm_package_version || "1.0.0",
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
    },
  };

  // Check database connectivity
  try {
    db.read();
    healthCheck.database = "connected";
  } catch (error) {
    healthCheck.database = "disconnected";
    healthCheck.status = "degraded";
  }

  // Check cache status
  const cacheStats = cacheService.getStats();
  healthCheck.cache = {
    size: cacheStats.size,
    hitRate: cacheStats.hitRate,
  };

  res.status(healthCheck.status === "healthy" ? 200 : 503).json(healthCheck);
});

// Readiness check
app.get("/ready", (req, res) => {
  try {
    db.read();
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

// =============================================================================
// API ROUTES
// =============================================================================

// API version prefix
app.use("/api", routes);
app.use("/api/v1", routes); // Versioned API

// =============================================================================
// STATIC FILES (if needed)
// =============================================================================

// Serve static files from uploads directory
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

// Initialize background services
const initializeServices = () => {
  // Create default queues
  queueService.createQueue("notifications", { maxRetries: 3 });

  // Register queue handlers (mock implementations)
  queueService.registerHandler("notifications", async () => {
    return { processed: true };
  });
};

// Cleanup tasks
const scheduleCleanupTasks = () => {
  // Cache cleanup every 5 minutes
  setInterval(() => {
    cacheService.cleanup();
  }, 5 * 60 * 1000);

  // Rate limit cleanup every minute
  setInterval(() => {
    rateLimitService.cleanup();
  }, 60 * 1000);

  // Queue cleanup every hour
  setInterval(() => {
    queueService.cleanOldJobs(24 * 60 * 60 * 1000); // Clean jobs older than 24 hours
  }, 60 * 60 * 1000);

};

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  server.close((err) => {
    if (err) {
      process.exit(1);
    }


    // Cleanup resources
    try {
      cacheService.clear();
    } catch (e) {
    }

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(env.port, () => {
  // Initialize services after server starts
  initializeServices();
  scheduleCleanupTasks();
});

// Handle server errors
server.on("error", (error) => {
  process.exit(1);
});

// Handle process signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
});

// Export for testing
module.exports = { app, server };
