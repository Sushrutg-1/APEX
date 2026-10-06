import env from '../config/env.config.js';
import ApiError from '../utils/ApiError.js';
import HTTP_STATUS from '../constants/httpStatus.constant.js';

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors || [],
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  if (err.status === HTTP_STATUS.PAYLOAD_TOO_LARGE) {
    return res.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({
      success: false,
      statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      message: 'Request body exceeds the allowed size.',
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Invalid request body.',
    });
  }

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: 'Internal Server Error.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

export default errorHandler;
