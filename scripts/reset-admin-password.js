// Script to reset admin password
// Run with: node scripts/reset-admin-password.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const AdminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function resetAdminPassword() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!\n');

    // Find all admins
    const admins = await Admin.find({});
    
    if (admins.length === 0) {
      console.log('No admins found in database.');
      process.exit(0);
    }

    console.log('Found admins:');
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Email: ${admin.email} | Name: ${admin.name} | Role: ${admin.role}`);
    });

    // Reset password for super_admin
    const superAdmin = admins.find(a => a.role === 'super_admin');
    
    if (superAdmin) {
      const newPassword = 'Admin@123'; // Change this to your desired password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      superAdmin.password = hashedPassword;
      await superAdmin.save();
      
      console.log('\n✅ Password reset successful!');
      console.log('-----------------------------------');
      console.log('Email:', superAdmin.email);
      console.log('New Password:', newPassword);
      console.log('-----------------------------------');
      console.log('\nYou can now login at /admin/login');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();
