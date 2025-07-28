import Question from "../models/questions.model.js";
import Answer from "../models/answer.model.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// Submit a new question
const submitQuestion = asyncHandler(async (req, res) => {
  const { title, description, tags } = req.body;
  const userId = req.user._id;

  // Validation
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    throw new ApiError(400, "At least one tag is required");
  }

  // Validate and clean tags
  const cleanedTags = tags
    .map(tag => typeof tag === 'string' ? tag.trim() : '')
    .filter(tag => tag.length > 0)
    .slice(0, 5); // Limit to 5 tags

  if (cleanedTags.length === 0) {
    throw new ApiError(400, "At least one valid tag is required");
  }

  // Create question
  const question = await Question.create({
    title: title.trim(),
    description: description.trim(),
    tags: cleanedTags,
    owner: userId,
  });

  // Populate owner details
  const populatedQuestion = await Question.findById(question._id)
    .populate("owner", "name email avatar")
    .lean();

  return res
    .status(201)
    .json(
      new ApiResponse(201, populatedQuestion, "Question submitted successfully")
    );
});

// Get all questions with pagination, sorting, and filtering
const getAllQuestions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    search = "",
    tags = "",
  } = req.query;

  // Build filter query
  const filter = {};
  
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  
  if (tags) {
    // Handle tags as array - check if any tag in the array matches
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    if (tagArray.length > 0) {
      filter.tags = { $in: tagArray.map(tag => new RegExp(tag, 'i')) };
    }
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  // Aggregation pipeline to get questions with answer count
  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: "answers",
        localField: "_id",
        foreignField: "questionId",
        as: "answers",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          { $project: { name: 1, email: 1, avatar: 1 } }
        ]
      },
    },
    {
      $addFields: {
        answerCount: { $size: "$answers" },
        owner: { $arrayElemAt: ["$owner", 0] },
        hasAcceptedAnswer: {
          $anyElementTrue: {
            $map: {
              input: "$answers",
              as: "answer",
              in: "$$answer.isAccepted",
            },
          },
        },
      },
    },
    { $project: { answers: 0 } }, // Remove answers array from response
    { $sort: sortOptions },
    { $skip: skip },
    { $limit: parseInt(limit) },
  ];

  // Execute aggregation
  const questions = await Question.aggregate(pipeline);

  // Get total count for pagination
  const totalQuestions = await Question.countDocuments(filter);
  const totalPages = Math.ceil(totalQuestions / parseInt(limit));

  const paginationData = {
    questions,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalQuestions,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, paginationData, "Questions fetched successfully")
    );
});

// Get single question with answers
const getQuestionById = asyncHandler(async (req, res) => {
  const { questionId } = req.params;

  if (!mongoose.isValidObjectId(questionId)) {
    throw new ApiError(400, "Invalid question ID");
  }

  // Increment view count
  await Question.findByIdAndUpdate(questionId, { $inc: { views: 1 } });

  // Get question with owner details
  const question = await Question.findById(questionId)
    .populate("owner", "name email avatar")
    .lean();

  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  // Get answers with owner details and vote counts
  const answers = await Answer.aggregate([
    { $match: { questionId: new mongoose.Types.ObjectId(questionId) } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          { $project: { name: 1, email: 1, avatar: 1 } }
        ]
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    { $sort: { isAccepted: -1, votes: -1, createdAt: 1 } }, // Accepted answers first, then by votes
  ]);

  const questionWithAnswers = {
    ...question,
    answers,
    answerCount: answers.length,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, questionWithAnswers, "Question fetched successfully")
    );
});

// Update question (only by owner)
const updateQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const { title, description, tags } = req.body;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(questionId)) {
    throw new ApiError(400, "Invalid question ID");
  }

  // Find question and check ownership
  const question = await Question.findById(questionId);
  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  if (question.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only edit your own questions");
  }

  // Validate input
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  // Handle tags - can be array or comma-separated string
  let processedTags = [];
  if (Array.isArray(tags)) {
    processedTags = tags.map(tag => String(tag).trim()).filter(tag => tag);
  } else if (typeof tags === 'string') {
    processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }

  if (processedTags.length === 0) {
    throw new ApiError(400, "At least one tag is required");
  }

  // Update question
  const updatedQuestion = await Question.findByIdAndUpdate(
    questionId,
    {
      $set: {
        title: title.trim(),
        description: description.trim(),
        tags: processedTags, // Use the processed tags array
      },
    },
    { new: true }
  ).populate("owner", "name email avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedQuestion, "Question updated successfully")
    );
});

// Delete question (only by owner)
const deleteQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(questionId)) {
    throw new ApiError(400, "Invalid question ID");
  }

  // Find question and check ownership
  const question = await Question.findById(questionId);
  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  if (question.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only delete your own questions");
  }

  // Delete associated answers first
  await Answer.deleteMany({ questionId });

  // Delete question
  await Question.findByIdAndDelete(questionId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Question deleted successfully"));
});

// Get questions by user (user's profile questions)
const getUserQuestions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get user's questions with answer count
  const pipeline = [
    { $match: { owner: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "answers",
        localField: "_id",
        foreignField: "questionId",
        as: "answers",
      },
    },
    {
      $addFields: {
        answerCount: { $size: "$answers" },
        hasAcceptedAnswer: {
          $anyElementTrue: {
            $map: {
              input: "$answers",
              as: "answer",
              in: "$$answer.isAccepted",
            },
          },
        },
      },
    },
    { $project: { answers: 0 } },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: parseInt(limit) },
  ];

  const questions = await Question.aggregate(pipeline);

  // Get total count
  const totalQuestions = await Question.countDocuments({ owner: userId });
  const totalPages = Math.ceil(totalQuestions / parseInt(limit));

  const result = {
    questions,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalQuestions,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "User questions fetched successfully"));
});

// Get trending questions (most answered in last 7 days)
const getTrendingQuestions = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const pipeline = [
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $lookup: {
        from: "answers",
        localField: "_id",
        foreignField: "questionId",
        as: "answers",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          { $project: { name: 1, avatar: 1 } }
        ]
      },
    },
    {
      $addFields: {
        answerCount: { $size: "$answers" },
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    { $project: { answers: 0 } },
    { $sort: { answerCount: -1, createdAt: -1 } },
    { $limit: parseInt(limit) },
  ];

  const trendingQuestions = await Question.aggregate(pipeline);

  return res
    .status(200)
    .json(
      new ApiResponse(200, trendingQuestions, "Trending questions fetched successfully")
    );
});

// Get popular tags
const getTags = asyncHandler(async (req, res) => {
  try {
    // Get popular tags from existing questions
    const popularTags = await Question.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, tag: "$_id", count: 1 } }
    ]);

    // Predefined common tags
    const predefinedTags = [
      "javascript", "react", "node.js", "python", "html", "css", "typescript",
      "express", "mongodb", "sql", "api", "frontend", "backend", "fullstack",
      "web-development", "mobile", "android", "ios", "flutter", "react-native",
      "vue", "angular", "next.js", "nuxt", "svelte", "jquery", "bootstrap",
      "tailwind", "sass", "webpack", "vite", "npm", "yarn", "git", "github",
      "docker", "aws", "azure", "firebase", "database", "authentication",
      "routing", "state-management", "redux", "context-api", "hooks", "components",
      "debugging", "testing", "jest", "cypress", "performance", "optimization"
    ];

    // Combine popular and predefined tags, avoid duplicates
    const existingTagNames = popularTags.map(tag => tag.tag.toLowerCase());
    const uniquePredefined = predefinedTags.filter(tag => 
      !existingTagNames.includes(tag.toLowerCase())
    );

    const allTags = [
      ...popularTags.map(tag => ({ tag: tag.tag, count: tag.count, popular: true })),
      ...uniquePredefined.map(tag => ({ tag, count: 0, popular: false }))
    ].slice(0, 100); // Limit to 100 tags

    return res
      .status(200)
      .json(new ApiResponse(200, allTags, "Tags retrieved successfully"));
  } catch (error) {
    throw new ApiError(500, "Failed to retrieve tags");
  }
});

export {
  submitQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getUserQuestions,
  getTrendingQuestions,
  getTags
};
