const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });
console.log('Connecting to URI:', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected! DB Name:', mongoose.connection.name);
  const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}), 'users');
  const Project = mongoose.model('Project', new mongoose.Schema({}, {strict: false}), 'projects');
  const TodoSession = mongoose.model('TodoSession', new mongoose.Schema({}, {strict: false}), 'todosessions');
  
  const users = await User.find().select('fullName role');
  const projects = await Project.find().select('name');
  const sessions = await TodoSession.find().select('title');
  
  console.log('Users:', users);
  console.log('Projects:', projects);
  console.log('Sessions:', sessions);
  process.exit(0);
}).catch(err => {
  console.error('Connection Error:', err);
  process.exit(1);
});
