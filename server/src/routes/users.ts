import { Router, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Project from '../models/Project';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/project-leads (public)
router.get('/project-leads', async (_req, res: Response): Promise<void> => {
  try {
    const leads = await User.find({ role: 'PROJECT_LEAD' })
      .select('_id fullName jobTitle email')
      .lean();
    res.json({ success: true, data: leads, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/users/quality-reviewers?plId= (public)
router.get('/quality-reviewers', async (req, res: Response): Promise<void> => {
  try {
    const { plId } = req.query;
    if (!plId || !mongoose.isValidObjectId(plId)) {
      res.status(400).json({ success: false, data: null, message: 'Valid plId is required' });
      return;
    }
    const qrs = await User.find({
      role: 'QUALITY_REVIEWER',
      projectLeadId: new mongoose.Types.ObjectId(plId as string),
    })
      .select('_id fullName jobTitle email')
      .lean();
    res.json({ success: true, data: qrs, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// GET /api/users/my-team (protected)
router.get('/my-team', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, role, projectLeadId } = req.user!;

    if (role === 'PROJECT_LEAD') {
      const [taskers, qrs, projects] = await Promise.all([
        User.find({ role: 'TASKER', projectLeadId: new mongoose.Types.ObjectId(id) })
          .select('-passwordHash')
          .populate('qualityReviewerId', 'fullName email')
          .lean(),
        User.find({ role: 'QUALITY_REVIEWER', projectLeadId: new mongoose.Types.ObjectId(id) })
          .select('-passwordHash')
          .lean(),
        Project.find({ projectLeadId: new mongoose.Types.ObjectId(id) }).lean(),
      ]);
      res.json({ success: true, data: { taskers, qrs, projects }, message: 'OK' });
      return;
    }

    if (role === 'QUALITY_REVIEWER') {
      const [projectLead, taskers] = await Promise.all([
        User.findById(projectLeadId).select('-passwordHash').lean(),
        User.find({ role: 'TASKER', qualityReviewerId: new mongoose.Types.ObjectId(id) })
          .select('-passwordHash')
          .lean(),
      ]);
      res.json({ success: true, data: { projectLead, taskers }, message: 'OK' });
      return;
    }

    // TASKER
    const me = await User.findById(id)
      .populate('projectLeadId', 'fullName email jobTitle')
      .populate('qualityReviewerId', 'fullName email jobTitle')
      .select('-passwordHash')
      .lean();
    res.json({
      success: true,
      data: { projectLead: me?.projectLeadId, qualityReviewer: me?.qualityReviewerId },
      message: 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

// PATCH /api/users/:id (protected)
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { projectLeadId, qualityReviewerId, projectId, fullName, jobTitle, qualityLevel } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, data: null, message: 'User not found' });
      return;
    }

    // Permission check: only PL or QR can update their taskers
    // For simplicity, we'll allow any authenticated PL/QR for now, 
    // but in production, we should check if they actually manage this tasker.
    if (req.user!.role === 'TASKER') {
      res.status(403).json({ success: false, data: null, message: 'Permission denied' });
      return;
    }

    if (fullName) user.fullName = fullName;
    if (jobTitle) user.jobTitle = jobTitle;
    if (qualityLevel) user.qualityLevel = qualityLevel;
    if (projectLeadId) user.projectLeadId = new mongoose.Types.ObjectId(projectLeadId);
    if (qualityReviewerId) user.qualityReviewerId = new mongoose.Types.ObjectId(qualityReviewerId);
    if (projectId !== undefined) {
      user.projectId = projectId ? new mongoose.Types.ObjectId(projectId) : undefined;
    }

    await user.save();
    res.json({ success: true, data: user, message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, data: null, message: 'Server error' });
  }
});

export default router;
