const validateRequest =
  (schema, property = "body") =>
  (req, res, next) => {
    try {
      const result = schema.parse(req[property]);
      req[property] = result;
      next();
    } catch (error) {
      next({
        statusCode: 400,
        message: "Invalid request payload.",
        details: error.errors,
      });
    }
  };

module.exports = validateRequest;


