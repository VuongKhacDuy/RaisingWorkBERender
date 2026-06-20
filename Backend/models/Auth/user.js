const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  verified: {
    type: Boolean,
    default: false,
  },

  verificationToken: String,
  profileImage: String,

  userDescription: {
    type: String,
    default: null,
  },

  connection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  connectionRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  sentConnectRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],

  createAt: {
    type: Date,
    default: Date.now,
  },

  isPremium: {
    type: Boolean,
    default: false,
  },

  premiumExpiresAt: {
    type: Date,
    default: null,
  },

  // "user" | "admin" — admin gets permanent premium access
  role: {
    type: String,
    enum: ["user", "admin", "tester"],
    default: "user",
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
