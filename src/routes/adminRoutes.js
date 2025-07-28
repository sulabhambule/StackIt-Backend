import express from 'express';
import { makeUserAdmin } from '../controllers/adminController.js';

const router = express.Router();

// Test route to make user admin
router.post('/make-admin', makeUserAdmin);

export default router;
