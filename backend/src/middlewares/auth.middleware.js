import jwt from 'jsonwebtoken';

import env from '../config/env.config.js';

import ApiError from '../utils/ApiError.js';

import HTTP_STATUS from '../constants/httpStatus.constant.js';
import API_MESSAGE from '../constants/apiMessage.constant.js';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.AUTHENTICATION_REQUIRED);
    }

    const accessToken = authHeader.split(' ')[1];

    if (!accessToken) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.AUTHENTICATION_REQUIRED);
    }

    const decodedToken = jwt.verify(accessToken, env.ACCESS_TOKEN_SECRET);

    req.user = decodedToken;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.INVALID_TOKEN));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.INVALID_TOKEN));
    }

    next(error);
  }
};

export default authMiddleware;
