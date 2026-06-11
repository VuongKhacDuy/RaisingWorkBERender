const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/Auth/user");

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Please provide an email address.");
    console.log("Usage: node makeAdmin.js <email>");
    process.exit(1);
  }

  try {
    const MONGO_URL =
      process.env.MONGO_URL ||
      "mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise";
    
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    const user = await User.findOne({ email });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    user.role = "admin";
    await user.save();

    console.log(`\n🎉 Success! User ${user.name} (${user.email}) is now an ADMIN.`);
    console.log(`Premium access status for this user is now PERMANENT.\n`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting user to admin:", error);
    process.exit(1);
  }
}

makeAdmin();
