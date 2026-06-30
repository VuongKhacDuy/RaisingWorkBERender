const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/Auth/user");
const UserProgress = require("../models/User/UserProgressModel");
const CoinTransaction = require("../models/User/CoinTransactionModel");

const DEFAULT_TARGET_COINS = 999999;

async function setAdminCoins() {
  const email = process.argv[2];
  const targetCoinsArg = process.argv[3];
  const targetCoins = targetCoinsArg ? Number.parseInt(targetCoinsArg, 10) : DEFAULT_TARGET_COINS;

  if (!email) {
    console.error("❌ Please provide an admin email address.");
    console.log("Usage: node scripts/setAdminCoins.js <admin-email> [targetCoins]");
    console.log("Example: node scripts/setAdminCoins.js admin@example.com 999999");
    process.exit(1);
  }

  if (!Number.isFinite(targetCoins) || targetCoins < 0) {
    console.error("❌ targetCoins must be a non-negative number.");
    process.exit(1);
  }

  try {
    const MONGO_URL =
      process.env.MONGO_URL ||
      "mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise";

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    if (user.role !== "admin") {
      console.error(`❌ User ${email} is not an admin. Run makeAdmin.js first if this is intentional.`);
      process.exit(1);
    }

    let progress = await UserProgress.findOne({ userId: user._id });
    if (!progress) {
      progress = new UserProgress({ userId: user._id });
    }

    const previousCoins = progress.totalCoins || 0;
    const delta = targetCoins - previousCoins;

    progress.totalCoins = targetCoins;
    await progress.save();

    if (delta !== 0) {
      await CoinTransaction.create({
        userId: user._id,
        amount: delta,
        type: delta > 0 ? "EARN" : "SPEND",
        source: "admin_tool",
        description: `Admin coin balance set to ${targetCoins}`,
        balanceAfter: targetCoins,
      });
    }

    console.log(`\n🎉 Success! ${user.name} (${user.email}) now has ${targetCoins} coins.`);
    console.log(`Previous balance: ${previousCoins}`);
    console.log(`Delta recorded: ${delta}\n`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting admin coins:", error);
    process.exit(1);
  }
}

setAdminCoins();
