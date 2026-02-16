import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    /* =====================
       PLACE
       ===================== */
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true,
      index: true
    },

    /* =====================
       COUNTER & SERVICE
       ===================== */
    counterName: {
      type: String,
      required: true
    },

    // 🔥 NEW: Service Category Concept
    category: {
      type: String, // e.g. "general", "express"
      default: "general"
    },

    // 🔥 NEW: Ticket Type
    type: {
      type: String,
      enum: ["Slot", "Walk-in"],
      default: "Walk-in"
    },

    /* =====================
       USER (OWNER)
       ===================== */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    userName: {
      type: String,
      required: true,
      trim: true
    },

    userDob: Date,

    /* =====================
       SCHEDULING
       ===================== */
    scheduledTime: {
      type: Date,
      default: null, // If null, it's a walk-in
      index: true
    },

    timeSlotLabel: String, // e.g., "10:00 AM - 10:15 AM"

    /* =====================
       STAFF ASSIGNMENT
       ===================== */
    servedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null
    },

    /* =====================
       TOKEN DETAILS
       ===================== */
    tokenCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    status: {
      type: String,
      enum: ["Waiting", "Serving", "Completed", "Skipped", "Cancelled", "Expired"],
      default: "Waiting",
      index: true
    },

    /* =====================
       TIME
       ===================== */
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    // 🔥 NEW: Verification Timestamp
    verifiedAt: Date, // When they arrive/check-in (or mapped to createdAt for now)

    servingStartedAt: Date,
    completedAt: Date,

    /* =====================
       METRICS
       ===================== */
    serviceDuration: Number // Minutes
  },
  { versionKey: false }
);

export default mongoose.model("Token", tokenSchema);
