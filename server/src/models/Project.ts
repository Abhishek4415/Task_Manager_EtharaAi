import mongoose, { Schema, Document, Model } from 'mongoose';

export type TaskType = 'STEM' | 'NON_STEM';

export interface IProject extends Document {
  name: string;
  description?: string;
  taskType: TaskType;
  dailyTarget?: number;
  projectLeadId: mongoose.Types.ObjectId;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    taskType: { type: String, enum: ['STEM', 'NON_STEM'], default: 'NON_STEM' },
    dailyTarget: { type: Number, min: 0 },
    projectLeadId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'ACTIVE' },
  },
  { timestamps: true }
);

ProjectSchema.index({ projectLeadId: 1 });

const Project: Model<IProject> = mongoose.model<IProject>('Project', ProjectSchema);
export default Project;
