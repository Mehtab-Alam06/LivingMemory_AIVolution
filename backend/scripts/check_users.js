require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [];
  const users = await User.find({ email: { $in: adminEmails } });
  console.log("DB Users:");
  console.log(users);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
