import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/User.model.js';
import Vehicle from '../models/Vehicle.model.js';

import env from '../config/env.config.js';

import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

import HTTP_STATUS from '../constants/httpStatus.constant.js';
import API_MESSAGE from '../constants/apiMessage.constant.js';

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate username
    if (!username) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, API_MESSAGE.USERNAME_REQUIRED);
    }

    // Validate password
    if (!password) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, API_MESSAGE.PASSWORD_REQUIRED);
    }

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.INVALID_CREDENTIALS);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.INVALID_CREDENTIALS);
    }

    // Find user's vehicle
    const vehicle = await Vehicle.findOne({
      vehicleId: user.vehicleId,
      owner: user._id,
    });

    if (!vehicle) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, API_MESSAGE.VEHICLE_NOT_ASSIGNED);
    }

    // Create access token
    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        vehicleId: vehicle.vehicleId,
      },
      env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: env.ACCESS_TOKEN_EXPIRY,
      }
    );

    // Create refresh token
    const refreshToken = jwt.sign(
      {
        userId: user._id.toString(),
      },
      env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: env.REFRESH_TOKEN_EXPIRY,
      }
    );

    const data = {
      accessToken,
      refreshToken,

      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },

      vehicle: {
        vehicleId: vehicle.vehicleId,
        name: vehicle.name,
        status: vehicle.status,
      },
    };

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, data, API_MESSAGE.LOGIN_SUCCESS));
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.REFRESH_TOKEN_REQUIRED);
    }

    let decodedToken;

    try {
      decodedToken = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.REFRESH_TOKEN_INVALID);
    }

    const user = await User.findById(decodedToken.userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, API_MESSAGE.REFRESH_TOKEN_INVALID);
    }

    const vehicle = await Vehicle.findOne({
      vehicleId: user.vehicleId,
      owner: user._id,
    });

    if (!vehicle) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, API_MESSAGE.VEHICLE_NOT_ASSIGNED);
    }

    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        vehicleId: vehicle.vehicleId,
      },
      env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: env.ACCESS_TOKEN_EXPIRY,
      }
    );

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          accessToken,
        },
        API_MESSAGE.TOKEN_REFRESH_SUCCESS
      )
    );
  } catch (error) {
    next(error);
  }
};

export { login, refreshAccessToken };
