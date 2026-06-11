/**
 * Seed script: tạo Content Packages mẫu trong MongoDB
 * Chạy: node seedContentPackages.js
 */

const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const ContentPackage = require("./models/ContentPackageModel");

const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise";

const samplePackages = [
  {
    title: "Business English Essentials",
    description:
      "500 từ vựng kinh doanh cần thiết cho công việc văn phòng và hội nghị quốc tế.",
    coverImage: null,
    type: "vocabulary",
    accessLevel: "premium",
    isPreview: false,
    sortOrder: 1,
  },
  {
    title: "IELTS Vocabulary Booster",
    description:
      "Bộ từ vựng học thuật theo chủ đề giúp bạn đạt band 7.0+ trong kỳ thi IELTS.",
    coverImage: null,
    type: "vocabulary",
    accessLevel: "premium",
    isPreview: true,
    sortOrder: 2,
  },
  {
    title: "Daily Conversations",
    description:
      "200 cụm từ thông dụng nhất trong giao tiếp hàng ngày. Hoàn toàn miễn phí!",
    coverImage: null,
    type: "vocabulary",
    accessLevel: "free",
    isPreview: false,
    sortOrder: 3,
  },
  {
    title: "Short Stories: Travel & Adventure",
    description:
      "Các câu chuyện ngắn hấp dẫn về du lịch giúp mở rộng vốn từ theo ngữ cảnh thực tế.",
    coverImage: null,
    type: "story",
    accessLevel: "premium",
    isPreview: false,
    sortOrder: 4,
  },
  {
    title: "Tech & Innovation Vocabulary",
    description:
      "Từ vựng chuyên ngành công nghệ, AI, startup — cần thiết cho dân kỹ thuật.",
    coverImage: null,
    type: "vocabulary",
    accessLevel: "premium",
    isPreview: false,
    sortOrder: 5,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    // Xóa data cũ để seed sạch
    const deleted = await ContentPackage.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing packages`);

    const inserted = await ContentPackage.insertMany(samplePackages);
    console.log(`✅ Seeded ${inserted.length} content packages:`);
    inserted.forEach((p) =>
      console.log(`   - [${p.accessLevel.toUpperCase()}] ${p.title}`)
    );
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seed();
