// Import required modules
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.json()); // Middleware to parse JSON request bodies

// Connect to MongoDB using environment variable
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/yourDatabase';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define a Mongoose schema
const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
});

// Create a Mongoose model
const Device = mongoose.model('Device', deviceSchema);

// Serve static files
app.use(express.static('public'));





// Route to update device location
app.post('/devices', async (req, res) => {
  try {
    const { deviceId, latitude, longitude } = req.body;

    const device = await Device.findOneAndUpdate(
      { deviceId },
      { latitude, longitude, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    // Emit location update to all connected clients
    io.emit('locationUpdate', device);

    res.status(200).json({ message: 'Device location updated', device });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating device location', error });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server using environment variable
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
