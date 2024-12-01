const express = require("express");
const session = require("express-session");
const User = require("./src/mongodb");
require("dotenv").config();

const app = express();

app.use(session({
    secret: 'your_secret_key', // Secret key for session encryption
    resave: false,  // Do not resave session if it hasn't changed
    saveUninitialized: false, // Don't save uninitialized sessions
    cookie: { secure: false }  // Use `secure: true` when using https
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.use('/assets', express.static("assets"));

app.get("/main", (req, res) => {
    res.render("main", { user: req.session.user });
});

app.get("/", (req, res) => {
    res.render("index");
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
    res.render("sign-up", { captcha , message: req.query.message || ""  });  // Render the signup page with the captcha
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

const port = 5000;
app.listen(port, () => {
    console.log(`Server running on PORT ${port}`);
});
