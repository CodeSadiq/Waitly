
import Admin from "../models/Admin.js";

/**
 * Seeds a default Admin user from environment variables
 * Is safe to run on every startup (checks if exists first)
 */
export const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminUsername = process.env.ADMIN_USERNAME || "SuperAdmin";

        if (!adminEmail || !adminPassword) {
            console.log("⚠️ [SEED] Skipped: ADMIN_EMAIL or ADMIN_PASSWORD missing in .env");
            return;
        }

        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (existingAdmin) {
            if (existingAdmin.username !== adminUsername) {
                existingAdmin.username = adminUsername;
                await existingAdmin.save();
                console.log(`✅ [SEED] Updated existing admin username to: ${adminUsername}`);
            } else {
                console.log(`ℹ️ [SEED] Admin account verified: ${adminEmail} (${existingAdmin.username})`);
            }
            return;
        }

        // Create new admin
        // Note: Admin schema pre-save hook will hash the password
        const newAdmin = new Admin({
            username: adminUsername,
            email: adminEmail,
            password: adminPassword
        });

        await newAdmin.save();
        console.log(`✅ [SEED] Super Admin created: ${adminUsername} <${adminEmail}>`);

    } catch (err) {
        console.error("❌ [SEED] Failed to seed admin:", err.message);
    }
};
