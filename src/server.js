// server.js — TurboWarp Cloud Server with Persistence

const WebSocket = require("ws");
const fs = require("fs");

// ------------------------------
// Config
// ------------------------------
const PORT = process.env.PORT || 3000;
const DATA_FILE = "/data/cloud-data.json"; // Railway volume mount

// ------------------------------
// Load saved variables
// ------------------------------
let variables = {};
if (fs.existsSync(DATA_FILE)) {
  try {
    variables = JSON.parse(fs.readFileSync(DATA_FILE));
    console.log("Loaded saved cloud data.");
  } catch (err) {
    console.error("Failed to load cloud data:", err);
  }
}

// ------------------------------
// Function to save variables
// ------------------------------
function saveVariables() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(variables));
}

// ------------------------------
// Function to update variable
// ------------------------------
function updateVariable(name, value) {
  variables[name] = value;
  saveVariables();
}

// ------------------------------
// Start WebSocket server
// ------------------------------
const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`Cloud server running on port ${PORT}`);
});

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // Example TurboWarp cloud variable message format
      // { type: "set", name: "score", value: 100 }
      if (data.type === "set" && data.name) {
        updateVariable(data.name, data.value);

        // Broadcast to all clients
        const msg = JSON.stringify({ type: "update", name: data.name, value: data.value });
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) client.send(msg);
        });
      }

      // Optionally handle "get" requests
      if (data.type === "get" && data.name) {
        ws.send(JSON.stringify({ type: "update", name: data.name, value: variables[data.name] || 0 }));
      }

    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  // On connect, send all current variables
  ws.send(JSON.stringify({ type: "all", variables }));
});