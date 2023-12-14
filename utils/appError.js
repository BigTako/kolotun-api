/**
 * Definition of API custom error.
 * Operational error means predictable - that one developer
 * can possibly know can happen.(Ex: failure to connect to database).
 * message - String
 * statusCode - Number
 * isOperational - Boolean
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // operational means predictable
    Error.captureStackTrace(this, this.constructor);
    // Creates a .stack property on targetObject, which when accessed returns a string representing the
    // location in the code at which Error.captureStackTrace() was called.
  }
}

module.exports = AppError;
