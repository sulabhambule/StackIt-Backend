import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Answer",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  value: { type: Number, enum: [1, -1] },
});

const Vote = mongoose.model("Vote", voteSchema);

export default Vote;
