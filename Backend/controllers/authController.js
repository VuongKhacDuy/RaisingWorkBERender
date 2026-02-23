const User = require("../models/Auth/user");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const secretKey = process.env.JWT_SECRET || "default_secret_key";

const sendVerificationEmail = async (email, verificationToken) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER || "khongduocdau456@gmail.com",
            pass: process.env.EMAIL_PASS || "fkko rsyv elht bdvh",
        },
    });

    const mailOptions = {
        from: "WordsRise <no-reply@wordsrise.com>",
        to: email,
        subject: "Email Verification",
        text: `Please click the following link to verify your email: http://localhost:3000/api/auth/verify/${verificationToken}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Verification email sent successfully");
    } catch (error) {
        console.log("Error sending the verification email", error);
    }
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password, profileImage } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("Email already registered");
            return res.status(400).json({ message: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            profileImage,
        });

        newUser.verificationToken = crypto.randomBytes(20).toString("hex");

        await newUser.save();

        // Respond immediately — do not wait for email
        res.status(201).json({
            message: "Registration successful. Please check your email for verification",
        });

        // Send verification email in background (non-blocking)
        sendVerificationEmail(newUser.email, newUser.verificationToken);
    } catch (error) {
        console.log("Error registering user", error);
        res.status(500).json({ message: "Registration failed" });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(404).json({ message: "Invalid verification token" });
        }

        user.verified = true;
        user.verificationToken = undefined;

        await user.save();
        res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
        res.status(500).json({ message: "Email verification failed" });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Compare hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: user._id }, secretKey);

        res.status(200).json({ token });
    } catch (error) {
        console.log("Error logging in", error);
        res.status(500).json({ message: "Login failed" });
    }
};

module.exports = {
    registerUser,
    verifyEmail,
    loginUser,
};
