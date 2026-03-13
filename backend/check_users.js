require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find({ email: { $in: ['mehtab2023@gift.edu.in', 'livingmemory104@gmail.com', 'satpathyrajkishore777@gmail.com'] } });
  console.log("DB Users:");
  console.log(users);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
