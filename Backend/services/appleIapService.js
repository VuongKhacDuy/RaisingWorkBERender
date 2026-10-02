const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SignedDataVerifier, Environment } = require('@apple/app-store-server-library');
const User = require('../models/Auth/user');
const AppleSubscription = require('../models/Premium/AppleSubscriptionModel');

const PREMIUM_PRODUCT_IDS = new Set([
    'com.DVK.UUMI.premium.monthly',
    'com.DVK.UUMI.premium.yearly',
]);
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.DVK.UUMI-local';
// Numeric "Apple ID" of the app in App Store Connect — required by Apple to verify Production data.
const APP_APPLE_ID = Number(process.env.APPLE_APP_ID) || undefined;
const MAX_EVENTS = 50;

class IapError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

let verifiers = null;
function getVerifiers() {
    if (verifiers) return verifiers;
    const certDir = path.join(__dirname, '../certs/apple');
    const roots = fs.readdirSync(certDir)
        .filter((f) => f.endsWith('.cer'))
        .map((f) => fs.readFileSync(path.join(certDir, f)));

    verifiers = [];
    if (APP_APPLE_ID) {
        verifiers.push(new SignedDataVerifier(roots, true, Environment.PRODUCTION, BUNDLE_ID, APP_APPLE_ID));
    } else {
        console.warn('[appleIap] APPLE_APP_ID is not set — Production purchases cannot be verified.');
    }
    // Sandbox = TestFlight, App Review and Xcode device builds.
    verifiers.push(new SignedDataVerifier(roots, true, Environment.SANDBOX, BUNDLE_ID));
    return verifiers;
}

// Tries each environment; the verifier rejects data from a different environment / bundle.
async function verifyWithAnyEnvironment(method, signed) {
    let lastError;
    for (const verifier of getVerifiers()) {
        try {
            return await verifier[method](signed);
        } catch (error) {
            lastError = error;
        }
    }
    throw new IapError(400, `Invalid Apple signed data (${lastError?.status ?? lastError?.message ?? 'unknown'})`);
}

const verifyTransaction = (jws) => verifyWithAnyEnvironment('verifyAndDecodeTransaction', jws);
const verifyRenewalInfo = (jws) => verifyWithAnyEnvironment('verifyAndDecodeRenewalInfo', jws);
const verifyNotification = (signedPayload) => verifyWithAnyEnvironment('verifyAndDecodeNotification', signedPayload);

// Must match PurchaseManager.currentAppAccountToken() on iOS:
// SHA-256(userId) → first 16 bytes, RFC 4122 version 5 / variant bits.
function appAccountTokenForUser(userId) {
    const b = crypto.createHash('sha256').update(String(userId), 'utf8').digest().subarray(0, 16);
    b[6] = (b[6] & 0x0f) | 0x50;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = b.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const isPremiumProduct = (payload) => PREMIUM_PRODUCT_IDS.has(payload?.productId);
const toDate = (ms) => (ms ? new Date(ms) : null);

function isActive(sub, now = new Date()) {
    if (!sub || sub.revocationDate) return false;
    const until = [sub.expiresDate, sub.gracePeriodExpiresDate]
        .filter(Boolean)
        .reduce((max, d) => (d > max ? d : max), null);
    return until === null ? false : until > now;
}

function effectiveExpiry(sub) {
    return [sub.expiresDate, sub.gracePeriodExpiresDate]
        .filter(Boolean)
        .reduce((max, d) => (d > max ? d : max), null);
}

/**
 * Upserts the subscription chain from a verified transaction payload.
 * @param {object} payload    verified JWSTransactionDecodedPayload
 * @param {object} options    { userId, source: 'app'|'notification', type, subtype, renewalInfo }
 */
async function recordTransaction(payload, { userId = null, source, type = null, subtype = null, renewalInfo = null }) {
    const originalTransactionId = String(payload.originalTransactionId);
    const existing = await AppleSubscription.findOne({ originalTransactionId });

    if (userId && existing?.userId && String(existing.userId) !== String(userId)) {
        throw new IapError(409, 'This subscription is already linked to another UUMI account');
    }

    const sub = existing || new AppleSubscription({
        originalTransactionId,
        productId: payload.productId,
        environment: payload.environment,
        originalPurchaseDate: toDate(payload.originalPurchaseDate),
    });

    // Notifications can arrive out of order — only move forward in time.
    const incomingExpiry = payload.expiresDate ?? 0;
    const currentExpiry = sub.expiresDate ? sub.expiresDate.getTime() : 0;
    if (!existing || incomingExpiry >= currentExpiry) {
        sub.latestTransactionId = String(payload.transactionId);
        sub.productId = payload.productId;
        sub.purchaseDate = toDate(payload.purchaseDate);
        sub.expiresDate = toDate(payload.expiresDate);
        if (payload.price != null) sub.priceMilliunits = payload.price;
        if (payload.currency) sub.currency = payload.currency;
    }

    if (payload.revocationDate) {
        sub.revocationDate = toDate(payload.revocationDate);
        sub.revocationReason = payload.revocationReason ?? null;
    } else if (type === 'REFUND_REVERSED') {
        sub.revocationDate = null;
        sub.revocationReason = null;
    }

    if (payload.appAccountToken) sub.appAccountToken = String(payload.appAccountToken).toLowerCase();
    if (userId && !sub.userId) sub.userId = userId;

    if (renewalInfo) {
        sub.autoRenewStatus = renewalInfo.autoRenewStatus === 1;
        sub.gracePeriodExpiresDate = toDate(renewalInfo.gracePeriodExpiresDate);
    }

    const now = new Date();
    sub.lastEventType = type || (source === 'app' ? 'APP_SUBMIT' : null);
    sub.lastEventSubtype = subtype;
    sub.lastEventAt = now;
    sub.events.push({
        source,
        type: sub.lastEventType,
        subtype,
        transactionId: String(payload.transactionId),
        expiresDate: toDate(payload.expiresDate),
        at: now,
    });
    if (sub.events.length > MAX_EVENTS) sub.events = sub.events.slice(-MAX_EVENTS);

    await sub.save();
    return sub;
}

/**
 * Recomputes User.isPremium from the user's Apple subscriptions.
 * Premium granted manually from the CMS (appleOriginalTransactionId = null) is never revoked here.
 */
async function syncUserPremium(userId) {
    const user = await User.findById(userId);
    if (!user) return null;

    const subs = await AppleSubscription.find({ userId });
    const active = subs
        .filter((s) => isActive(s))
        .sort((a, b) => effectiveExpiry(b) - effectiveExpiry(a))[0];

    if (active) {
        user.isPremium = true;
        user.premiumExpiresAt = effectiveExpiry(active);
        user.appleOriginalTransactionId = active.originalTransactionId;
        user.premiumProductId = active.productId;
        user.premiumEnvironment = active.environment;
    } else if (user.appleOriginalTransactionId) {
        user.isPremium = false;
        user.premiumExpiresAt = null;
        user.appleOriginalTransactionId = null;
        user.premiumProductId = null;
        user.premiumEnvironment = null;
    }
    await user.save();
    return { isPremium: Boolean(user.isPremium), expiresAt: user.premiumExpiresAt };
}

module.exports = {
    IapError,
    PREMIUM_PRODUCT_IDS,
    verifyTransaction,
    verifyRenewalInfo,
    verifyNotification,
    appAccountTokenForUser,
    isPremiumProduct,
    isActive,
    effectiveExpiry,
    recordTransaction,
    syncUserPremium,
};
