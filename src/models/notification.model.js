import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["answer", "comment", "mention", "upvote", "downvote", "accepted_answer", "question_upvote", "answer_upvote", "welcome"],
    required: true,
  },
  message: { type: String, required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  answerId: { type: mongoose.Schema.Types.ObjectId, ref: "Answer" },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who triggered the notification
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
