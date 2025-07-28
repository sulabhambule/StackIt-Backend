import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    tags: [{ type: String, required: true }], // Array of strings for tags
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    views: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for better search performance
questionSchema.index({ title: "text", description: "text" });
questionSchema.index({ tags: 1 });
questionSchema.index({ createdAt: -1 });

const Question = mongoose.model("Question", questionSchema);

export default Question;
