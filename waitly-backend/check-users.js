import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./src/models/Admin.js";
import Staff from "./src/models/Staff.js";
import User from "./src/models/User.js";

dotenv.config();

async function checkAllUsers() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    console.log("\n--- ADMINS ---");
    const admins = await Admin.find({});
    admins.forEach(a => console.log(`ID: ${a._id}, Email: ${a.email}`));

    console.log("\n--- STAFF ---");
    const staff = await Staff.find({});
    staff.forEach(s => console.log(`ID: ${s._id}, Username: ${s.username}, Status: ${s.status}`));

    console.log("\n--- USERS ---");
    const users = await User.find({});
    users.forEach(u => console.log(`ID: ${u._id}, Username: ${u.username}, Role: ${u.role}`));

    process.exit(0);
}

checkAllUsers();
