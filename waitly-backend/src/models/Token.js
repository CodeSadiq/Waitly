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
       COUNTER
       ===================== */
    counterName: {
      type: String,
      required: true
    },

    /* =====================
       USER (OWNER)
       ===================== */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,          // 🔥 IMPORTANT
      index: true
    },

    userName: {
      type: String,
      required: true,
      trim: true
    },

    userDob: Date,

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
      enum: ["Waiting", "Serving", "Completed", "Skipped"],
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

    servingStartedAt: Date,
    completedAt: Date,

    /* =====================
       METRICS
       ===================== */
    serviceDuration: Number
  },
  { versionKey: false }
);

export default mongoose.model("Token", tokenSchema);
