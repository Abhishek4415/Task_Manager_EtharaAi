import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHoliday extends Document {
  name: string;
  date: Date;
  type: 'FESTIVAL' | 'CUSTOM';
  description?: string;
}

const HolidaySchema = new Schema<IHoliday>({
  name: { type: String, required: true },
  date: { type: Date, required: true, unique: true },
  type: { type: String, enum: ['FESTIVAL', 'CUSTOM'], default: 'FESTIVAL' },
  description: { type: String },
});

const Holiday: Model<IHoliday> = mongoose.model<IHoliday>('Holiday', HolidaySchema);
export default Holiday;
