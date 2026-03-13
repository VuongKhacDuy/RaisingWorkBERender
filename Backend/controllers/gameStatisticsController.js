const GameStatistics = require("../models/Game/GameStatisticsModel");

// POST /api/game-statistics/sync — Sync multiple game records from the app
const syncGameStatistics = async (req, res) => {
    try {
        const { statistics } = req.body; // Array of game records

        if (!Array.isArray(statistics)) {
            return res.status(400).json({ message: "Invalid payload formatting. Expected an array of statistics." });
        }

        const userId = req.userId;

        // Since game statistics are usually just appended, we will just insert new ones if we assume each game is distinct.
        // Or if we can't identify a single game exactly from the SwiftData, we might either clear and reload, or rely on distinct date + gameMode.
        // Assuming SwiftData tracks total stats per gameMode (from the model it looks like it tracks by gameMode).

        const bulkOps = statistics.map((stat) => ({
            updateOne: {
                filter: { userId, gameMode: stat.gameMode },
                update: {
                    $set: {
                        completionTime: stat.completionTime,
                        bestTime: stat.bestTime,
                        totalPlayTime: stat.totalPlayTime,
                        completedGames: stat.completedGames,
                        date: stat.date || new Date(),
                    }
                },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await GameStatistics.bulkWrite(bulkOps);
        }

        const modesInPayload = statistics.map(stat => stat.gameMode);
        const deleteResult = await GameStatistics.deleteMany({
            userId,
            gameMode: { $nin: modesInPayload }
        });

        res.status(200).json({
            message: "Game statistics synced successfully.",
            syncedCount: bulkOps.length,
            deletedCount: deleteResult.deletedCount,
        });
    } catch (error) {
        console.error("Error syncing game statistics:", error);
        res.status(500).json({ message: "Failed to sync game statistics." });
    }
};

// GET /api/game-statistics — Get all game statistics of the logged-in user
const getGameStatistics = async (req, res) => {
    try {
        const userId = req.userId;
        const statistics = await GameStatistics.find({ userId });

        res.status(200).json({
            data: statistics,
        });
    } catch (error) {
        console.error("Error fetching game statistics:", error);
        res.status(500).json({ message: "Failed to fetch game statistics." });
    }
};

module.exports = { syncGameStatistics, getGameStatistics };
