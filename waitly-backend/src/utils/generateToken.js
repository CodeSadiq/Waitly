export function generateTokenCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";

  for (let i = 0; i < 6; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }

  return token;
}
