import jwt from "jsonwebtoken";

/* ================= CREATE ACCESS TOKEN ================= */
export const createAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d" // 7 days
  });
};

/* ================= CREATE REFRESH TOKEN ================= */
export const createRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: "30d" // 30 days
  });
};

/* ================= VERIFY TOKEN ================= */
export const verifyToken = (token, isRefreshToken = false) => {
  try {
    const secret = isRefreshToken
      ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
      : process.env.JWT_SECRET;

    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

/* ================= DECODE TOKEN (WITHOUT VERIFICATION) ================= */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/* ================= LEGACY SUPPORT ================= */
export const createToken = createAccessToken;
