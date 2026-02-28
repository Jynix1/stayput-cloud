const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, 'cloudData.json');

let cloudData = {};

// Load data from file at startup
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            cloudData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            console.error('Failed to load cloudData.json:', e);
            cloudData = {};
        }
    }
}

// Save current cloudData to file
function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cloudData, null, 2));
}

// Get variables for a room
function getRoomVariables(roomId) {
    if (!cloudData[roomId]) cloudData[roomId] = {};
    return cloudData[roomId];
}

// Update a variable in a room
function setRoomVariable(roomId, varName, value) {
    if (!cloudData[roomId]) cloudData[roomId] = {};
    cloudData[roomId][varName] = value;
    saveData(); // optional: throttle if worried about performance
}

module.exports = {
    loadData,
    getRoomVariables,
    setRoomVariable
};
