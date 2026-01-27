import mongoose from "mongoose";
import dotenv from "dotenv";
import Staff from "./src/models/Staff.js";
import Place from "./src/models/Place.js";

dotenv.config();

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const staff = await Staff.find({});
    console.log("Total Staff:", staff.length);
    staff.forEach(s => {
        console.log(`- ${s.username}: status=${s.status}, application=${JSON.stringify(s.application)}`);
    });

    process.exit(0);
}

debug();
