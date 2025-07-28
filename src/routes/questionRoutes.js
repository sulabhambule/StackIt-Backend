import { Router } from "express";
import {
  submitQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getUserQuestions,
  getTrendingQuestions,
  getTags,
} from "../controllers/questionController.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllQuestions); // Get all questions with filtering/pagination
router.route("/trending").get(getTrendingQuestions); // Get trending questions
router.route("/tags").get(getTags); // Get available tags
router.route("/:questionId").get(getQuestionById); // Get single question with answers
router.route("/user/:userId").get(getUserQuestions); // Get user's questions

// Protected routes (require authentication)
router.route("/").post(verifyJWT, submitQuestion); // Submit new question
router.route("/:questionId").patch(verifyJWT, updateQuestion); // Update question
router.route("/:questionId").delete(verifyJWT, deleteQuestion); // Delete question

export default router;
