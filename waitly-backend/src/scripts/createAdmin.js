import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

// Load environment variables
dotenv.config();

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@waitly.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Waitly2026';

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists!');
            console.log('Email:', existingAdmin.email);

            // Update password if needed
            console.log('\n🔄 Updating admin password...');
            existingAdmin.password = adminPassword;
            await existingAdmin.save();
            console.log('✅ Admin password updated successfully!');
        } else {
            // Create new admin
            console.log('📝 Creating new admin user...');
            const admin = await Admin.create({
                email: adminEmail,
                password: adminPassword,
                username: 'admin'
            });
            console.log('✅ Admin user created successfully!');
            console.log('Email:', admin.email);
        }

        console.log('\n🎉 Admin setup complete!');
        console.log('═══════════════════════════════════════');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        console.log('═══════════════════════════════════════');
        console.log('\nYou can now login at the admin portal.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
};

createAdminUser();
