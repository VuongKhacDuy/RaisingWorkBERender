const ContentPackage = require("../models/ContentPackageModel");
const User = require("../models/Auth/user");

// ─────────────────────────────────────────────
// GET /api/content/catalog   (public — no auth)
// Returns all content packages sorted by sortOrder
// ─────────────────────────────────────────────
const getCatalog = async (req, res) => {
  try {
    const packages = await ContentPackage.find()
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    // Map _id → id string so iOS Codable can decode it
    const mapped = packages.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      description: p.description,
      coverImage: p.coverImage ?? null,
      type: p.type,
      accessLevel: p.accessLevel,
      isPreview: p.isPreview,
    }));

    return res.status(200).json({ data: mapped });
  } catch (error) {
    console.error("[getCatalog] Error:", error);
    return res.status(500).json({ message: "Failed to fetch catalog" });
  }
};

// ─────────────────────────────────────────────
// POST /api/iap/apple/transactions   (auth required)
// Body: { signedTransaction: string }
// Records the purchase and marks user as premium
// NOTE: In production, verify the transaction with Apple's API.
// ─────────────────────────────────────────────
const verifyAppleTransaction = async (req, res) => {
  try {
    const userId = req.userId; // set by authenticate middleware
    const { signedTransaction } = req.body;

    if (!signedTransaction) {
      return res
        .status(400)
        .json({ message: "signedTransaction is required" });
    }

    // ── Production TODO ──────────────────────────────────────────────────────
    // Verify the signed transaction with Apple's App Store Server API:
    // https://developer.apple.com/documentation/appstoreserverapi
    // const appleResult = await verifyWithApple(signedTransaction);
    // if (!appleResult.valid) return res.status(402).json({ message: "Invalid transaction" });
    // ────────────────────────────────────────────────────────────────────────

    // Grant premium for 1 month (adjust based on actual product duration)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await User.findByIdAndUpdate(userId, {
      isPremium: true,
      premiumExpiresAt: expiresAt,
    });

    console.log(
      `[verifyAppleTransaction] Granted premium to user ${userId} until ${expiresAt}`
    );

    return res.status(200).json({
      message: "Premium activated",
      isPremium: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[verifyAppleTransaction] Error:", error);
    return res.status(500).json({ message: "Failed to verify transaction" });
  }
};

// ─────────────────────────────────────────────
// GET /api/users/me/entitlements   (auth required)
// Returns current premium status for the logged-in user
// ─────────────────────────────────────────────
const getEntitlements = async (req, res) => {
  try {
    const userId = req.userId; // set by authenticate middleware

    const user = await User.findById(userId).select(
      "isPremium premiumExpiresAt role"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Admin accounts get permanent premium access
    if (user.role === "admin") {
      return res.status(200).json({
        premium: true,
        expirationDate: null,
      });
    }

    // Auto-expire: if premiumExpiresAt is in the past, revoke
    const now = new Date();
    const isStillPremium =
      user.isPremium &&
      (user.premiumExpiresAt === null || user.premiumExpiresAt > now);

    if (user.isPremium && !isStillPremium) {
      // Revoke expired premium silently
      await User.findByIdAndUpdate(userId, {
        isPremium: false,
        premiumExpiresAt: null,
      });
    }

    return res.status(200).json({
      premium: isStillPremium,
      expirationDate: isStillPremium ? user.premiumExpiresAt?.toISOString() ?? null : null,
    });
  } catch (error) {
    console.error("[getEntitlements] Error:", error);
    return res.status(500).json({ message: "Failed to fetch entitlements" });
  }
};

module.exports = {
  getCatalog,
  verifyAppleTransaction,
  getEntitlements,
};
