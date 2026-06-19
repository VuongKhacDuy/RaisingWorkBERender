const jwt = require("jsonwebtoken");
const User = require("../models/Auth/user");

const secretKey = process.env.JWT_SECRET || "default_secret_key";

async function userHasPremiumAccess(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.userId).select("isPremium premiumExpiresAt role");
    if (!user) return false;
    if (user.role === "admin") return true;
    return Boolean(user.isPremium && (user.premiumExpiresAt === null || user.premiumExpiresAt > new Date()));
  } catch {
    return false;
  }
}

module.exports = { userHasPremiumAccess };
