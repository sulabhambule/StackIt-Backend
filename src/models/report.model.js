import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    // What is being reported
    reportType: {
      type: String,
      enum: ["question", "answer"],
      required: true,
    },

    // Reference to the reported content
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "reportType",
    },

    // Who reported it
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Owner of the reported content
    contentOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Simple reason for reporting
    reason: {
      type: String,
      enum: ["spam", "inappropriate", "off_topic", "other"],
      required: true,
    },

    // Additional details from reporter
    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },

    // Report status
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },

    // Admin who handled the report
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Admin action taken
    adminAction: {
      type: String,
      enum: ["dismissed", "content_deleted", "user_banned"],
    },

    // When admin reviewed
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Simple indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportType: 1 });

const Report = mongoose.model("Report", reportSchema);
export default Report;
