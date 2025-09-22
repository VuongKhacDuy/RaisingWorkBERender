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
  extended: true,  limit: '35mb',
  parameterLimit: 50000,
}));

app.use(bodyParser.json({limit: '35mb'}));


const jwt = require("jsonwebtoken");

// Serve static files in uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== MONGODB CONNECTION WITH DEBUG =====
console.log('Attempting to connect to MongoDB...');
console.log('Using MONGO_URL:', process.env.MONGO_URL);

mongoose
  .connect(process.env.MONGO_URL)
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

app.use(express.json({limit:'10mb'}))
app.use(express.urlencoded({limit: '10mb', extended: true}))

app.use('/api/topics', topicRouter)
app.use('/api/news', newsRouter)
app.use('/api/upload/images', uploadImageSeriesRoute);
app.use('/api/series_stories', seriesStoriesRouter);
app.use('/api/episodes', episodeRouter);


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



// const User = require("./models/Auth/user");
// const Post = require("./models/Auth/post");

// //endpoint to register a user in the backend
// app.post("/register", async (req, res) => {
//   try {
//     const { name, email, password, profileImage } = req.body;

//     //check if email is already existed
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       console.log("Email already registered");
//       return res.status(400).json({ message: "Email already registed" });
//     }
//     //create new user
//     const newUser = new User({
//       name,
//       email,
//       password,
//       profileImage,
//     });

//     //generate the verification token
//     newUser.verificationToken = crypto.randomBytes(20).toString("hex");

//     //save the user into database
//     await newUser.save();

//     //send the verification email to the register user
//     sentVerificationEmail(newUser.email, newUser.verificationToken);
//     console.log('User.email',newUser.email)
//     console.log('newUser.verificationToken',newUser.verificationToken)

//     res.status(202).json({
//       message:
//         "Registration successful. Please check your email for verification",
//     });
//   } catch (error) {
//     console.log("Error registerin user", error);
//     res.status(500).json({ message: "Registration failed" });
//   }
// });

// const sentVerificationEmail = async (email, verificationToken) => {
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: "khongduocdau456@gmail.com",
//       pass: "fkko rsyv elht bdvh",
//     },
//   });

//   const mailOptions = {
//     from: "linkedin@gmail.com",
//     to: email,
//     subject: "Email Verification",
//     text: `please click the following link to verify your email: http://localhost:3000/verify/${verificationToken}`,
//   };

//   //sent the email
//   try {
//     await transporter.sendMail(mailOptions);
//     console.log("Verification email sent successful");
//   } catch (error) {
//     console.log("Error sending the verification email");
//   }
// };

// //endpoint the verify email
// app.get("/verify/:token", async (req, res) => {
//   try {
//     const token = req.params.token;
//     const user = await User.findOne({ verificationToken: token });
//     if (!user) {
//       return res.status(404).json({ message: "Invalid verification token" });
//     }

//     //mark the user as verified
//     user.verified = true;
//     user.verificationToken = undefined;

//     await user.save();
//   } catch (error) {
//     res.status(500).json({ message: "Email verification failed" });
//   }
// });

// const generateSecretKey = () => {
//   const secretKey = crypto.randomBytes(32).toString("hex");

//   return secretKey;
// };

// const secretKey = generateSecretKey();

// //endpoint to login user
// app.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     //check if user exists already
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     //check if password is correct
//     if (user.password !== password) {
//       return res.status(401).json({ message: "Invalid password" });
//     }

//     const token = jwt.sign({ userId: user._id }, secretKey);

//     res.status(200).json({token})
//   } catch (error) {
//     res.status(500).json({ message: "Login failed" });
//   }
// });
