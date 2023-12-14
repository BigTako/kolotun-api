const AppError = require("../utils/appError");
const statusCode = require("../utils/statusCode");
/**
 * Transforms 'raw' error into understandable one for user.
 * Triggers on data with wrong format in req body.
 * @param {*} err - AppError object of raw error
 * @returns new AppError object
 */
const handleCastErrorDb = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, statusCode.BAD_REQUEST_SC);
};

/**
 * Transforms 'raw' error into understandable one for user.
 * Triggers on duplicate values of fields marked as 'unique' in mongoose Schema.
 * @param {*} err - AppError object of raw error
 * @returns new AppError object
 */
const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue[Object.keys(err.keyValue)[0]];
  const message = `Duplicate field value (${value}). Please use another value.`;
  return new AppError(message, statusCode.BAD_REQUEST_SC);
};

/**
 * Transforms 'raw' error into understandable one for user.
 * Triggers on invalid JWT token received from user.
 */
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again", 401);

/**
 * Transforms 'raw' error into understandable one for user.
 * Triggers on expired JWT token received from user.
 */
const handleJWTExpiredError = () =>
  new AppError("You token has expired. Please log in again", 401);

/**
 * Transforms 'raw' error into understandable one for user.
 * Triggers on triggered mongoose Schema validation errors.
 * @param {*} err - AppError object of raw error
 * @returns new AppError object
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data ${errors.join(". ")}`;
  return new AppError(message, statusCode.BAD_REQUEST_SC);
};

/**
 * Special error handler for development
 * @param {*} err - AppError object of raw error
 * @param {*} res - responce to send to
 */
const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Special error handler for production
 * @param {*} err - AppError object of raw error
 * @param {*} res - responce to send to
 */
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // error is not operational(bug in code, etc...)
    res.status(statusCode.INTERNAL_SERVER_SC).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

/**
 * Global error handler
 */
module.exports = (err, req, res, next) => {
  // err - AppError class object
  err.statusCode = err.statusCode || statusCode.INTERNAL_SERVER_SC;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
    // send full trace
  } else if (process.env.NODE_ENV === "production") {
    // send limited trace
    let error = { ...err, name: err.name, code: err.code };
    if (error.name === "CastError") error = handleCastErrorDb(error, res);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error, res);
    if (error.name === "ValidationError") error = handleValidationError(error);
    if (error.name === "JsonWebTokenError")
      error = handleJsonWebTokenError(error);
    if (error.name === "TokenExpiredError")
      error = handleJWTExpiredError(error);

    sendErrorProd(error, res);
  }
};
