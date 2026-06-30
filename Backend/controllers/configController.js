const AppConfig = require("../models/AppConfigModel");

// GET /api/config
const getAppConfig = async (req, res) => {
    try {
        // Tìm bản ghi cấu hình chính
        let config = await AppConfig.findOne({ configKey: "MAIN_CONFIG" });

        // Nếu chưa có (lần đầu chạy), hãy khởi tạo dữ liệu mặc định
        if (!config) {
            console.log("🌱 Seeding default app config...");
            config = new AppConfig({
                configKey: "MAIN_CONFIG",
                minVersion: "1.0.0",
                latestVersion: "1.0.1",
                forceUpdate: true,
                storeUrl: "https://apps.apple.com/app/uumi/id6737525287",
                updateMessage: "A new version of UUMi is available. Please update to continue using the app."
            });
            await config.save();
        }

        res.status(200).json(config);
    } catch (error) {
        console.error("Error fetching app config:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { getAppConfig };
