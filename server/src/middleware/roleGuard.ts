import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRole = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, data: null, message: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        data: null,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
      return;
    }
    next();
  };

export const requirePL = requireRole('PROJECT_LEAD');
export const requirePLorQR = requireRole('PROJECT_LEAD', 'QUALITY_REVIEWER');
export const requireTasker = requireRole('TASKER');
