import UserModeration from '../models/userModeration.model.js';
import { ApiError } from '../utils/ApiError.js';

export const checkUserStatus = async (req, res, next) => {
  try {
    const userModeration = await UserModeration.findOne({ userId: req.user._id });
    
    if (!userModeration) {
      return next();
    }

    // Check if user is banned
    if (userModeration.status === 'banned') {
      throw new ApiError(403, 'Your account has been banned', {
        reason: userModeration.banReason,
        bannedAt: userModeration.bannedAt
      });
    }

    // Check if user is currently suspended
    if (userModeration.status === 'suspended') {
      const activeSuspension = userModeration.suspensions.find(
        suspension => suspension.isActive && new Date() < new Date(suspension.endDate)
      );

      if (activeSuspension) {
        throw new ApiError(403, 'Your account is currently suspended', {
          reason: activeSuspension.reason,
          endDate: activeSuspension.endDate,
          duration: activeSuspension.duration
        });
      } else {
        // Suspension expired, update status
        userModeration.status = 'active';
        userModeration.suspensions.forEach(suspension => {
          if (new Date() >= new Date(suspension.endDate)) {
            suspension.isActive = false;
          }
        });
        await userModeration.save();
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
