const dotenv = require("dotenv");

const mongoose = require("mongoose");

const express = require("express");

const bodyParser = require("body-parser");
const crypto = require("crypto");
const nodemailer = require("nodemailer");


const app = express();
const topicRouter = require('../Backend/routes/topicsRoute')
const newsRouter = require('../Backend/routes/newsRoute')
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

dotenv.config();
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("db connected"))
  .catch((err) => console.log(err));

// app.get("/", (req, res) => res.send("Test React js backend!"));

app.use(express.json({limit:'10mb'}))
app.use(express.urlencoded({limit: '10mb', extended: true}))

app.use('/api/topics', topicRouter)
app.use('/api/news', newsRouter)


app.listen(process.env.PORT || port, () => console.log(`Example app listening on port ${process.env.PORT}!`));



const User = require("./models/Auth/user");
const Post = require("./models/Auth/post");

//endpoint to register a user in the backend
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, profileImage } = req.body;

    //check if email is already existed
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Email already registered");
      return res.status(400).json({ message: "Email already registed" });
    }
    //create new user
    const newUser = new User({
      name,
      email,
      password,
      profileImage,
    });

    //generate the verification token
    newUser.verificationToken = crypto.randomBytes(20).toString("hex");

    //save the user into database
    await newUser.save();

    //send the verification email to the register user
    sentVerificationEmail(newUser.email, newUser.verificationToken);
    console.log('User.email',newUser.email)
    console.log('newUser.verificationToken',newUser.verificationToken)

    res.status(202).json({
      message:
        "Registration successful. Please check your email for verification",
    });
  } catch (error) {
    console.log("Error registerin user", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

const sentVerificationEmail = async (email, verificationToken) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "khongduocdau456@gmail.com",
      pass: "fkko rsyv elht bdvh",
    },
  });

  const mailOptions = {
    from: "linkedin@gmail.com",
    to: email,
    subject: "Email Verification",
    text: `please click the following link to verify your email: http://localhost:3000/verify/${verificationToken}`,
  };

  //sent the email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successful");
  } catch (error) {
    console.log("Error sending the verification email");
  }
};

//endpoint the verify email
app.get("/verify/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(404).json({ message: "Invalid verification token" });
    }

    //mark the user as verified
    user.verified = true;
    user.verificationToken = undefined;

    await user.save();
  } catch (error) {
    res.status(500).json({ message: "Email verification failed" });
  }
});

const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString("hex");

  return secretKey;
};

const secretKey = generateSecretKey();

//endpoint to login user
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    //check if user exists already
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    //check if password is correct
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, secretKey);

    res.status(200).json({token})
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});
