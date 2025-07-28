import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  getUserQuestions,
  getUserAnswers,
  getUserStats,
  getUserBadges,
  getPublicUserProfile,
} from "../controllers/userController.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Protected routes (require authentication)
router.route("/profile").get(verifyJWT, getUserProfile);
router.route("/profile").patch(verifyJWT, updateUserProfile);
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/questions").get(verifyJWT, getUserQuestions);
router.route("/answers").get(verifyJWT, getUserAnswers);
router.route("/stats").get(verifyJWT, getUserStats);
router.route("/badges").get(verifyJWT, getUserBadges);

// Public routes
router.route("/:userId/public").get(getPublicUserProfile);

export default router;
