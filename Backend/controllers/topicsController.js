const mongoose = require("mongoose");
const Topic = require("../models/TopicModel");
const StoryCategory = require("../models/StoryCategoryModel");

// New topics store a plain image URL (pasted in the CMS, like News). Legacy topics
// hold base64 (with or without a data: prefix) — in list mode those are swapped for
// GET /api/topics/:id/image so the payload stays small.
const isRemoteImage = (value) => typeof value === "string" && /^https?:\/\//i.test(value.trim());

// Legacy base64 never changes in place: the CMS now only writes URLs, so a new cover
// replaces the base64 entirely → the endpoint response can be cached forever.
const topicImageUrl = (req, doc) => {
  if (!doc.imageUrl || isRemoteImage(doc.imageUrl)) return doc.imageUrl;
  // Behind Render's proxy req.protocol is "http" — iOS ATS needs the real https scheme
  const proto = (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim();
  return `${proto}://${req.get("host")}/api/topics/${doc._id}/image`;
};

const sniffImageType = (buf) => {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "image/webp";
  return "image/jpeg";
};

// Cursor = "<createAt ISO | null>_<_id>" of the last item on the previous page.
const makeTopicCursor = (doc) =>
  `${doc.createAt ? new Date(doc.createAt).toISOString() : "null"}_${doc._id}`;

// Items strictly after the cursor in (createAt desc, _id desc) order.
// Docs without createAt sort last, so they come after every dated doc.
const parseTopicCursor = (cursor) => {
  const sep = String(cursor).lastIndexOf("_");
  if (sep <= 0) return null;
  const ts = cursor.slice(0, sep);
  const id = cursor.slice(sep + 1);
  if (!mongoose.isValidObjectId(id)) return null;
  const oid = new mongoose.Types.ObjectId(id);

  if (ts === "null") return { createAt: null, _id: { $lt: oid } };
  const date = new Date(ts);
  if (isNaN(date.getTime())) return null;
  return {
    $or: [
      { createAt: { $lt: date } },
      { createAt: date, _id: { $lt: oid } },
      { createAt: null },
    ],
  };
};

// Normalize CMS input for level / categories and derive readingMinutes from the text.
// Returns { set, unset } so an empty level clears the field on edit.
const WORDS_PER_MINUTE = 150;
const prepareTopicBody = (body) => {
  const set = { ...body };
  const unset = {};
  delete set.numbRead; // only changed by POST /:id/read
  delete set.numbLike;

  if ("level" in body) {
    const level = typeof body.level === "string" ? body.level.trim().toUpperCase() : "";
    if (Topic.LEVELS.includes(level)) set.level = level;
    else { delete set.level; unset.level = ""; }
  }
  if ("categoryIds" in body) {
    set.categoryIds = (Array.isArray(body.categoryIds) ? body.categoryIds : [])
      .filter(id => mongoose.isValidObjectId(id));
  }
  if (typeof body.description === "string") {
    const words = body.description.trim().split(/\s+/).filter(Boolean).length;
    set.readingMinutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  }
  return { set, unset };
};

// Popular order depends on numbRead, which keeps changing — paged by offset ("o:<n>").
const POPULAR_SORT = { numbRead: -1, createAt: -1, _id: -1 };
const NEWEST_SORT = { createAt: -1, _id: -1 };
// `reference` (author/source) is shown on the Home cards
const LIST_FIELDS = "_id title subTitle reference imageUrl createAt level categoryIds readingMinutes numbRead";

module.exports = {
  createTopic: async (req, res) => {
    const newTopic = new Topic(prepareTopicBody(req.body).set);
    try {
      await newTopic.save();
      res.status(200).json("Topic is created successfully");
    } catch (error) {
      res.status(500).json("Failed to create the topic");
    }
  },

  // GET /api/topics
  //   no `limit`  → legacy: full array of full docs (old app versions);
  //                 `?view=cms` → same array, light (no exerciseGroups, base64 → image URL)
  //   `limit`     → list mode: { items, nextCursor, hasMore } with light fields only
  //                 optional `cursor` (from previous page), `q` (search title/subTitle),
  //                 `level` (A1–C2, comma list ok), `category` (StoryCategory id),
  //                 `sort=new|popular` (popular = numbRead, paged by offset cursor "o:<n>")
  getAllTopics: async (req, res) => {
    try {
      if (req.query.limit === undefined) {
        // CMS list (`?view=cms`): full text but no questions, and legacy base64 covers
        // swapped for the image endpoint — the raw array is ~14MB with base64 inlined.
        if (req.query.view === "cms") {
          const docs = await Topic.find().select("-exerciseGroups").sort(NEWEST_SORT).lean();
          return res.status(200).json(docs.map(doc => ({ ...doc, imageUrl: topicImageUrl(req, doc) })));
        }
        const topic = await Topic.find().sort({ createAt: -1, _id: -1 });
        return res.status(200).json(topic);
      }

      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
      const filters = [];

      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (q) filters.push({ $text: { $search: q } });

      if (typeof req.query.level === "string" && req.query.level.trim()) {
        const levels = req.query.level.split(",").map(l => l.trim().toUpperCase())
          .filter(l => Topic.LEVELS.includes(l));
        if (!levels.length) return res.status(400).json({ message: "Invalid level" });
        filters.push({ level: { $in: levels } });
      }

      if (typeof req.query.category === "string" && req.query.category.trim()) {
        if (!mongoose.isValidObjectId(req.query.category)) return res.status(400).json({ message: "Invalid category" });
        filters.push({ categoryIds: new mongoose.Types.ObjectId(req.query.category) });
      }

      const popular = req.query.sort === "popular";
      let offset = 0;
      if (req.query.cursor) {
        if (popular) {
          const m = /^o:(\d+)$/.exec(req.query.cursor);
          if (!m) return res.status(400).json({ message: "Invalid cursor" });
          offset = parseInt(m[1], 10);
        } else {
          const cursorFilter = parseTopicCursor(req.query.cursor);
          if (!cursorFilter) return res.status(400).json({ message: "Invalid cursor" });
          filters.push(cursorFilter);
        }
      }

      const docs = await Topic.find(filters.length ? { $and: filters } : {})
        .select(LIST_FIELDS)
        .sort(popular ? POPULAR_SORT : NEWEST_SORT)
        .skip(offset)
        .limit(limit + 1)
        .lean();

      const hasMore = docs.length > limit;
      const items = (hasMore ? docs.slice(0, limit) : docs).map(doc => ({
        ...doc,
        imageUrl: topicImageUrl(req, doc),
      }));
      const last = items[items.length - 1];
      const nextCursor = !hasMore || !last ? null
        : popular ? `o:${offset + items.length}` : makeTopicCursor(last);

      res.status(200).json({ items, nextCursor, hasMore });
    } catch (error) {
      res.status(500).json("failed to get all topics");
    }
  },

  // GET /api/topics/:id/image — decodes a legacy base64 cover into a real image response.
  // Topics that already store a URL are redirected there.
  getTopicImage: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
      const topic = await Topic.findById(req.params.id).select("imageUrl").lean();
      const value = topic?.imageUrl?.trim();
      if (!value) return res.status(404).end();
      if (isRemoteImage(value)) return res.redirect(302, value);

      const match = value.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/s);
      const base64 = match ? match[2] : value;
      const buffer = Buffer.from(base64, "base64");
      if (!buffer.length) return res.status(404).end();

      res.set({
        "Content-Type": match?.[1] || sniffImageType(buffer),
        "Content-Length": buffer.length,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      res.status(200).send(buffer);
    } catch (error) {
      res.status(500).json("failed to get the topic image");
    }
  },

  // GET /api/topics/facets — story counts per level / active category, so the app only
  // offers filters that return something. Empty groups are left out.
  getFacets: async (req, res) => {
    try {
      const [levelCounts, categoryCounts, categories] = await Promise.all([
        Topic.aggregate([
          { $match: { level: { $in: Topic.LEVELS } } },
          { $group: { _id: "$level", count: { $sum: 1 } } },
        ]),
        Topic.aggregate([
          { $unwind: "$categoryIds" },
          { $group: { _id: "$categoryIds", count: { $sum: 1 } } },
        ]),
        StoryCategory.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean(),
      ]);
      const levelMap = Object.fromEntries(levelCounts.map(l => [l._id, l.count]));
      const categoryMap = Object.fromEntries(categoryCounts.map(c => [String(c._id), c.count]));
      res.status(200).json({
        levels: Topic.LEVELS.filter(l => levelMap[l]).map(l => ({ level: l, count: levelMap[l] })),
        categories: categories
          .filter(c => categoryMap[String(c._id)])
          .map(c => ({ _id: c._id, name: c.name, count: categoryMap[String(c._id)] })),
      });
    } catch (error) {
      res.status(500).json("failed to get topic facets");
    }
  },

  // POST /api/topics/:id/read — the app calls this once per story per session.
  markRead: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Topic not found" });
      const topic = await Topic.findByIdAndUpdate(req.params.id, { $inc: { numbRead: 1 } }, { new: true })
        .select("numbRead").lean();
      if (!topic) return res.status(404).json({ message: "Topic not found" });
      res.status(200).json({ numbRead: topic.numbRead });
    } catch (error) {
      res.status(500).json("failed to mark the topic as read");
    }
  },

  getTopic: async (req, res) => {
    try {
      const topic = await Topic.findById(req.params.id);
      res.status(200).json(topic);
    } catch (error) {
      res.status(500).json("failed to get the topic");
    }
  },

  searchTopic: async (req, res) => {
    try {
      const result = await Topic.aggregate([
        {
          $search: {
            index: "VocabMemRise",
            text: {
              query: req.params.key,
              path: {
                wildcard: "*",
              },
            },
          },
        },
      ]);
      res.status(200).json(result);
      console.log(result);
    } catch (error) {
      res.status(500).json("failed to search the topic");
    }
  },
  editTopic: async (req, res) => {
    try {
      const { set, unset } = prepareTopicBody(req.body);
      const updatedTopic = await Topic.findByIdAndUpdate(
        req.params.id,
        Object.keys(unset).length ? { $set: set, $unset: unset } : set,
        { new: true }
      );
      if (!updatedTopic) {
        return res.status(404).json("Topic not found");
      }
      res
        .status(200)
        .json({ message: "Topic updated successfully", topic: updatedTopic });
    } catch (error) {
      res.status(500).json("Failed to update the topic");
    }
  },

  deleteTopic: async (req, res) => {
    try {
      const deleteItem = await Topic.findByIdAndDelete(req.params.id);
      if (!deleteItem) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.status(200).json({ message: "Topic is deleted successfully", topic: deleteItem });
    } catch (error) {
      res.status(500).json("failed to detele the topic");
    }
  },
};
