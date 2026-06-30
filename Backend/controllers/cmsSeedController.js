const bcrypt = require('bcryptjs');
const User = require('../models/Auth/user');
const UserProgress = require('../models/User/UserProgressModel');
const FavoriteWord = require('../models/FavoriteWords/FavoriteWords');

// Tier definitions — stats that match each proficiency level
const TIER_CONFIG = {
    'A+': { level: 32, xp: 55000, streak: 70, coins: 3200, words: 520, proficiency: 5 },
    'A':  { level: 26, xp: 36000, streak: 45, coins: 2100, words: 320, proficiency: 4 },
    'B+': { level: 20, xp: 20000, streak: 28, coins: 1400, words: 200, proficiency: 4 },
    'B':  { level: 15, xp: 11000, streak: 18, coins: 900,  words: 140, proficiency: 3 },
    'C1': { level: 10, xp: 5500,  streak: 10, coins: 500,  words: 75,  proficiency: 2 },
    'C2': { level: 6,  xp: 2200,  streak: 5,  coins: 250,  words: 35,  proficiency: 2 },
    'D':  { level: 2,  xp: 600,   streak: 1,  coins: 80,   words: 10,  proficiency: 1 },
};

// Sample word pool for seeded accounts
const WORD_POOL = [
    ['abandon','abolish','abstract','accept','access','achieve','acquire','adapt','address','advance'],
    ['advocate','affect','afford','agency','agree','allocate','allow','alter','analyze','apply'],
    ['approach','approve','argue','arise','assess','assign','assist','assume','attach','attempt'],
    ['attribute','benefit','broaden','calculate','challenge','clarify','classify','collaborate','combine','commit'],
    ['communicate','compare','compile','complete','comply','comprehend','conclude','conduct','confirm','connect'],
    ['consider','construct','contribute','convert','coordinate','create','debate','decide','define','demonstrate'],
    ['derive','describe','design','determine','develop','differentiate','diminish','discuss','distribute','document'],
    ['elaborate','emerge','emphasize','enable','enhance','ensure','establish','evaluate','examine','expand'],
    ['experiment','explain','express','facilitate','focus','formulate','generate','identify','illustrate','implement'],
    ['improve','incorporate','indicate','influence','integrate','interpret','investigate','justify','maintain','manage'],
    ['maximize','measure','minimize','modify','monitor','motivate','navigate','obtain','organize','outline'],
    ['participate','perceive','perform','predict','prepare','present','prioritize','process','produce','promote'],
    ['propose','provide','publish','pursue','recognize','recommend','reflect','reinforce','relate','represent'],
    ['research','resolve','review','revise','select','simplify','solve','specify','structure','summarize'],
    ['support','synthesize','transform','utilize','validate','verify','visualize','achieve','adapt','allocate'],
];

function pickWords(count) {
    const all = WORD_POOL.flat();
    const shuffled = all.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, all.length));
}

function jitter(base, pct = 0.15) {
    const delta = Math.floor(base * pct);
    return base + Math.floor(Math.random() * delta * 2) - delta;
}

exports.seedAccounts = async (req, res) => {
    try {
        const { batches } = req.body;
        if (!Array.isArray(batches) || batches.length === 0) {
            return res.status(400).json({ message: 'batches array is required.' });
        }

        const results = { created: [], skipped: [], errors: [] };
        const hashedPassword = await bcrypt.hash('Seeder@2025!', 10);

        for (const batch of batches) {
            const { prefix, count, tier } = batch;
            const tierCfg = TIER_CONFIG[tier];
            if (!tierCfg) {
                results.errors.push(`Unknown tier: ${tier}`);
                continue;
            }
            const n = Math.min(Number.parseInt(count, 10) || 1, 50);

            for (let i = 1; i <= n; i++) {
                const username = `${prefix}${n > 1 ? i : ''}`;
                const email = `${username.toLowerCase().replace(/\s+/g, '_')}@gmail.com`;

                try {
                    const existing = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
                    if (existing) { results.skipped.push(email); continue; }

                    const user = await User.create({
                        name: username,
                        email,
                        password: hashedPassword,
                        verified: true,
                        role: 'tester',
                        profileImage: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
                    });

                    const lastActivity = new Date(Date.now() - Math.random() * 7 * 86400000);
                    await UserProgress.create({
                        userId: user._id,
                        level: jitter(tierCfg.level),
                        totalXP: jitter(tierCfg.xp),
                        totalCoins: jitter(tierCfg.coins),
                        currentStreak: jitter(tierCfg.streak),
                        loginStreak: jitter(tierCfg.streak),
                        learnStreak: jitter(Math.floor(tierCfg.streak * 0.8)),
                        lastActivityDate: lastActivity,
                        lastLoginDate: lastActivity,
                        lastLearnDate: lastActivity,
                    });

                    const words = pickWords(jitter(tierCfg.words));
                    if (words.length > 0) {
                        const wordDocs = words.map((w, idx) => ({
                            userId: user._id,
                            word: w,
                            meaning: `Meaning of ${w}`,
                            proficiencyLevel: Math.min(tierCfg.proficiency, 5),
                            source: 'system',
                            dateCreated: new Date(Date.now() - (words.length - idx) * 86400000 * 2),
                            lastReviewDate: new Date(Date.now() - idx * 86400000),
                        }));
                        await FavoriteWord.insertMany(wordDocs, { ordered: false }).catch(() => {});
                    }

                    results.created.push({ email, tier, level: tierCfg.level, words: words.length });
                } catch (err) {
                    results.errors.push(`${email}: ${err.message}`);
                }
            }
        }

        res.status(200).json({
            message: `Done. Created: ${results.created.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`,
            data: results,
        });
    } catch (err) {
        console.error('[CMS Seed] error:', err);
        res.status(500).json({ message: 'Seed failed.' });
    }
};

exports.listSeederAccounts = async (req, res) => {
    try {
        const users = await User.find({ role: 'tester' }).sort({ createdAt: -1 }).limit(200);
        const ids = users.map(u => u._id);
        const progresses = await UserProgress.find({ userId: { $in: ids } });
        const progressMap = Object.fromEntries(progresses.map(p => [p.userId.toString(), p]));

        const data = users.map(u => {
            const p = progressMap[u._id.toString()];
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                isLeaderboardActive: u.isLeaderboardActive !== false,
                level: p?.level || 1,
                totalXP: p?.totalXP || 0,
                streak: p?.currentStreak || 0,
            };
        });

        res.status(200).json({ data });
    } catch (err) {
        res.status(500).json({ message: 'Failed to list seeder accounts.' });
    }
};

exports.toggleSeederActive = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({ _id: id, role: 'tester' });
        if (!user) return res.status(404).json({ message: 'Seeder not found.' });
        user.isLeaderboardActive = !user.isLeaderboardActive;
        await user.save();
        res.status(200).json({ _id: user._id, isLeaderboardActive: user.isLeaderboardActive });
    } catch (err) {
        res.status(500).json({ message: 'Toggle failed.' });
    }
};

exports.deleteSeederAccounts = async (req, res) => {
    try {
        const { ids, deleteAll } = req.body;

        let targetIds;
        if (deleteAll) {
            const users = await User.find({ role: 'tester' }, '_id');
            targetIds = users.map(u => u._id);
        } else {
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'ids array required or use deleteAll: true.' });
            }
            targetIds = ids;
        }

        await User.deleteMany({ _id: { $in: targetIds }, role: 'tester' });
        await UserProgress.deleteMany({ userId: { $in: targetIds } });
        await FavoriteWord.deleteMany({ userId: { $in: targetIds } });
        res.status(200).json({ message: `Deleted ${targetIds.length} seeder account(s).` });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete.' });
    }
};
