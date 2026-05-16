import mongoose, { Schema, Document, Model } from 'mongoose';

export type LeaveStatus = 'QR_PENDING' | 'PL_PENDING' | 'APPROVED' | 'REJECTED';

export interface IApprovalLog {
  role: 'QUALITY_REVIEWER' | 'PROJECT_LEAD';
  reviewerId: mongoose.Types.ObjectId;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
  at: Date;
}

export interface ILeaveRequest extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  qrReviewerId?: mongoose.Types.ObjectId;
  qrDecisionAt?: Date;
  plReviewerId?: mongoose.Types.ObjectId;
  plDecisionAt?: Date;
  reviewNote?: string;
  approvalHistory: IApprovalLog[];
  createdAt: Date;
}

const ApprovalLogSchema = new Schema<IApprovalLog>(
  {
    role: { type: String, enum: ['QUALITY_REVIEWER', 'PROJECT_LEAD'], required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    decision: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
    note: { type: String },
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['SICK', 'PERSONAL', 'ANNUAL', 'EMERGENCY'] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['QR_PENDING', 'PL_PENDING', 'APPROVED', 'REJECTED'], default: 'QR_PENDING' },
    qrReviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    qrDecisionAt: { type: Date },
    plReviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    plDecisionAt: { type: Date },
    reviewNote: { type: String },
    approvalHistory: { type: [ApprovalLogSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LeaveRequestSchema.index({ userId: 1 });
LeaveRequestSchema.index({ status: 1 });

const LeaveRequest: Model<ILeaveRequest> = mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
export default LeaveRequest;
