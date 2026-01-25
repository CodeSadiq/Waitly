import jwt from "jsonwebtoken";

// ✅ FOR LOGIN / AUTH ONLY
export const generateAuthToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};
