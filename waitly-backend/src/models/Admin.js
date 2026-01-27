import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"]
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date
}, { timestamps: true });

/* 🔐 HASH PASSWORD */
adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  try {
    this.password = await bcrypt.hash(this.password, 10);
  } catch (error) {
    throw error;
  }
});

/* ✅ COMPARE PASSWORD */
adminSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

/* 🔄 GENERATE PASSWORD RESET TOKEN */
adminSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour

  return resetToken;
};

/* 📊 REMOVE SENSITIVE DATA FROM JSON */
adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export default mongoose.model("Admin", adminSchema);
