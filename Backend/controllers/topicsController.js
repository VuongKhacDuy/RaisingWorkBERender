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
  editTopic: async (req, res) => {
    try {
      const updatedTopic = await Topic.findByIdAndUpdate(
        req.params.id,
        req.body,
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
