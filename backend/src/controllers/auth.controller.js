import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';

import User from '../models/User.model.js';
import Vehicle from '../models/Vehicle.model.js';

import env from '../config/env.config.js';

import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

import HTTP_STATUS from '../constants/httpStatus.constant.js';
import API_MESSAGE from '../constants/apiMessage.constant.js';

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    // Validate username
    if (typeof username !== 'string' || !username.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, API_MESSAGE.USERNAME_REQUIRED);
    }

    // Validate password
    if (typeof password !== 'string' || !password) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, API_MESSAGE.PASSWORD_REQUIRED);
    }

    // Find user
    const user = await User.findOne({
      $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }],
    });

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

const register = async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body || {};
    const normalizedName = typeof fullName === 'string' ? fullName.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const namePattern = /^[\p{L}][\p{L}' -]{1,79}$/u;

    if (!normalizedName || !namePattern.test(normalizedName)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Full name must be 2-80 valid characters');
    }
    if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 254) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'A valid email address is required');
    }
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 128 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Password must be 8-128 characters with upper, lower, and numeric characters'
      );
    }
    if (password !== confirmPassword) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Passwords do not match');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const vehicleId = `APEX-${randomBytes(3).toString('hex').toUpperCase()}`;
    const user = await User.create({
      fullName: normalizedName,
      email: normalizedEmail,
      username: normalizedEmail,
      passwordHash,
      vehicleId,
      role: 'owner',
    });

    try {
      await Vehicle.create({
        vehicleId,
        name: `${normalizedName}'s APEX Rover`,
        owner: user._id,
        deviceToken: randomBytes(24).toString('hex'),
        status: 'offline',
      });
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
    }

    return res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        { user: { id: user._id, fullName: user.fullName, email: user.email } },
        'Registration successful'
      )
    );
  } catch (error) {
    if (error?.code === 11000) {
      return next(new ApiError(HTTP_STATUS.CONFLICT, 'An account with that email already exists'));
    }
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

export { login, refreshAccessToken, register };
