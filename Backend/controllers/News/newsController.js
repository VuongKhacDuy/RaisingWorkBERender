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

// ── All News list (paged, like Short Stories) ────────────────────────────────
const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const NEWS_LIST_FIELDS = "_id lessonId slug status accessLevel imageUrl title subTitle cover headline level category tags publish_date estimated_reading_minutes createAt source.author numbRead";
const NEWS_NEWEST_SORT = { publish_date: -1, createAt: -1, _id: -1 };
const NEWS_POPULAR_SORT = { numbRead: -1, publish_date: -1, createAt: -1, _id: -1 };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Mongo-side version of isVisibleToApp: published and publish_date not in the future.
// publish_date is a "yyyy-mm-dd" / ISO string, so a string compare with now's ISO works.
const visibleNewsFilter = () => ({
  status: "published",
  $or: [
    { publish_date: { $exists: false } },
    { publish_date: null },
    { publish_date: "" },
    { publish_date: { $lte: new Date().toISOString() } },
  ],
});

module.exports = {
  // GET /api/news/list?limit=&cursor=&q=&level=&category=&sort=new|popular
  // → { items, nextCursor, hasMore }. Light items (no pages / activities); paged by
  // offset cursor "o:<n>". Premium items carry `locked` when the user has no premium.
  listNews: async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
      let offset = 0;
      if (req.query.cursor) {
        const m = /^o:(\d+)$/.exec(req.query.cursor);
        if (!m) return res.status(400).json({ message: "Invalid cursor" });
        offset = parseInt(m[1], 10);
      }

      const filters = [visibleNewsFilter()];
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        filters.push({ $or: [{ "headline.en": rx }, { "headline.vi": rx }, { title: rx }, { subTitle: rx }] });
      }
      if (typeof req.query.level === "string" && req.query.level.trim()) {
        filters.push({ "level.cefr": { $in: req.query.level.split(",").map(l => l.trim()).filter(Boolean) } });
      }
      if (typeof req.query.category === "string" && req.query.category.trim()) {
        filters.push({ category: req.query.category.trim() });
      }

      const popular = req.query.sort === "popular";
      const [docs, hasPremium] = await Promise.all([
        News.find({ $and: filters })
          .select(NEWS_LIST_FIELDS)
          .sort(popular ? NEWS_POPULAR_SORT : NEWS_NEWEST_SORT)
          .skip(offset)
          .limit(limit + 1)
          .lean(),
        userHasPremiumAccess(req),
      ]);

      const hasMore = docs.length > limit;
      const items = (hasMore ? docs.slice(0, limit) : docs)
        .filter(item => isVisibleToApp(item)) // odd publish_date formats the string compare can't judge
        .map(item => ({ ...item, locked: item.accessLevel === "premium" && !hasPremium }));
      res.status(200).json({ items, nextCursor: hasMore ? `o:${offset + limit}` : null, hasMore });
    } catch (error) {
      console.error("[NewsController] Failed to list News:", error);
      res.status(500).json({ message: "Failed to list News" });
    }
  },

  // GET /api/news/facets → counts per CEFR level / category among visible news (empty ones left out)
  getNewsFacets: async (req, res) => {
    try {
      const match = { $match: visibleNewsFilter() };
      const [levels, categories] = await Promise.all([
        News.aggregate([match, { $match: { "level.cefr": { $nin: [null, ""] } } },
          { $group: { _id: "$level.cefr", count: { $sum: 1 } } }]),
        News.aggregate([match, { $match: { category: { $nin: [null, ""] } } },
          { $group: { _id: "$category", count: { $sum: 1 } } }]),
      ]);
      const rank = (l) => (CEFR_ORDER.indexOf(l) === -1 ? 99 : CEFR_ORDER.indexOf(l));
      res.status(200).json({
        levels: levels.map(l => ({ level: l._id, count: l.count }))
          .sort((a, b) => rank(a.level) - rank(b.level) || a.level.localeCompare(b.level)),
        categories: categories.map(c => ({ name: c._id, count: c.count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get News facets" });
    }
  },

  // POST /api/news/:id/read — the app calls this once per article per session.
  markNewsRead: async (req, res) => {
    try {
      const news = await News.findByIdAndUpdate(req.params.id, { $inc: { numbRead: 1 } }, { new: true })
        .select("numbRead").lean();
      if (!news) return res.status(404).json({ message: "News not found" });
      res.status(200).json({ numbRead: news.numbRead });
    } catch (error) {
      res.status(404).json({ message: "News not found" });
    }
  },

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
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      let query = News.find().sort({ publish_date: -1, createAt: -1 });
      if (limit) query = query.limit(limit);
      const news = await query;
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
      if (!deleteItem) return res.status(404).json({ message: "News not found" });
      res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete news" });
    }
  },

  updateNews: async (req, res) => {
    try {
      // numbRead is only changed by POST /:id/read — a CMS save must not reset it
      const { numbRead, ...update } = req.body;
      const updatedNews = await News.findByIdAndUpdate(req.params.id, update, { new: true });
      res.status(200).json(updatedNews);
    } catch (error) {
      res.status(500).json("Failed to update the News");
    }
  },
  
};
