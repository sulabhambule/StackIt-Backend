import express from "express";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createTestNotification
} from "../controllers/notificationController.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

// All notification routes require authentication
router.use(verifyJWT);

// Get user notifications
router.get("/", getUserNotifications);

// Get unread notification count
router.get("/unread-count", getUnreadCount);

// Mark notification as read
router.patch("/:notificationId/read", markAsRead);

// Mark all notifications as read
router.patch("/mark-all-read", markAllAsRead);

// Test route for creating notifications (for debugging)
router.post("/test", createTestNotification);

export default router;
