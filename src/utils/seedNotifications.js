import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/User.js";
import Question from "../models/questions.model.js";
import { connectDB } from "../db/index.js";

const seedNotifications = async () => {
  try {
    await connectDB();
    
    // Get some users and questions for testing
    const users = await User.find().limit(5);
    const questions = await Question.find().limit(3);
    
    if (users.length < 2 || questions.length < 1) {
      console.log("Need at least 2 users and 1 question to seed notifications");
      return;
    }

    // Clear existing notifications
    await Notification.deleteMany({});
    
    const sampleNotifications = [
      {
        userId: users[0]._id,
        type: "answer",
        message: `Someone answered your question "${questions[0].title}"`,
        questionId: questions[0]._id,
        fromUserId: users[1]._id,
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      },
      {
        userId: users[0]._id,
        type: "question_upvote",
        message: "Someone upvoted your question",
        questionId: questions[0]._id,
        fromUserId: users[2] ? users[2]._id : users[1]._id,
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
      },
      {
        userId: users[1]._id,
        type: "accepted_answer",
        message: `Your answer was accepted for "${questions[0].title}"`,
        questionId: questions[0]._id,
        fromUserId: users[0]._id,
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
      },
      {
        userId: users[1]._id,
        type: "answer_upvote",
        message: "Someone upvoted your answer",
        questionId: questions[0]._id,
        fromUserId: users[0]._id,
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
      }
    ];

    await Notification.insertMany(sampleNotifications);
    console.log("✅ Sample notifications created successfully");
    
  } catch (error) {
    console.error("❌ Error seeding notifications:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedNotifications();
}

export default seedNotifications;
