import Notification from "../models/notification.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// Get user notifications
const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, unreadOnly = false } = req.query;

  const skip = (page - 1) * limit;
  const query = { userId };

  if (unreadOnly === 'true') {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .populate("fromUserId", "name email avatar")
    .populate("questionId", "title")
    .populate("answerId", "body")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const totalNotifications = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });

  return res.status(200).json(
    new ApiResponse(200, {
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        hasNextPage: page * limit < totalNotifications,
        hasPrevPage: page > 1,
      },
      unreadCount
    }, "Notifications retrieved successfully")
  );
});

// Get unread notification count
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const unreadCount = await Notification.countDocuments({ 
    userId, 
    isRead: false 
  });

  return res.status(200).json(
    new ApiResponse(200, { unreadCount }, "Unread count retrieved successfully")
  );
});

// Mark notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(notificationId)) {
    throw new ApiError(400, "Invalid notification ID");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return res.status(200).json(
    new ApiResponse(200, notification, "Notification marked as read")
  );
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );

  return res.status(200).json(
    new ApiResponse(200, {}, "All notifications marked as read")
  );
});

// Create notification (helper function for internal use)
const createNotification = async ({
  userId,
  type,
  message,
  questionId = null,
  answerId = null,
  fromUserId = null
}) => {
  try {
    // Don't create notification for self
    if (userId.toString() === fromUserId?.toString()) {
      return null;
    }

    const notification = await Notification.create({
      userId,
      type,
      message,
      questionId,
      answerId,
      fromUserId
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

// Helper function to create different types of notifications
const createAnswerNotification = async (questionOwnerId, question, fromUserId) => {
  return createNotification({
    userId: questionOwnerId,
    type: "answer",
    message: `Someone answered your question "${question.title}"`,
    questionId: question._id,
    fromUserId
  });
};

const createUpvoteNotification = async (ownerId, type, item, fromUserId) => {
  const isQuestion = type === "question";
  return createNotification({
    userId: ownerId,
    type: isQuestion ? "question_upvote" : "answer_upvote",
    message: `Someone upvoted your ${isQuestion ? "question" : "answer"}`,
    questionId: isQuestion ? item._id : item.questionId,
    answerId: isQuestion ? null : item._id,
    fromUserId
  });
};

const createAcceptedAnswerNotification = async (answerOwnerId, question, fromUserId) => {
  return createNotification({
    userId: answerOwnerId,
    type: "accepted_answer",
    message: `Your answer was accepted for "${question.title}"`,
    questionId: question._id,
    fromUserId
  });
};

// Create test notification (for debugging)
const createTestNotification = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const testNotification = await createNotification({
    userId,
    type: "answer",
    message: "Test notification - Someone answered your question",
    questionId: null,
    answerId: null,
    fromUserId: null
  });

  return res.status(200).json(
    new ApiResponse(200, testNotification, "Test notification created")
  );
});

export {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  createAnswerNotification,
  createUpvoteNotification,
  createAcceptedAnswerNotification,
  createTestNotification
};
