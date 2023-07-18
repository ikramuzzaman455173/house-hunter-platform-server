const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Added extended option to handle URL-encoded data
app.use(cors());

mongoose.connect("mongodb+srv://HouseHunter:B9moPhXgHl4ijoW5@cluster0.izhktyr.mongodb.net/<database-name>?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("DB connected");
}).catch(err => {
  console.error("DB connection error:", err);
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
});

const User = mongoose.model("User", userSchema); // Changed "new mongoose.model" to "mongoose.model"

const secretKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImhhdDc0OTIwQGdtYWlsLmNvbSIsImlhdCI6MTY4OTY3NDUwMywiZXhwIjoxNjg5Njc4MTAzfQ.1tGU6iab5tJ_MvOL854gKXV6nh4fSxzwn0N8dSNK140"; // Updated the secret key, replace with your own

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Failed to authenticate token" });
    }

    req.user = decoded.user;
    next();
  });
};

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email: email }, (err, user) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (password === user.password) {
      const token = jwt.sign({ user: user }, secretKey, {
        expiresIn: "1h"
      });
      res.send({ message: "Login successful", user: user, token: token });
    } else {
      res.status(401).json({ message: "Incorrect password" });
    }
  });
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email: email }, (err, user) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
    if (user) {
      return res.status(409).json({ message: "User already registered" });
    }
    const newUser = new User({
      name,
      email,
      password
    });
    newUser.save((err) => {
      if (err) {
        res.status(500).json({ message: "Failed to register user" });
      } else {
        res.send({ message: "Successfully registered, please login now" });
      }
    });
  });
});

app.get("/protected", verifyToken, (req, res) => {
  res.send({ message: "Protected route accessed successfully" });
});

app.listen(port, () => {
  console.log(`Crud Server Is Running On Port:http://localhost:${port}`);
})
