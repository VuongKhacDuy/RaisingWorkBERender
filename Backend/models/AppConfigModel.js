const mongoose = require("mongoose");

const appConfigSchema = new mongoose.Schema({
    configKey: {
        type: String,
        default: "MAIN_CONFIG",
        unique: true
    },
    minVersion: {
        type: String,
        default: "1.0.0"
    },
    latestVersion: {
        type: String,
        default: "1.0.0"
    },
    forceUpdate: {
        type: Boolean,
        default: false
    },
    storeUrl: {
        type: String,
        default: "https://apps.apple.com/app/uumi/id6737525287"
    },
    updateMessage: {
        type: String,
        default: "A new version of UUMi is available. Please update to continue using the app."
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("AppConfig", appConfigSchema);
