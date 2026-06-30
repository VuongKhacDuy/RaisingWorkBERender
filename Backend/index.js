const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, '../.env') });

// ===== DEBUG ENVIRONMENT VARIABLES =====
console.log('=== DEBUG ENVIRONMENT ===');
console.log('Dotenv config path:', path.join(__dirname, '../.env'));
console.log('Env vars with MONGO/PORT/NODE:', Object.keys(process.env).filter(key =>
  key.includes('MONGO') || key.includes('PORT') || key.includes('NODE')
));
console.log('MONGO_URL exists:', 'MONGO_URL' in process.env);
console.log('MONGO_URL type:', typeof process.env.MONGO_URL);
console.log('MONGO_URL value:', process.env.MONGO_URL);
console.log('MONGO_URL length:', process.env.MONGO_URL?.length);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('========================');

const mongoose = require("mongoose");

const express = require("express");

const bodyParser = require("body-parser");
const crypto = require("crypto");
const nodemailer = require("nodemailer");


const app = express();
const authRouter = require('./routes/authRoute');
const topicRouter = require('./routes/topicsRoute')
const newsRouter = require('./routes/newsRoute')
const seriesStoriesRouter = require('./routes/seriesStoriesRoute');
const uploadImageSeriesRoute = require('./routes/uploadImageSeriesRoute');
const episodeRouter = require('./routes/episodeRoute');
const favoriteWordsRouter = require('./routes/favoriteWordsRoute');
const achievementRouter = require('./routes/achievementRoute');
const gameStatisticsRouter = require('./routes/gameStatisticsRoute');
const userProgressRouter = require('./routes/userProgressRoute');
const dailyMissionRouter = require('./routes/dailyMissionRoute');
const testRouter = require('./routes/testRoute');
const petTemplateRouter = require('./routes/petTemplateRoute');
const userPetRouter = require('./routes/userPetRoute');
const configRouter = require('./routes/configRoute');
const masterVocabularyRouter = require('./routes/masterVocabularyRoute');
const rankingRouter = require('./routes/rankingRoute');
const premiumRouter = require('./routes/premiumRoute');
const shopRouter = require('./routes/shopRoute');
const cmsAccountRouter = require('./routes/cmsAccountRoute');
const cmsCollectionRouter = require('./routes/cmsCollectionRoute');
const vocabularyCollectionRouter = require('./routes/vocabularyCollectionRoute');
const aiContextRouter = require('./routes/aiContextRoute');
const port = 3000;

// ADD THIS
var cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({
  extended: true, limit: '35mb',
  parameterLimit: 50000,
}));

app.use(bodyParser.json({ limit: '35mb' }));


const jwt = require("jsonwebtoken");

// Serve static files in uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use('/api/topics', topicRouter)
app.use('/api/news', newsRouter)
app.use('/api/upload/images', uploadImageSeriesRoute);
app.use('/api/series_stories', seriesStoriesRouter);
app.use('/api/episodes', episodeRouter);
app.use('/api/auth', authRouter);
app.use('/api/favorite-words', favoriteWordsRouter);
app.use('/api/achievements', achievementRouter);
app.use('/api/game-statistics', gameStatisticsRouter);
app.use('/api/user-progress', userProgressRouter);
app.use('/api/daily-missions', dailyMissionRouter);
app.use('/api/test', testRouter);
app.use('/api/pets/templates', petTemplateRouter);
app.use('/api/pets/my', userPetRouter);
app.use('/api/config', configRouter);
app.use('/api/master-vocabulary', masterVocabularyRouter);
app.use('/api/vocabulary/master', masterVocabularyRouter); // Alias for iOS app
app.use('/api/leaderboard', rankingRouter);
app.use('/api/shop', shopRouter);
app.use('/api/cms', cmsAccountRouter);
app.use('/api/cms', cmsCollectionRouter);
app.use('/api/vocab-collections', vocabularyCollectionRouter);
app.use('/api/ai', aiContextRouter);
app.use('/api/series', seriesStoriesRouter); // Alias for iOS app
app.use('/api', premiumRouter); // Premium: /api/content/catalog, /api/iap/apple/transactions, /api/users/me/entitlements

// ===== MONGODB CONNECTION WITH DEBUG =====
// Fallback MONGO_URL if env var not found
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise';

console.log('Attempting to connect to MongoDB...');
console.log('process.env.MONGO_URL:', process.env.MONGO_URL);
console.log('Using MONGO_URL (with fallback):', MONGO_URL);

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('Connected to database:', mongoose.connection.name);
    console.log('Connection host:', mongoose.connection.host);

    // ===== SERVER START =====
    const serverPort = process.env.PORT || port;
    console.log('Starting server...');
    console.log('Using PORT:', serverPort);

    app.listen(serverPort, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${serverPort}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
      console.log(`📍 URL: http://localhost:${serverPort}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:');
    console.error('Error message:', err.message);
    process.exit(1);
  });

// ===== RANKING AUTOMATION (Simple Cron Simulation) =====
const rankingService = require('./services/rankingService');

// Check every hour for resets
setInterval(async () => {
  const now = new Date();
  const day = now.getDay(); // 0: Sun, 6: Sat
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Saturday 21:59 - Close Qualifiers
  if (day === 6 && hour === 21 && minute === 59) {
    await rankingService.processSaturdayCloser();
  }

  // Sunday 22:59 - Reset Week
  if (day === 0 && hour === 22 && minute === 59) {
    await rankingService.processSundayReset();
  }

  // Daily 23:59 - Grand Final Eliminations
  if (hour === 23 && minute === 59) {
    await rankingService.processDailyElimination();
  }
}, 60000); // Check every minute
