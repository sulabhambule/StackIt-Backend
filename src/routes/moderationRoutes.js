import { Router } from 'express';
import {
  getAdminDashboard,
  getAllReports,
  submitReport,
  reviewReport
} from '../controllers/moderationController.js';
import verifyJWT from '../middlewares/auth.middleware.js';
import verifyRole from '../middlewares/roleMiddleware.js';

const router = Router();

// Public routes (authenticated users can report)
router.post('/reports', verifyJWT, submitReport);

// Admin-only routes
router.use(verifyJWT, verifyRole(['admin']));

router.get('/dashboard', getAdminDashboard);
router.get('/reports', getAllReports);
router.patch('/reports/:reportId/review', reviewReport);

export default router;
