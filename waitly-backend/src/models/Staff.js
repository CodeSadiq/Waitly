import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const staffSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"]
  },
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Place",
    default: null // Optional until approved
  },
  status: {
    type: String,
    enum: ["unassigned", "applied", "active", "rejected"],
    default: "unassigned"
  },
  application: {
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
    appliedAt: Date,
    fullName: String,
    staffId: String,
    designation: String,
    counterName: String
  },
  requestDetails: {
    placeName: String,
    address: String,
    counters: [String]
  },
  lastLogin: Date
}, { timestamps: true });

/* 🔐 HASH PASSWORD */
staffSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  try {
    this.password = await bcrypt.hash(this.password, 10);
  } catch (error) {
    throw error;
  }
});

/* ✅ COMPARE PASSWORD */
staffSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

/* 🔄 GENERATE PASSWORD RESET TOKEN */
staffSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour

  return resetToken;
};

/* 📊 REMOVE SENSITIVE DATA FROM JSON */
staffSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export default mongoose.model("Staff", staffSchema);
