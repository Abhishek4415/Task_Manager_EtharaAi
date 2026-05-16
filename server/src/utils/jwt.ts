import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  role: string;
  projectLeadId?: string;
  qualityReviewerId?: string;
}

export const signToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not defined');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not defined');
  return jwt.verify(token, secret) as JwtPayload;
};
