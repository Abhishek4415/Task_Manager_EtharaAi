import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'LEAVE_APPLIED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_ESCALATED'
  | 'TASK_ASSIGNED';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: 'LEAVE' | 'TASK' | 'SESSION';
  entityId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['LEAVE_APPLIED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_ESCALATED', 'TASK_ASSIGNED'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    entityType: { type: String, enum: ['LEAVE', 'TASK', 'SESSION'] },
    entityId: { type: Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;

