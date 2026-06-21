const News = require("../../models/News/NewsModel");
const { userHasPremiumAccess } = require("../../utils/premiumAccess");

function parsePublishDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isVisibleToApp(news, now = new Date()) {
  if (news.status !== "published") return false;

  const publishDate = parsePublishDate(news.publish_date);
  if (!publishDate) return true;

  return publishDate.getTime() <= now.getTime();
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
      const news = await News.find().sort({ publish_date: -1, createAt: -1 });
      const safeNews = news.filter((item) => isVisibleToApp(item)).map((item) => {
        if (item.accessLevel === "premium" && !hasPremium) {
          return toPreviewNews(item);
        }
        return item;
      });
      res.status(200).json(safeNews);
    } catch (error) {
      console.error("[NewsController] Failed to get all News:", error);
      res.status(500).json({
        message: "Failed to get all News",
        error: process.env.NODE_ENV === "production" ? undefined : error.message
      });
    }
  },

  getAllNewsForCms: async (req, res) => {
    try {
      const news = await News.find().sort({ publish_date: -1, createAt: -1 });
      res.status(200).json(news);
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

      if (!isVisibleToApp(news)) {
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

  getNewsForCms: async (req, res) => {
    try {
      const news = await News.findById(req.params.id);
      if (!news) {
        return res.status(404).json("News not found");
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
