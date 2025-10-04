const { body, param, query, validationResult } = require("express-validator");
const validator = require("validator");

// Custom validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(
      `🚨 Validation error from IP: ${req.ip} - ${JSON.stringify(errors.array())}`,
    );
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// Authentication validation schemas
const authValidation = {
  register: [
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Username can only contain letters, numbers, underscores, and hyphens",
      ),

    body("email")
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),

    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be between 8 and 128 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      )
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),

    body("role")
      .optional()
      .isIn(["user", "admin"])
      .withMessage("Role must be either user or admin"),

    handleValidationErrors,
  ],

  login: [
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username or email is required")
      .isLength({ max: 255 })
      .withMessage("Username/email too long"),

    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ max: 128 })
      .withMessage("Password too long"),

    handleValidationErrors,
  ],

  twoFactorVerify: [
    body("token")
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage("2FA token must be 6 digits")
      .isNumeric()
      .withMessage("2FA token must be numeric"),

    body("userId").optional().isInt({ min: 1 }).withMessage("Invalid user ID"),

    handleValidationErrors,
  ],
};

// User management validation schemas
const userValidation = {
  updateProfile: [
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Username can only contain letters, numbers, underscores, and hyphens",
      ),

    body("email")
      .optional()
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),

    handleValidationErrors,
  ],

  changePassword: [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),

    body("newPassword")
      .isLength({ min: 8, max: 128 })
      .withMessage("New password must be between 8 and 128 characters")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      )
      .withMessage(
        "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),

    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match new password");
      }
      return true;
    }),

    handleValidationErrors,
  ],
};

// Host management validation schemas
const hostValidation = {
  createHost: [
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Host name must be between 1 and 100 characters")
      .matches(/^[a-zA-Z0-9\s\-_.]+$/)
      .withMessage(
        "Host name can only contain letters, numbers, spaces, hyphens, underscores, and periods",
      ),

    body("address")
      .trim()
      .notEmpty()
      .withMessage("Host address is required")
      .isLength({ min: 1, max: 255 })
      .withMessage("Host address must be between 1 and 255 characters"),

    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters"),

    body("cert")
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage("Certificate must be less than 10000 characters"),

    body("key")
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage("Private key must be less than 10000 characters"),

    body("ca")
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage("CA certificate must be less than 10000 characters"),

    handleValidationErrors,
  ],
};

// Instance management validation schemas
const instanceValidation = {
  createInstance: [
    body("name")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Instance name must be between 1 and 50 characters")
      .matches(/^[a-zA-Z0-9-]+$/)
      .withMessage(
        "Instance name can only contain letters, numbers, and hyphens",
      ),

    body("image").trim().notEmpty().withMessage("Image is required"),

    body("cpu")
      .optional()
      .isInt({ min: 1, max: 32 })
      .withMessage("CPU must be between 1 and 32"),

    body("memory")
      .optional()
      .isInt({ min: 512, max: 65536 })
      .withMessage("Memory must be between 512MB and 64GB"),

    body("disk")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Disk size must be between 1GB and 1TB"),

    handleValidationErrors,
  ],
};

// General ID validation
const idValidation = {
  validateId: [
    param("id").isInt({ min: 1 }).withMessage("Invalid ID provided"),

    handleValidationErrors,
  ],
};

// Query parameter validation
const queryValidation = {
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Page must be between 1 and 1000"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),

    handleValidationErrors,
  ],
};

module.exports = {
  authValidation,
  userValidation,
  hostValidation,
  instanceValidation,
  idValidation,
  queryValidation,
  handleValidationErrors,
};
