import Answer from "../models/answer.model.js";
import Question from "../models/questions.model.js";
import Vote from "../models/vote.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { createAnswerNotification, createUpvoteNotification, createAcceptedAnswerNotification } from "./notificationController.js";

// Submit an answer to a question
const submitAnswer = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const { body } = req.body;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(questionId)) {
    throw new ApiError(400, "Invalid question ID");
  }

  // Validation
  if (!body?.trim()) {
    throw new ApiError(400, "Answer body is required");
  }

  // Check if question exists
  const question = await Question.findById(questionId);
  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  // Create answer
  const answer = await Answer.create({
    questionId,
    owner: userId,
    body: body.trim(),
  });

  // Create notification for question owner
  if (question.owner.toString() !== userId.toString()) {
    await createAnswerNotification(question.owner, question, userId);
  }

  // Populate owner details
  const populatedAnswer = await Answer.findById(answer._id)
    .populate("owner", "name email avatar")
    .populate("questionId", "title")
    .lean();

  return res
    .status(201)
    .json(new ApiResponse(201, populatedAnswer, "Answer submitted successfully"));
});

// Vote on an answer (upvote or downvote)
const voteAnswer = asyncHandler(async (req, res) => {
  const { answerId } = req.params;
  const { value } = req.body; // 1 for upvote, -1 for downvote
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(answerId)) {
    throw new ApiError(400, "Invalid answer ID");
  }

  // Validate vote value
  if (![1, -1].includes(value)) {
    throw new ApiError(400, "Vote value must be 1 (upvote) or -1 (downvote)");
  }

  // Check if answer exists
  const answer = await Answer.findById(answerId);
  if (!answer) {
    throw new ApiError(404, "Answer not found");
  }

  // Check if user already voted on this answer
  const existingVote = await Vote.findOne({ answerId, userId });

  if (existingVote) {
    if (existingVote.value === value) {
      // Remove vote if same value (toggle off)
      await Vote.findByIdAndDelete(existingVote._id);
      
      // Update answer vote count
      await Answer.findByIdAndUpdate(answerId, {
        $inc: { votes: -value }
      });

      return res
        .status(200)
        .json(new ApiResponse(200, { action: "removed" }, "Vote removed successfully"));
    } else {
      // Update vote if different value
      existingVote.value = value;
      await existingVote.save();
      
      // Update answer vote count (remove old vote and add new vote)
      const difference = value - (existingVote.value === 1 ? -1 : 1);
      await Answer.findByIdAndUpdate(answerId, {
        $inc: { votes: difference }
      });

      return res
        .status(200)
        .json(new ApiResponse(200, { action: "updated", value }, "Vote updated successfully"));
    }
  } else {
    // Create new vote
    await Vote.create({ answerId, userId, value });
    
    // Update answer vote count
    await Answer.findByIdAndUpdate(answerId, {
      $inc: { votes: value }
    });

    // Create notification for upvote
    if (value === 1 && answer.owner.toString() !== userId.toString()) {
      await createUpvoteNotification(answer.owner, "answer", answer, userId);
    }

    return res
      .status(201)
      .json(new ApiResponse(201, { action: "created", value }, "Vote added successfully"));
  }
});

// Accept an answer (only question owner can do this)
const acceptAnswer = asyncHandler(async (req, res) => {
  const { answerId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(answerId)) {
    throw new ApiError(400, "Invalid answer ID");
  }

  // Get answer with question details
  const answer = await Answer.findById(answerId).populate("questionId");
  if (!answer) {
    throw new ApiError(404, "Answer not found");
  }

  // Check if user is the question owner
  if (answer.questionId.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Only the question owner can accept answers");
  }

  // Unaccept any previously accepted answer for this question
  await Answer.updateMany(
    { questionId: answer.questionId._id },
    { $set: { isAccepted: false } }
  );

  // Accept this answer
  const updatedAnswer = await Answer.findByIdAndUpdate(
    answerId,
    { $set: { isAccepted: true } },
    { new: true }
  ).populate("owner", "name email avatar");

  // Create notification for answer owner
  if (answer.owner.toString() !== userId.toString()) {
    await createAcceptedAnswerNotification(answer.owner, answer.questionId, userId);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedAnswer, "Answer accepted successfully"));
});

// Update answer (only by owner)
const updateAnswer = asyncHandler(async (req, res) => {
  const { answerId } = req.params;
  const { body } = req.body;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(answerId)) {
    throw new ApiError(400, "Invalid answer ID");
  }

  // Validation
  if (!body?.trim()) {
    throw new ApiError(400, "Answer body is required");
  }

  // Find answer and check ownership
  const answer = await Answer.findById(answerId);
  if (!answer) {
    throw new ApiError(404, "Answer not found");
  }

  if (answer.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only edit your own answers");
  }

  // Update answer
  const updatedAnswer = await Answer.findByIdAndUpdate(
    answerId,
    { $set: { body: body.trim() } },
    { new: true }
  ).populate("owner", "name email avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedAnswer, "Answer updated successfully"));
});

// Delete answer (only by owner)
const deleteAnswer = asyncHandler(async (req, res) => {
  const { answerId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(answerId)) {
    throw new ApiError(400, "Invalid answer ID");
  }

  // Find answer and check ownership
  const answer = await Answer.findById(answerId);
  if (!answer) {
    throw new ApiError(404, "Answer not found");
  }

  if (answer.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only delete your own answers");
  }

  // Delete associated votes
  await Vote.deleteMany({ answerId });

  // Delete answer
  await Answer.findByIdAndDelete(answerId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Answer deleted successfully"));
});

// Get user's answers
const getUserAnswers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get user's answers with question details
  const answers = await Answer.find({ owner: userId })
    .populate("questionId", "title")
    .populate("owner", "name email avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Get total count
  const totalAnswers = await Answer.countDocuments({ owner: userId });
  const totalPages = Math.ceil(totalAnswers / parseInt(limit));

  const result = {
    answers,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalAnswers,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "User answers fetched successfully"));
});

// Get user's vote status for an answer
const getUserVoteStatus = asyncHandler(async (req, res) => {
  const { answerId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(answerId)) {
    throw new ApiError(400, "Invalid answer ID");
  }

  const vote = await Vote.findOne({ answerId, userId });
  
  const voteStatus = {
    hasVoted: !!vote,
    voteValue: vote ? vote.value : null,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, voteStatus, "Vote status fetched successfully"));
});

export {
  submitAnswer,
  voteAnswer,
  acceptAnswer,
  updateAnswer,
  deleteAnswer,
  getUserAnswers,
  getUserVoteStatus,
};
