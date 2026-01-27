import mongoose from "mongoose";
import dotenv from "dotenv";
import { getPendingStaffRequests } from "./src/controllers/waitlyAdminController.js";

dotenv.config();

async function testController() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected");

    const req = {};
    const res = {
        json: (data) => {
            console.log("Response Data:", JSON.stringify(data, null, 2));
            process.exit(0);
        },
        status: (code) => ({
            json: (data) => {
                console.error("Error Response:", code, data);
                process.exit(1);
            }
        })
    };

    await getPendingStaffRequests(req, res);
}

testController();
