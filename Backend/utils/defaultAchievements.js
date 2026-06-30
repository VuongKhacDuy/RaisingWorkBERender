const defaultAchievements = [
    {
        achievementId: "ACH_WORD_10",
        title: "Novice Bookworm",
        desc: "Complete learning the first 10 words.",
        iconName: "book.fill",
        category: "Learning",
        requirement: 10,
        xpReward: 50,
        coinReward: 20,
        currentProgress: 0,
        isUnlocked: false
    },
    {
        achievementId: "ACH_WORD_100",
        title: "Vocabulary Master",
        desc: "Complete learning 100 words with excellence.",
        iconName: "text.book.closed.fill",
        category: "Learning",
        requirement: 100,
        xpReward: 500,
        coinReward: 200,
        currentProgress: 0,
        isUnlocked: false
    },
    {
        achievementId: "ACH_STREAK_7",
        title: "Dedicated Learner",
        desc: "Learn continuously for 7 days without interruption.",
        iconName: "flame.fill",
        category: "Consistency",
        requirement: 7,
        xpReward: 100,
        coinReward: 50,
        currentProgress: 0,
        isUnlocked: false
    },
    {
        achievementId: "ACH_STREAK_30",
        title: "Streak Master",
        desc: "Learn continuously for 30 days without interruption.",
        iconName: "flame.fill",
        category: "Consistency",
        requirement: 30,
        xpReward: 500,
        coinReward: 300,
        currentProgress: 0,
        isUnlocked: false
    },
    {
        achievementId: "ACH_STREAK_100",
        title: "Legendary Streak",
        desc: "Learn continuously for 100 days without interruption.",
        iconName: "flame.fill",
        category: "Consistency",
        requirement: 100,
        xpReward: 2000,
        coinReward: 1000,
        currentProgress: 0,
        isUnlocked: false
    },
    {
        achievementId: "ACH_MASCOT_1",
        title: "Animal Lover",
        desc: "Successfully collect the first Mascot.",
        iconName: "pawprint.fill",
        category: "Pets",
        requirement: 1,
        xpReward: 100,
        coinReward: 100,
        currentProgress: 0,
        isUnlocked: false
    },
    {
        achievementId: "ACH_RICH_1000",
        title: "Money Lord",
        desc: "Get rich quick! Accumulate 1,000 UUMI Coins in your account.",
        iconName: "banknote.fill",
        category: "Progression",
        requirement: 1000,
        xpReward: 200,
        coinReward: 500,
        currentProgress: 0,
        isUnlocked: false
    },
    {
        achievementId: "ACH_Words_5",
        title: "Safe Start",
        desc: "Complete the start by learning 5 words.",
        iconName: "book.fill",
        category: "Learning",
        requirement: 5,
        xpReward: 20,
        coinReward: 10,
        currentProgress: 0,
        isUnlocked: false
    }
];

module.exports = defaultAchievements;
