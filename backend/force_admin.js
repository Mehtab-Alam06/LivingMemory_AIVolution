require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const adminEmails = ["livingmemory104@gmail.com", "mehtab2023@gift.edu.in", "satpathyrajkishore777@gmail.com"];
  const result = await User.updateMany(
    { email: { $in: adminEmails } },
    { $set: { role: 'admin' } }
  );
  console.log("Updated users:", result);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
