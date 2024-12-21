const News = require("../../models/News/NewsModel");

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
      const news = await News.find().sort({ createAt: -1 });
      res.status(200).json(news);
    } catch (error) {
      res.status(500).json("Failed to get all News");
    }
  },

  getNews: async (req, res) => {
    try {
      const news = await News.findById(req.params.id);
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
  
};
