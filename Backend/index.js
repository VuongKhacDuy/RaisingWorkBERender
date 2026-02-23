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
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('MONGO_URL being used:', process.env.MONGO_URL);
    console.error('MONGO_URL type:', typeof process.env.MONGO_URL);
    process.exit(1);
  });

// app.get("/", (req, res) => res.send("Test React js backend!"));

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use('/api/topics', topicRouter)
app.use('/api/news', newsRouter)
app.use('/api/upload/images', uploadImageSeriesRoute);
app.use('/api/series_stories', seriesStoriesRouter);
app.use('/api/episodes', episodeRouter);
app.use('/api/auth', authRouter);


// ===== SERVER START WITH DEBUG =====
const serverPort = process.env.PORT || port;
console.log('Starting server...');
console.log('Using PORT:', serverPort);
console.log('Environment:', process.env.NODE_ENV);

app.listen(serverPort, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${serverPort}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`📍 URL: http://localhost:${serverPort}`);
});

