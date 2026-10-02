const ContentPackage = require("../models/ContentPackageModel");
const User = require("../models/Auth/user");
const { userHasPremiumAccess } = require("../utils/premiumAccess");
const appleIap = require("../services/appleIapService");

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

const getPackageById = async (req, res) => {
  try {
    const contentPackage = await ContentPackage.findById(req.params.id).lean();
    if (!contentPackage) {
      return res.status(404).json({ message: "Content package not found" });
    }

    const hasPremium = await userHasPremiumAccess(req);
    const locked = contentPackage.accessLevel === "premium" && !contentPackage.isPreview && !hasPremium;

    return res.status(200).json({
      data: {
        id: contentPackage._id.toString(),
        title: contentPackage.title,
        description: contentPackage.description,
        coverImage: contentPackage.coverImage ?? null,
        type: contentPackage.type,
        accessLevel: contentPackage.accessLevel,
        isPreview: contentPackage.isPreview,
        locked,
      },
    });
  } catch (error) {
    console.error("[getPackageById] Error:", error);
    return res.status(500).json({ message: "Failed to fetch content package" });
  }
};

// ─────────────────────────────────────────────
// POST /api/iap/apple/transactions   (auth required)
// Body: { signedTransaction: string }  — StoreKit 2 JWS (VerificationResult.jwsRepresentation)
// Verifies the JWS with Apple's root certificates, checks it belongs to this user
// (appAccountToken) and grants premium until the real expiresDate.
// ─────────────────────────────────────────────
const verifyAppleTransaction = async (req, res) => {
  try {
    const userId = req.userId; // set by authenticate middleware
    const { signedTransaction } = req.body;

    if (!signedTransaction || typeof signedTransaction !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "signedTransaction is required" });
    }

    const payload = await appleIap.verifyTransaction(signedTransaction);

    if (!appleIap.isPremiumProduct(payload)) {
      return res.status(400).json({ success: false, message: "Unknown product" });
    }

    const expectedToken = appleIap.appAccountTokenForUser(userId);
    if (String(payload.appAccountToken || "").toLowerCase() !== expectedToken) {
      return res.status(403).json({
        success: false,
        message: "This purchase belongs to a different UUMI account",
      });
    }

    const subscription = await appleIap.recordTransaction(payload, { userId, source: "app" });
    const state = await appleIap.syncUserPremium(userId);

    if (!appleIap.isActive(subscription)) {
      return res.status(402).json({
        success: false,
        message: "Subscription is expired or refunded",
        isPremium: Boolean(state?.isPremium),
      });
    }

    console.log(
      `[verifyAppleTransaction] user ${userId} premium until ${state?.expiresAt?.toISOString()} (${payload.productId}, ${payload.environment})`
    );

    return res.status(200).json({
      success: true,
      message: "Premium activated",
      isPremium: Boolean(state?.isPremium),
      expiresAt: state?.expiresAt ? state.expiresAt.toISOString() : null,
    });
  } catch (error) {
    if (error instanceof appleIap.IapError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error("[verifyAppleTransaction] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify transaction" });
  }
};

// ─────────────────────────────────────────────
// POST /api/iap/apple/notifications   (public — called by Apple)
// App Store Server Notifications V2. Body: { signedPayload: string }
// Configure this URL in App Store Connect → App Information → App Store Server Notifications.
// Non-2xx → Apple retries, so only fail on our own errors (DB), not on bad payloads.
// ─────────────────────────────────────────────
const handleAppleNotification = async (req, res) => {
  const { signedPayload } = req.body || {};
  if (!signedPayload) {
    return res.status(400).json({ success: false, message: "signedPayload is required" });
  }

  let notification;
  try {
    notification = await appleIap.verifyNotification(signedPayload);
  } catch (error) {
    console.warn("[appleNotification] Rejected payload:", error.message);
    return res.status(400).json({ success: false, message: "Invalid signedPayload" });
  }

  const { notificationType: type, subtype = null, data } = notification;
  try {
    if (type === "TEST" || !data?.signedTransactionInfo) {
      console.log(`[appleNotification] ${type} received (${data?.environment ?? "-"})`);
      return res.status(200).json({ success: true });
    }

    const payload = await appleIap.verifyTransaction(data.signedTransactionInfo);
    if (!appleIap.isPremiumProduct(payload)) {
      return res.status(200).json({ success: true });
    }
    const renewalInfo = data.signedRenewalInfo
      ? await appleIap.verifyRenewalInfo(data.signedRenewalInfo)
      : null;

    const subscription = await appleIap.recordTransaction(payload, {
      source: "notification",
      type,
      subtype,
      renewalInfo,
    });
    if (subscription.userId) {
      await appleIap.syncUserPremium(subscription.userId);
    }

    console.log(
      `[appleNotification] ${type}${subtype ? "/" + subtype : ""} ${payload.originalTransactionId} user=${subscription.userId ?? "-"}`
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof appleIap.IapError) {
      console.warn(`[appleNotification] ${type} ignored:`, error.message);
      return res.status(200).json({ success: true });
    }
    console.error("[appleNotification] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to process notification" });
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
  getPackageById,
  verifyAppleTransaction,
  handleAppleNotification,
  getEntitlements,
};
