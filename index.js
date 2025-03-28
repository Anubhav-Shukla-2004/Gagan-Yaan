const express = require("express");
const session = require("express-session");
const User = require("./src/mongodb");
require("dotenv").config();
const nodemailer = require("nodemailer")

const app = express();

app.use(session({
    secret: 'your_secret_key', // Secret key for session encryption
    resave: false,  // Do not resave session if it hasn't changed
    saveUninitialized: false, // Don't save uninitialized sessions
    cookie: { secure: false }  // Use `secure: true` when using https
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use('/assets', express.static("assets"));

app.get('/main', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect to login if session is missing
    }
    res.render('main', { user: req.session.user });
});


app.get("/", (req, res) => {
    res.render("index");
});
app.get("/verify-otp", (req, res) => {
    res.render("forget", { user: req.session.user });
});


app.get("/service", (req, res) => {
    res.render("service", { user: req.session.user });
});

app.get("/about-us", (req, res) => {
    res.render("about-us", { user: req.session.user });
});

const transporter = nodemailer.createTransport({
    service: 'Gmail',  // Use your email service (e.g., Gmail, Outlook, etc.)
    auth: {
        user: 'shukla2004anubhav@gmail.com',  // Your email address stored in .env file
        pass: 'rbhx wrnl lsjl xttr',  // Your email password or app password stored in .env
    },
});

// Generate OTP function

const otpStore = {};
// Route to render "Forgot Password" page
app.get('/forget-password', (req, res) => {
    res.render('forget', {
      showOtpForm: req.query.showOtpForm === 'true', // Convert query string to boolean
      email: req.query.email,
      emailError: req.query.emailError,
      message: req.query.message // If needed for OTP errors
    });
  });

// Post Route to send OTP
app.post('/forget-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        email = req.session.email; // Try fetching from session
    }
    if (!email) {
        return res.redirect('/forget-password?emailError=Email is required');
    }

    const user = await User.findOne({ email: email });
    if (!user) {
        return res.redirect('/forget-password?emailError=User does not exist. Please sign up.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp);
    otpStore[email] = otp;

    const mailOptions = {
        from: 'shukla2004anubhav@gmail.com', // Sender's email address
        to: email,
        subject: 'Your OTP Code for Gagan Yaan Login',
        html: `
        <p>Dear User,</p>
        <p>We have received a request to reset your password for your Gagan Yaan account. 
        To proceed, please use the following One-Time Password (OTP):</p>
        <p><strong style="font-size: 18px; color: #d32f2f;">${otp}</strong></p>
        <p>For your security, please do not share this OTP with anyone.</p>
        <p>Thank you for choosing <strong>Gagan Yaan</strong> – <em>"Get Fair Fare for the Journey."</em></p>
        <p>Best regards,<br>  
        Gagan Yaan Support Team</p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending OTP:", error);
            return res.redirect('/forget-password?emailError=Failed to send OTP. Please try again.');
        }

        res.redirect(`/forget-password?showOtpForm=true&email=${encodeURIComponent(email)}`);
    });
});

app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body; // Correctly extract email & OTP from JSON request body

    console.log("Request body:", req.body);
    console.log("Email in request:", email);
    console.log("OTP in request:", otp);

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    // Check if the OTP matches
    if (otpStore[email] && otpStore[email] === otp) {
        req.session.user = user; // Save user session
        delete otpStore[email]; // Clear OTP after successful verification

        console.log("Session after OTP verification:", req.session);

        return res.json({ success: true });
    } else {
        return res.status(400).json({ message: 'Invalid OTP' });
    }
});

const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect("/");
};

app.get("/signup", (req, res) => {
    const captcha = generateCaptcha();  // Generate a random captcha
    req.session.captcha = captcha;  // Store captcha in session
    res.render("sign-up", { captcha, message: req.query.message || "" });  // Render the signup page with the captcha
});

app.get("/login", (req, res) => {
    const captcha = generateCaptcha();  // Generate a random captcha
    req.session.captcha = captcha;
    res.render("login", { captcha, message: req.query.message || "" });
});

function generateCaptcha() {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*+?';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
        captcha += alpha.charAt(Math.floor(Math.random() * alpha.length));
    }
    return captcha;
}

app.post("/signup", async (req, res) => {
    try {
        const { fullname, mobile, email, password, confirmPassword, captcha } = req.body;

        // Check if the captcha matches the stored value in the session
        if (captcha !== req.session.captcha) {
            return res.redirect("/signup?message=Captcha does not match");
        }

        // Check if the passwords match
        if (password !== confirmPassword) {
            return res.redirect("/signup?message=Passwords do not match");
        }

        // Check if the email already exists
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.redirect("/signup?message=User already exists");
        }

        // Create the new user if no issues
        const newUser = new User({
            fullname,
            mobile,
            email,
            password,
            confirmPassword,
            captcha,
        });

        await newUser.save();
        console.log("User successfully created");

        // Redirect to login after successful sign-up
        res.redirect("/login?message=Account created successfully, please login");
    } catch (error) {
        console.error("Error during signup:", error);
        res.redirect("/signup?message=Internal server error");
    }
});

// Login route
app.post("/login", async (req, res) => {
    try {
        const { email, password, captcha } = req.body;

        // Find the user by email
        const user = await User.findOne({ email: email });
        if (captcha !== req.session.captcha) {
            return res.redirect("/login?message=Captcha does not match");
        }

        // If user does not exist, show error message
        if (!user) {
            return res.redirect("/login?message=User does not exist");
        }

        // Compare the entered password with the stored password (plain text)
        if (password === user.password) {
            // Store user information in the session
            req.session.user = {
                id: user._id,
                fullname: user.fullname,
                email: user.email
            };

            console.log("User logged in successfully");

            // Redirect to dashboard or another protected route
            res.redirect("/main");
        } else {
            return res.redirect("/login?message=Invalid password");
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.redirect("/login?message=Internal server error");
    }
});


app.get("/", isAuthenticated, (req, res) => {
    res.render("index", {
        user: req.session.user
    });
});

// Logout route to destroy the session
app.get("/logout", (req, res) => {
    // Destroy the session and handle errors if any
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("An error occurred while logging out.");
        }

        // Ensure cookies are cleared when the session is destroyed
        res.clearCookie('connect.sid'); // Adjust if you use a different cookie name

        // Redirect to login after successful logout
        res.redirect("/");
    });
});
const fetch = require('node-fetch');

app.post('/predict', async (req, res) => {
    try {
        // Prepare URL-encoded form data
        const formData = new URLSearchParams();
        formData.append('source', req.body.source);
        formData.append('destination', req.body.destination);
        formData.append('airline', req.body.airline);
        formData.append('total-stops', req.body['total-stops']);
        formData.append('departure-datetime', req.body['departure-datetime']);
        formData.append('arrival-datetime', req.body['arrival-datetime']);

        // Forward the request to Flask
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        // Parse the JSON response from Flask
        const data = await response.json();

        // Render your EJS template with the result from Flask (prediction or error message)
        res.render('service', { result: data.result, user: req.session.user });
    } catch (error) {
        console.error("Error forwarding prediction request:", error);
        res.render('service', { result: 'Server Error', user: req.session.user });
    }
});

// Start the server
const port = 5000;
app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});