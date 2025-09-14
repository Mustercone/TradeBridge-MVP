// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    status: 500
  };

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      status: 401
    };
  } else if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      status: 401
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = {
      message: err.message,
      code: 'VALIDATION_ERROR',
      status: 400
    };
  }

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('UNIQUE constraint failed')) {
      error = {
        message: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        status: 409
      };
    } else {
      error = {
        message: 'Database constraint violation',
        code: 'CONSTRAINT_ERROR',
        status: 400
      };
    }
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File too large',
      code: 'FILE_TOO_LARGE',
      status: 413
    };
  }

  // Rate limit errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429
    };
  }

  // Custom application errors
  if (err.status && err.code) {
    error = {
      message: err.message,
      code: err.code,
      status: err.status
    };
  }

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  }

  res.status(error.status).json({
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
};

module.exports = { errorHandler };
