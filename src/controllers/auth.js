import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  uploadAvatarToCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { createNotification } from "./notificationController.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const userAccessToken = user.generateAccessToken();
    const userRefreshToken = user.generateRefreshToken();

    user.refreshToken = userRefreshToken;

    await user.save({ validateBeforeSave: false });

    return { userRefreshToken, userAccessToken };
  } catch (error) {
    console.error("Error in generateAccessAndRefreshToken:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

// Register Controller
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  // Validation
  if (
    [name, email, password, confirmPassword].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    throw new ApiError(400, "Password and confirm password do not match");
  }

  // Check if user already exists
  const existedUser = await User.findOne({ email });
  if (existedUser) {
    throw new ApiError(409, "User with email already exists");
  }

  // Handle avatar upload
  let avatarUrl = null;
  if (req.file) {
    const avatarLocalPath = req.file.path;
    const avatar = await uploadAvatarToCloudinary(avatarLocalPath);
    if (avatar) {
      avatarUrl = avatar.secure_url;
    }
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    ...(avatarUrl && { avatar: avatarUrl }), // Only set avatar if uploaded
  });

  // Remove password and refresh token from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Generate tokens for automatic login after registration
  const { userAccessToken, userRefreshToken } =
    await generateAccessAndRefreshToken(user._id);

  // Create welcome notification
  await createNotification({
    userId: user._id,
    type: "welcome",
    message: `Welcome to StackIt, ${user.name}! 🎉 Start asking questions and sharing your knowledge with the community.`,
    questionId: null,
    answerId: null,
    fromUserId: null
  });

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .cookie("accessToken", userAccessToken, options)
    .cookie("refreshToken", userRefreshToken, options)
    .json(
      new ApiResponse(
        201,
        {
          user: createdUser,
          accessToken: userAccessToken,
          refreshToken: userRefreshToken,
        },
        "User registered and logged in successfully"
      )
    );
});

// Login Controller
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { userAccessToken, userRefreshToken } =
    await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", userAccessToken, options)
    .cookie("refreshToken", userRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: userAccessToken,
          refreshToken: userRefreshToken,
        },
        "User logged in successfully"
      )
    );
});

// Logout Controller
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

// Refresh Access Token Controller
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { userAccessToken, userRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", userAccessToken, options)
      .cookie("refreshToken", userRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken: userAccessToken, refreshToken: userRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Change Current Password Controller
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// Get Current User Controller
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// Update Account Details Controller
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        name,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// Update User Avatar Controller
const updateUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatarLocalPath = req.file.path;

  const avatar = await uploadAvatarToCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Error while uploading avatar to cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.secure_url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
};
