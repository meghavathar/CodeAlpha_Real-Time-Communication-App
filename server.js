require('dotenv').config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// ==========================================
// DATABASE
// ==========================================

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error);
    });


// ==========================================
// USER MODEL
// ==========================================

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    }
});

const User = mongoose.model("User", userSchema);


// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access token required"
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET,
        (error, user) => {

            if (error) {
                return res.status(403).json({
                    message: "Invalid token"
                });
            }

            req.user = user;

            next();
        }
    );
}


// ==========================================
// REGISTER
// ==========================================

app.post("/api/register", async (req, res) => {

    try {

        const { username, email, password } = req.body;

        if (!username || !email || !password) {

            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { username },
                { email }
            ]
        });

        if (existingUser) {

            return res.status(400).json({
                message: "Username or email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        res.json({
            message: "Registration successful"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ==========================================
// LOGIN
// ==========================================

app.post("/api/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "24h"
            }
        );

        res.json({
            token,
            username: user.username
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});


// ==========================================
// GET USER PROFILE
// ==========================================

app.get("/api/profile", authenticateToken, async (req, res) => {

    const user = await User.findById(req.user.id)
        .select("-password");

    res.json(user);
});


// ==========================================
// FILE UPLOAD
// ==========================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {

        const filename =
            Date.now() + "-" + file.originalname;

        cb(null, filename);
    }
});

const upload = multer({
    storage: storage
});

app.post(
    "/api/upload",
    authenticateToken,
    upload.single("file"),
    (req, res) => {

        if (!req.file) {

            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        const fileURL =
            `/uploads/${req.file.filename}`;

        res.json({
            message: "File uploaded",
            fileURL,
            filename: req.file.originalname
        });
    }
);


// ==========================================
// SOCKET.IO
// ==========================================

const rooms = {};

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);


    // --------------------------------------
    // JOIN ROOM
    // --------------------------------------

    socket.on("join-room", ({ roomId, username }) => {

        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        rooms[roomId].push({
            socketId: socket.id,
            username
        });

        socket.data.roomId = roomId;
        socket.data.username = username;

        socket.to(roomId).emit(
            "user-joined",
            {
                socketId: socket.id,
                username
            }
        );

        const users =
            rooms[roomId].filter(
                user => user.socketId !== socket.id
            );

        socket.emit("existing-users", users);
    });


    // --------------------------------------
    // WEBRTC SIGNALING
    // --------------------------------------

    socket.on("offer", ({ target, offer }) => {

        io.to(target).emit("offer", {
            sender: socket.id,
            offer
        });
    });


    socket.on("answer", ({ target, answer }) => {

        io.to(target).emit("answer", {
            sender: socket.id,
            answer
        });
    });


    socket.on("ice-candidate", ({ target, candidate }) => {

        io.to(target).emit("ice-candidate", {
            sender: socket.id,
            candidate
        });
    });


    // --------------------------------------
    // WHITEBOARD
    // --------------------------------------

    socket.on("drawing", ({ roomId, data }) => {

        socket.to(roomId).emit(
            "drawing",
            data
        );
    });


    socket.on("clear-board", (roomId) => {

        socket.to(roomId).emit(
            "clear-board"
        );
    });


    // --------------------------------------
    // CHAT
    // --------------------------------------

    socket.on("chat-message", ({ roomId, username, message }) => {

        io.to(roomId).emit(
            "chat-message",
            {
                username,
                message,
                time: new Date().toLocaleTimeString()
            }
        );
    });


    // --------------------------------------
    // DISCONNECT
    // --------------------------------------

    socket.on("disconnect", () => {

        const roomId = socket.data.roomId;

        if (!roomId || !rooms[roomId]) {
            return;
        }

        rooms[roomId] =
            rooms[roomId].filter(
                user => user.socketId !== socket.id
            );

        socket.to(roomId).emit(
            "user-left",
            {
                socketId: socket.id
            }
        );

        if (rooms[roomId].length === 0) {
            delete rooms[roomId];
        }

        console.log(
            "User disconnected:",
            socket.id
        );
    });
});


// ==========================================
// START SERVER
// ==========================================


const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );
});