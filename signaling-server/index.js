const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on("join", (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.to(roomId).emit("new-participant", socket.id);
  });

  socket.on("offer", (data) => {
    socket.to(data.target).emit("offer", { sdp: data.sdp, from: socket.id });
  });

  socket.on("answer", (data) => {
    socket.to(data.target).emit("answer", { sdp: data.sdp, from: socket.id });
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.target).emit("ice-candidate", {
      candidate: data.candidate,
      from: socket.id,
    });
  });

  socket.on("disconnect", () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("participant-left", socket.id);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log("🚀 Signaling server running on port", PORT);
});
