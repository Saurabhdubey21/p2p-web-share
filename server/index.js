// Import the packages we installed
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

// Create the express app and server
const app = express()
const server = http.createServer(app)

// Allow frontend to connect to backend
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

// Store active rooms
const rooms = {}

// When a user connects
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id)

  // When sender creates a room
  socket.on('create-room', (roomId) => {
    rooms[roomId] = socket.id
    socket.join(roomId)
    console.log('Room created:', roomId)
  })

  // When receiver joins a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId)
    socket.to(roomId).emit('user-joined', socket.id)
    console.log('User joined room:', roomId)
  })

  // Pass WebRTC signals between peers
  socket.on('signal', ({ roomId, data }) => {
    socket.to(roomId).emit('signal', { data })
  })

  // When user disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Start the server on port 3001
server.listen(3001, () => {
  console.log('Server running on http://localhost:3001')
})