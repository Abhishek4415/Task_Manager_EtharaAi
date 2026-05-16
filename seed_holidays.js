const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './server/.env' });

const HolidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true, unique: true },
  type: { type: String, enum: ['FESTIVAL', 'CUSTOM'], default: 'FESTIVAL' },
  description: { type: String },
});

const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const samples = [
      { name: 'Buddha Purnima', date: new Date('2026-05-20'), type: 'FESTIVAL' },
      { name: 'Eid-ul-Fitr', date: new Date('2026-05-26'), type: 'CUSTOM' },
      { name: 'New Year', date: new Date('2026-01-01'), type: 'FESTIVAL' },
      { name: 'Independence Day', date: new Date('2026-08-15'), type: 'FESTIVAL' },
      { name: 'Republic Day', date: new Date('2026-01-26'), type: 'FESTIVAL' },
    ];

    for (const s of samples) {
      await Holiday.findOneAndUpdate({ date: s.date }, s, { upsert: true });
      console.log(`Seeded: ${s.name}`);
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();

