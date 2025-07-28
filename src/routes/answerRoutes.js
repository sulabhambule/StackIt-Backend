import { Router } from "express";
import {
  submitAnswer,
  voteAnswer,
  acceptAnswer,
  updateAnswer,
  deleteAnswer,
  getUserAnswers,
  getUserVoteStatus,
} from "../controllers/answerController.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/user/:userId").get(getUserAnswers); // Get user's answers

// Protected routes (require authentication)
router.route("/question/:questionId").post(verifyJWT, submitAnswer); // Submit answer to question
router.route("/:answerId/vote").post(verifyJWT, voteAnswer); // Vote on answer
router.route("/:answerId/accept").patch(verifyJWT, acceptAnswer); // Accept answer
router.route("/:answerId").patch(verifyJWT, updateAnswer); // Update answer
router.route("/:answerId").delete(verifyJWT, deleteAnswer); // Delete answer
router.route("/:answerId/vote-status").get(verifyJWT, getUserVoteStatus); // Get user vote status

export default router;
