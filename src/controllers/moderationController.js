import Report from '../models/report.model.js';
import User from '../models/User.js';
import Question from '../models/questions.model.js';
import Answer from '../models/answer.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Get admin dashboard overview
const getAdminDashboard = asyncHandler(async (req, res) => {
  const [pendingReports, totalReports] = await Promise.all([
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments()
  ]);

  const recentReports = await Report.find({ status: 'pending' })
    .populate('reportedBy', 'name email')
    .populate('contentOwner', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);

  // Add target content for recent reports
  const recentReportsWithContent = await Promise.all(
    recentReports.map(async (report) => {
      let targetContent = null;
      
      try {
        if (report.reportType === 'question') {
          targetContent = await Question.findById(report.targetId).select('title description');
        } else if (report.reportType === 'answer') {
          targetContent = await Answer.findById(report.targetId)
            .select('content')
            .populate('question', 'title');
        }
      } catch (error) {
        console.error(`Error fetching content for recent report ${report._id}:`, error);
        targetContent = null;
      }

      const reportObj = report.toObject();
      reportObj.targetContent = targetContent;
      return reportObj;
    })
  );

  const overview = {
    pendingReports,
    totalReports,
    recentReports: recentReportsWithContent
  };

  res.status(200).json(
    new ApiResponse(200, overview, "Admin dashboard data fetched successfully")
  );
});

// Get all reports
const getAllReports = asyncHandler(async (req, res) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;

  const filter = status === 'all' ? {} : { status };
  const skip = (page - 1) * limit;

  const [reports, totalCount] = await Promise.all([
    Report.find(filter)
      .populate('reportedBy', 'name email')
      .populate('contentOwner', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Report.countDocuments(filter)
  ]);

  // Get the actual content for each report and add it to the response
  const reportsWithContent = await Promise.all(
    reports.map(async (report) => {
      let targetContent = null;
      
      try {
        if (report.reportType === 'question') {
          targetContent = await Question.findById(report.targetId).select('title description');
        } else if (report.reportType === 'answer') {
          targetContent = await Answer.findById(report.targetId)
            .select('content')
            .populate('question', 'title');
        }
      } catch (error) {
        console.error(`Error fetching content for report ${report._id}:`, error);
        targetContent = null;
      }

      // Convert to plain object and add content
      const reportObj = report.toObject();
      reportObj.targetContent = targetContent;
      return reportObj;
    })
  );

  const pagination = {
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalCount / limit),
    totalCount
  };

  res.status(200).json(
    new ApiResponse(200, { reports: reportsWithContent, pagination }, "Reports fetched successfully")
  );
});

// Submit a report
const submitReport = asyncHandler(async (req, res) => {
  const { reportType, targetId, reason, description } = req.body;

  // Validate target exists and get content owner
  let targetContent;
  let contentOwner;

  if (reportType === 'question') {
    targetContent = await Question.findById(targetId).populate('owner');
    if (!targetContent) {
      throw new ApiError(404, "Question not found");
    }
    contentOwner = targetContent.owner._id;
  } else if (reportType === 'answer') {
    targetContent = await Answer.findById(targetId).populate('owner');
    if (!targetContent) {
      throw new ApiError(404, "Answer not found");
    }
    contentOwner = targetContent.owner._id;
  } else {
    throw new ApiError(400, "Invalid report type");
  }

  // Check if user already reported this content
  const existingReport = await Report.findOne({
    reportType,
    targetId,
    reportedBy: req.user._id,
    status: 'pending'
  });

  if (existingReport) {
    throw new ApiError(400, "You have already reported this content");
  }

  const report = await Report.create({
    reportType,
    targetId,
    reportedBy: req.user._id,
    contentOwner,
    reason,
    description
  });

  res.status(201).json(
    new ApiResponse(201, report, "Report submitted successfully")
  );
});

// Admin review report
const reviewReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { action } = req.body; // 'dismiss', 'delete_content', 'ban_user'

  const report = await Report.findById(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  if (report.status !== 'pending') {
    throw new ApiError(400, "Report already reviewed");
  }

  // Update report
  report.status = 'resolved';
  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();
  report.adminAction = action;

  // Execute admin action
  if (action === 'content_deleted') {
    if (report.reportType === 'question') {
      await Question.findByIdAndDelete(report.targetId);
    } else if (report.reportType === 'answer') {
      await Answer.findByIdAndDelete(report.targetId);
    }
  } else if (action === 'user_banned') {
    await User.findByIdAndUpdate(report.contentOwner, { 
      status: 'banned',
      bannedAt: new Date(),
      bannedBy: req.user._id 
    });
  }

  await report.save();

  res.status(200).json(
    new ApiResponse(200, report, "Report reviewed successfully")
  );
});

export {
  getAdminDashboard,
  getAllReports,
  submitReport,
  reviewReport
};
