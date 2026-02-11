const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require('socket.io');
const User = require('./models/User');
const GroupMessage = require('./models/GroupMessage');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const MONGO_URI = "mongodb://127.0.0.1:27017/lab_test1_chat_app";
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

app.use(express.static('view'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/signup', async (req, res) => {
    try {
        const { username, firstname, lastname, password } = req.body;
        const newUser = new User({ username, firstname, lastname, password });
        await newUser.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) {
            res.status(200).json({ message: "Login success", username: user.username });
        } else {
            res.status(400).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

io.on('connection', (socket) => {
    console.log('New Socket Connection: ', socket.id);

    socket.on('joinRoom', ({ username, room }) => {
        socket.join(room);
        console.log(`${username} joined ${room}`);

        socket.broadcast.to(room).emit('message', {
            from_user: 'System',
            message: `${username} has joined the chat.`
        });
    });

    socket.on('leaveRoom', ({ username, room }) => {
        socket.leave(room);
        console.log(`${username} left ${room}`);
        socket.broadcast.to(room).emit('message', {
            from_user: 'System',
            message: `${username} has left the chat.`
        });
    });


    socket.on('chatMessage', async ({ from_user, room, message }) => {
        const msg = new GroupMessage({ from_user, room, message });
        await msg.save();


        io.to(room).emit('message', { from_user, message, date_sent: msg.date_sent });
    });

    socket.on('typing', ({ username, room }) => {
        socket.broadcast.to(room).emit('typing', username);
    });

    socket.on('stopTyping', ({ room }) => {
        socket.broadcast.to(room).emit('stopTyping');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));