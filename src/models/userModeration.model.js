import mongoose from "mongoose";

const userModerationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Moderation history
    warnings: [
      {
        reason: String,
        description: String,
        issuedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        issuedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Suspension history
    suspensions: [
      {
        reason: String,
        duration: Number, // in days
        startDate: Date,
        endDate: Date,
        issuedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Current status
    status: {
      type: String,
      enum: ["active", "warned", "suspended", "banned"],
      default: "active",
    },

    // Ban information
    bannedAt: Date,
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    banReason: String,

    // Trust score (0-100)
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },

    // Content statistics
    stats: {
      totalReports: {
        type: Number,
        default: 0,
      },
      validReports: {
        type: Number,
        default: 0,
      },
      contentRemoved: {
        type: Number,
        default: 0,
      },
      lastReportedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userModerationSchema.index({ userId: 1 });
userModerationSchema.index({ status: 1 });
userModerationSchema.index({ trustScore: 1 });

const UserModeration = mongoose.model("UserModeration", userModerationSchema);
export default UserModeration;
