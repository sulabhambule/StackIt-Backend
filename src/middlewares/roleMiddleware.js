import ApiError from '../utils/ApiError.js';

// Middleware to check user roles
const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    const userRole = req.user.role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      throw new ApiError(403, "Access denied. Insufficient permissions");
    }

    next();
  };
};

export default verifyRole;