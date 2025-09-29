const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Serve HTML file and WebSocket on the same server
const server = http.createServer((req, res) => {
  // Serve blackbox.html
  const filePath = path.join(__dirname, 'blackbox.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

// WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

// Map to store connected clients with user info: { username, profilePic }
const clients = new Map();

wss.on('connection', (ws) => {
  let userInfo = null; // { username, profilePic }

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      // Invalid JSON, ignore or send error
      ws.send(JSON.stringify({ type: 'system', text: 'Invalid message format' }));
      return;
    }

    if (data.type === 'join') {
      // User joining with username and optional profilePic
      if (!data.username || typeof data.username !== 'string' || data.username.trim().length < 2) {
        ws.send(JSON.stringify({ type: 'system', text: 'Invalid username' }));
        return;
      }
      userInfo = {
        username: data.username.trim(),
        profilePic: data.profilePic || null,
      };
      clients.set(ws, userInfo);
      ws.send(JSON.stringify({ type: 'system', text: `Welcome, ${userInfo.username}!` }));

      // Notify others
      broadcastSystemMessage(`${userInfo.username} joined the chat`, ws);
      return;
    }

    if (!userInfo) {
      ws.send(JSON.stringify({ type: 'system', text: 'You must join first by sending a join message' }));
      return;
    }

    if (data.type === 'message') {
      if (!data.text || typeof data.text !== 'string' || data.text.trim() === '') {
        // Ignore empty messages
        return;
      }
      const text = data.text.trim();

      // Broadcast to all clients
      const outgoing = JSON.stringify({
        type: 'message',
        username: userInfo.username,
        profilePic: userInfo.profilePic,
        text,
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(outgoing);
        }
      });
    }
  });

  ws.on('close', () => {
    if (userInfo) {
      clients.delete(ws);
      broadcastSystemMessage(`${userInfo.username} left the chat`);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

function broadcastSystemMessage(text, excludeWs = null) {
  const msg = JSON.stringify({ type: 'system', text });
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Use Render's PORT or default to 8080
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});