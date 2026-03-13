const mongoose = require("mongoose");

const gameStatisticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    gameMode: {
        type: String,
        required: true,
    },
    completionTime: {
        type: Number, // Stored in seconds
        required: true,
    },
    bestTime: {
        type: Number, // Stored in seconds
        required: true,
    },
    totalPlayTime: {
        type: Number, // Stored in seconds
        required: true,
    },
    completedGames: {
        type: Number,
        default: 0,
    },
    date: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model("GameStatistics", gameStatisticsSchema);
