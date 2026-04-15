// GET /api/config
const getAppConfig = async (req, res) => {
    try {
        // Sau này bác có thể lưu vào DB, hiện tại khởi đầu cứ để hardcode cho nhanh
        const config = {
            minVersion: "1.0.0",        // Phiên bản thấp nhất cho phép chạy
            latestVersion: "1.0.1",     // Phiên bản mới nhất trên Store
            forceUpdate: true,          // Có bắt buộc update không
            storeUrl: "https://apps.apple.com/app/uumi/id6737525287", // Link App Store của bác
            updateMessage: "A new version of UUMi is available. Please update to continue using the app."
        };

        res.status(200).json(config);
    } catch (error) {
        console.error("Error fetching app config:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { getAppConfig };
