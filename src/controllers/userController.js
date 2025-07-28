import User from "../models/User.js";
import Question from "../models/questions.model.js";
import Answer from "../models/answer.model.js";
import Vote from "../models/vote.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// Get user profile
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select("-password -refreshToken");
  
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

// Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { name } = req.body;

  const updateData = {};
  if (name) updateData.name = name;

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
});

// Update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const userId = req.user._id;
  const avatarLocalPath = req.file.path;

  // Upload to Cloudinary
  const { uploadAvatarToCloudinary } = await import("../utils/cloudinary.js");
  const avatar = await uploadAvatarToCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  // Update user with new avatar URL
  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: avatar.secure_url },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// Get user's questions
const getUserQuestions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const [questions, totalCount] = await Promise.all([
    Question.find({ owner: userId })
      .populate("owner", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Question.countDocuments({ owner: userId })
  ]);

  // Get answer counts for each question
  for (let question of questions) {
    const answerCount = await Answer.countDocuments({ questionId: question._id });
    question.answerCount = answerCount;
  }

  const pagination = {
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalCount / limit),
    totalCount,
    hasNext: page * limit < totalCount,
    hasPrev: page > 1
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { questions, pagination },
        "User questions fetched successfully"
      )
    );
});

// Get user's answers
const getUserAnswers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const [answers, totalCount] = await Promise.all([
    Answer.find({ owner: userId })
      .populate("owner", "name email avatar")
      .populate("questionId", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Answer.countDocuments({ owner: userId })
  ]);

  const pagination = {
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalCount / limit),
    totalCount,
    hasNext: page * limit < totalCount,
    hasPrev: page > 1
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { answers, pagination },
        "User answers fetched successfully"
      )
    );
});

// Get user statistics
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    questionsCount,
    answersCount,
    totalUpvotes,
    acceptedAnswers
  ] = await Promise.all([
    Question.countDocuments({ owner: userId }),
    Answer.countDocuments({ owner: userId }),
    Vote.countDocuments({ 
      answerId: { $in: await Answer.find({ owner: userId }).distinct('_id') },
      value: 1 
    }),
    Answer.countDocuments({ owner: userId, isAccepted: true })
  ]);

  // Calculate reputation (simple algorithm)
  const reputation = (totalUpvotes * 10) + (acceptedAnswers * 25) + (questionsCount * 5);

  const stats = {
    questionsCount,
    answersCount,
    totalUpvotes,
    acceptedAnswers,
    reputation
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "User stats fetched successfully"));
});

// Get user badges/achievements
const getUserBadges = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user stats for badge calculation
  const [questionsCount, answersCount, totalUpvotes, acceptedAnswers] = await Promise.all([
    Question.countDocuments({ owner: userId }),
    Answer.countDocuments({ owner: userId }),
    Vote.countDocuments({ 
      answerId: { $in: await Answer.find({ owner: userId }).distinct('_id') },
      value: 1 
    }),
    Answer.countDocuments({ owner: userId, isAccepted: true })
  ]);

  const badges = [];

  // Question badges
  if (questionsCount >= 1) {
    badges.push({
      name: "Questioner",
      description: "Asked your first question",
      color: "bg-blue-100 text-blue-800"
    });
  }
  if (questionsCount >= 10) {
    badges.push({
      name: "Inquisitive",
      description: "Asked 10+ questions",
      color: "bg-blue-100 text-blue-800"
    });
  }

  // Answer badges
  if (answersCount >= 1) {
    badges.push({
      name: "Contributor",
      description: "Posted your first answer",
      color: "bg-green-100 text-green-800"
    });
  }
  if (answersCount >= 50) {
    badges.push({
      name: "Problem Solver",
      description: "Answered 50+ questions",
      color: "bg-green-100 text-green-800"
    });
  }

  // Upvote badges
  if (totalUpvotes >= 10) {
    badges.push({
      name: "Helpful",
      description: "Received 10+ upvotes",
      color: "bg-purple-100 text-purple-800"
    });
  }
  if (totalUpvotes >= 100) {
    badges.push({
      name: "Expert",
      description: "Received 100+ upvotes",
      color: "bg-purple-100 text-purple-800"
    });
  }

  // Accepted answer badges
  if (acceptedAnswers >= 1) {
    badges.push({
      name: "Solution Provider",
      description: "First accepted answer",
      color: "bg-yellow-100 text-yellow-800"
    });
  }
  if (acceptedAnswers >= 10) {
    badges.push({
      name: "Top Contributor",
      description: "10+ accepted answers",
      color: "bg-yellow-100 text-yellow-800"
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, badges, "User badges fetched successfully"));
});

// Get another user's public profile
const getPublicUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const user = await User.findById(userId).select("-password -refreshToken -email");
  
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get public stats
  const [questionsCount, answersCount, totalUpvotes] = await Promise.all([
    Question.countDocuments({ owner: userId }),
    Answer.countDocuments({ owner: userId }),
    Vote.countDocuments({ 
      answerId: { $in: await Answer.find({ owner: userId }).distinct('_id') },
      value: 1 
    })
  ]);

  const publicProfile = {
    ...user.toObject(),
    stats: {
      questionsCount,
      answersCount,
      totalUpvotes
    }
  };

  return res
    .status(200)
    .json(new ApiResponse(200, publicProfile, "Public profile fetched successfully"));
});

export {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  getUserQuestions,
  getUserAnswers,
  getUserStats,
  getUserBadges,
  getPublicUserProfile
};
