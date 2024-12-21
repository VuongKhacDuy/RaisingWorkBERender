const FavoriteWords = require("../../models/FavoriteWords/FavoriteWords");

module.exports = {
  createNewFavoriteWords: async (req, res) => {
    const newFavoriteWords = new FavoriteWords(req.body);
    try {
      await newFavoriteWords.save();
      res.status(200).json("Favorite word is created successfully");
    } catch (error) {
      res.status(500).json("Failed to save new favorite word");
    }
  },

  getAllFavoriteWords: async (req, res) => {
    try {
      const allFavoriteWords = await FavoriteWords.find().sort({
        createAt: -1,
      });
      res.status(200).json(allFavoriteWords);
    } catch (error) {
      res.status(500).json("Failed to get all Favorite words");
    }
  },

  getFavoriteWork: async (req, res) => {
          try {
                    const favoriteWord = await FavoriteWords.findById(req.params.id);
                    res.status(200).json(favoriteWord);
          } catch (error) {
                   res.status(500).json("Failed to get Favorite word"); 
          }
  }
};
