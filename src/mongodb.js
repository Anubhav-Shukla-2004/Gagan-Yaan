const mongoose = require("mongoose");
const mongoURI = "mongodb+srv://anubhav:gzBr%405wWWDzP.d9@prediction.mkdow.mongodb.net";

mongoose.connect(mongoURI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error.message);
  });

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true
  },
  mobile: {
    type: Number,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Make sure email is unique
  },
  password: {
    type: String,
    required: true
  },
  captcha: {
    type: String,
    required: true,
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
