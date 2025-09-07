const Topic = require("../models/TopicModel");

module.exports = {
  createTopic: async (req, res) => {
    const newTopic = new Topic(req.body);
    try {
      await newTopic.save();
      res.status(200).json("Topic is created successfully");
    } catch (error) {
      res.status(500).json("Failed to create the topic");
    }
  },

  getAllTopics: async (req, res) => {
    try {
      const topic = await Topic.find().sort({ createdAt: -1 });
      res.status(200).json(topic);
    } catch (error) {
      res.status(500).json("failed to get all topics");
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

  deleteTopic: async (req, res) => {
    try {
      const deleteItem = await Topic.findByIdAndDelete(req.params.id);
      res.status(200).json("Topic is deleted successfully", deleteItem);
    } catch (error) {
      res.status(500).json("failed to detele the topic");
    }
  },
};
