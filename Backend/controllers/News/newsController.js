const News = require("../../models/News/NewsModel");
const User = require("../../models/Auth/user");
const jwt = require("jsonwebtoken");

const secretKey = process.env.JWT_SECRET || "default_secret_key";

async function userHasPremiumAccess(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.userId).select("isPremium premiumExpiresAt role");
    if (!user) return false;
    if (user.role === "admin") return true;
    return Boolean(user.isPremium && (user.premiumExpiresAt === null || user.premiumExpiresAt > new Date()));
  } catch {
    return false;
  }
}

function toPreviewNews(news) {
  const raw = typeof news.toObject === "function" ? news.toObject() : news;
  return {
    _id: raw._id,
    lessonId: raw.lessonId,
    lesson_number: raw.lesson_number,
    slug: raw.slug,
    status: raw.status,
    accessLevel: raw.accessLevel,
    imageUrl: raw.imageUrl,
    title: raw.title,
    subTitle: raw.subTitle,
    cover: raw.cover,
    headline: raw.headline,
    summary: raw.summary,
    level: raw.level,
    category: raw.category,
    tags: raw.tags,
    publish_date: raw.publish_date,
    estimated_reading_minutes: raw.estimated_reading_minutes,
    createAt: raw.createAt,
    locked: raw.accessLevel === "premium"
  };
}

module.exports = {
  createNews: async (req, res) => {
    const newNews = new News(req.body);
    try {
      await newNews.save();
      res.status(200).json("News is created successfully");
    } catch (error) {
      res.status(500).json("Failed to create the News");
    }
  },

  getAllNews: async (req, res) => {
    try {
      const hasPremium = await userHasPremiumAccess(req);
      const news = await News.find().sort({ createAt: -1 });
      const safeNews = news.map((item) => {
        if (item.accessLevel === "premium" && !hasPremium) {
          return toPreviewNews(item);
        }
        return item;
      });
      res.status(200).json(safeNews);
    } catch (error) {
      res.status(500).json("Failed to get all News");
    }
  },

  getNews: async (req, res) => {
    try {
      const news = await News.findById(req.params.id);
      if (!news) {
        return res.status(404).json("News not found");
      }

      if (news.accessLevel === "premium" && !(await userHasPremiumAccess(req))) {
        return res.status(200).json(toPreviewNews(news));
      }

      res.status(200).json(news);
    } catch (error) {
      res.status(500).json("Failed to get news");
    }
  },

  deleteNews: async (req, res) => {
    try {
      const deleteItem = await News.findByIdAndDelete(req.params.id);
      res.status(200).json("Topic is deleted successfully", deleteItem);
    } catch (error) {
      res.status(500).json("failed to detele the topic");
    }
  },

  updateNews: async (req, res) => {
    try {
      const updatedNews = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.status(200).json(updatedNews);
    } catch (error) {
      res.status(500).json("Failed to update the News");
    }
  },
  
};
