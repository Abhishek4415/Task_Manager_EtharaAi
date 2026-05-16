const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

console.log('URI:', process.env.MONGODB_URI ? 'Exists' : 'Missing');

async function check() {
  try {
    console.log('Connecting...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');
    const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', new mongoose.Schema({ date: Date, name: String }));
    const all = await Holiday.find();
    console.log('Count:', all.length);
    console.log('Data:', JSON.stringify(all));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
check();
