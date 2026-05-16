import mongoose, { Schema, Document, Model } from 'mongoose';

export type Role = 'PROJECT_LEAD' | 'QUALITY_REVIEWER' | 'TASKER';

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  role: Role;
  jobTitle?: string;
  qualityLevel?: 'QL1' | 'QL2' | 'QL3' | 'QL4';
  projectLeadId?: mongoose.Types.ObjectId;
  qualityReviewerId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['PROJECT_LEAD', 'QUALITY_REVIEWER', 'TASKER'], required: true },
    jobTitle: { type: String, trim: true },
    qualityLevel: { type: String, enum: ['QL1', 'QL2', 'QL3', 'QL4'], default: 'QL1' },
    projectLeadId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    qualityReviewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
  },
  { timestamps: true }
);

UserSchema.index({ projectLeadId: 1 });
UserSchema.index({ qualityReviewerId: 1 });

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;
