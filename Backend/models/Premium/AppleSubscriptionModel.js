const mongoose = require('mongoose');

// One document per Apple subscription chain (originalTransactionId).
// Updated by the iOS app (POST /api/iap/apple/transactions) and by
// App Store Server Notifications V2 (POST /api/iap/apple/notifications).
const AppleEventSchema = new mongoose.Schema({
    source: { type: String, enum: ['app', 'notification'], required: true },
    type: { type: String, default: null },      // notificationType, e.g. DID_RENEW
    subtype: { type: String, default: null },
    transactionId: { type: String, default: null },
    expiresDate: { type: Date, default: null },
    at: { type: Date, default: Date.now },
}, { _id: false });

const AppleSubscriptionSchema = new mongoose.Schema({
    // null until the app submits the transaction (a notification can arrive first).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    originalTransactionId: { type: String, required: true, unique: true },
    latestTransactionId: { type: String, default: null },
    productId: { type: String, required: true },
    environment: { type: String, enum: ['Production', 'Sandbox'], required: true },
    appAccountToken: { type: String, default: null },
    originalPurchaseDate: { type: Date, default: null },
    purchaseDate: { type: Date, default: null },
    expiresDate: { type: Date, default: null },
    gracePeriodExpiresDate: { type: Date, default: null },
    revocationDate: { type: Date, default: null },
    revocationReason: { type: Number, default: null },
    autoRenewStatus: { type: Boolean, default: null },
    priceMilliunits: { type: Number, default: null }, // price * 1000, in `currency`
    currency: { type: String, default: null },
    lastEventType: { type: String, default: null },
    lastEventSubtype: { type: String, default: null },
    lastEventAt: { type: Date, default: null },
    events: { type: [AppleEventSchema], default: [] }, // newest last, capped in the service
}, { timestamps: true });

AppleSubscriptionSchema.index({ userId: 1 });
AppleSubscriptionSchema.index({ expiresDate: -1 });
AppleSubscriptionSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('AppleSubscription', AppleSubscriptionSchema);
