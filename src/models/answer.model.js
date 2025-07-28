import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true }, // rich text HTML
    votes: { type: Number, default: 0 },
    isAccepted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Answer = mongoose.model("Answer", answerSchema);

export default Answer;
