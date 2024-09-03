const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

// Define Schemas and Models
const userSchema = new mongoose.Schema({
  username: String,
});

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
});

const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: Date,
    },
  ],
});

const UserInfo = mongoose.model("userInfo", userSchema);
const ExerciseInfo = mongoose.model("exerciseInfo", exerciseSchema);
const LogInfo = mongoose.model("logInfo", logSchema);

// Connect to MongoDB
const uri = process.env.MONGO_URI;

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Database connection successful"))
  .catch((err) => console.error("Database connection error:", err));

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// API Endpoints

// #1
app.post("/api/users", async (req, res) => {
  try {
    const existingUser = await UserInfo.findOne({
      username: req.body.username,
    }).exec();
    if (existingUser) {
      return res.send("Username already Exists");
    }
    const newUser = new UserInfo({
      username: req.body.username,
    });
    const savedUser = await newUser.save();
    res.json({
      _id: savedUser.id,
      username: savedUser.username,
    });
  } catch (err) {
    console.log("Error with server=> ", err);
    res.status(500).send("Internal Server Error");
  }
});

// #2
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    let checkedDate = new Date(req.body.date);
    checkedDate = isNaN(checkedDate.getTime()) ? new Date() : checkedDate;
    const user = await UserInfo.findById(req.params._id).exec();
    if (!user) {
      return res.status(404).send("User not found");
    }
    const newExercise = new ExerciseInfo({
      username: user.username,
      description: req.body.description,
      duration: req.body.duration,
      date: checkedDate,
    });
    const savedExercise = await newExercise.save();
    res.json({
      _id: req.params._id,
      username: savedExercise.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
    });
  } catch (err) {
    console.log("Error with server=> ", err);
    res.status(500).send("Internal Server Error");
  }
});

// #3
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const user = await UserInfo.findById(req.params._id).exec();
    if (!user) {
      return res.status(404).send("User not found");
    }
    const query = {
      username: user.username,
    };
    if (from) query.date = { ...query.date, $gte: new Date(from) };
    if (to) query.date = { ...query.date, $lte: new Date(to) };
    const exercises = await ExerciseInfo.find(query)
      .limit(Number(limit) || 100)
      .exec();
    const loggedArray = exercises.map((item) => ({
      description: item.description,
      duration: item.duration,
      date: item.date.toDateString(),
    }));
    const logEntry = new LogInfo({
      username: user.username,
      count: loggedArray.length,
      log: loggedArray,
    });
    await logEntry.save();
    res.json({
      _id: req.params._id,
      username: user.username,
      count: loggedArray.length,
      log: loggedArray,
    });
  } catch (err) {
    console.log("Error with server=> ", err);
    res.status(500).send("Internal Server Error");
  }
});

// #4
app.get("/api/users", async (req, res) => {
  try {
    const users = await UserInfo.find().exec();
    res.json(users);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

// Start Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
