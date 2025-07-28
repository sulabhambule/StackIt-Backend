import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

// Make user admin (for testing purposes)
const makeUserAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  user.role = 'admin';
  await user.save();
  
  return res.status(200).json(
    new ApiResponse(200, user, "User made admin successfully")
  );
});

export { makeUserAdmin };
