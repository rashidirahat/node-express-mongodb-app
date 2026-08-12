class ApiError extends Error {
  constructor(statusCode, message, errorCode) {
    super(message);
    this.statusCode = statusCode;
    if (errorCode) {
      this.errorCode = errorCode;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
