const mongoose = require('mongoose');
const MissionPool = require('./models/User/MissionPoolModel');

const seedMissions = [
    { title: "Word Collector I", desc: "Add 5 words to favorites", type: "learnWords", baseTarget: 5, difficulty: "Easy", xpReward: 50, coinReward: 20 },
    { title: "Word Master II", desc: "Add 10 words to favorites", type: "learnWords", baseTarget: 10, difficulty: "Medium", xpReward: 100, coinReward: 50 },
    { title: "Vocabulary Guru", desc: "Add 20 words to favorites", type: "learnWords", baseTarget: 20, difficulty: "Hard", xpReward: 250, coinReward: 100 },

    { title: "Quick Learner", desc: "Complete 2 mini-games", type: "playGames", baseTarget: 2, difficulty: "Easy", xpReward: 30, coinReward: 10 },
    { title: "Gamer Spirit", desc: "Complete 5 mini-games", type: "playGames", baseTarget: 5, difficulty: "Medium", xpReward: 70, coinReward: 30 },
    { title: "Game Enthusiast", desc: "Complete 10 mini-games", type: "playGames", baseTarget: 10, difficulty: "Hard", xpReward: 150, coinReward: 70 },

    { title: "Morning Habit", desc: "Learn something before noon", type: "maintainStreak", baseTarget: 1, difficulty: "Easy", xpReward: 60, coinReward: 25 },
    { title: "Dedicating Student", desc: "Maintain streak for today", type: "maintainStreak", baseTarget: 1, difficulty: "Easy", xpReward: 100, coinReward: 50 },

    { title: "Flashcard Ninja", desc: "Review 15 flashcards", type: "reviewWords", baseTarget: 15, difficulty: "Medium", xpReward: 80, coinReward: 40 },
    { title: "Pronunciation Pro", desc: "Speak 5 words correctly", type: "aiPronunciation", baseTarget: 5, difficulty: "Medium", xpReward: 120, coinReward: 60 }
];

// Usage: require('./seedMissions')(mongoUri)
module.exports = async (uri) => {
    try {
        await mongoose.connect(uri);
        await MissionPool.deleteMany({}); // clear old
        await MissionPool.insertMany(seedMissions);
        console.log('✅ Mission Pool Seeded!');
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
};
