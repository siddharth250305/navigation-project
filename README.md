# 🛫 Navigation Aid Monitoring System

A real-time monitoring system for aviation navigation equipment that receives UDP packets directly from navigation aids (DME, DVOR, Localizer, Glide Path), decodes ICD-defined monitor bytes, and displays equipment health status on a live web dashboard.

---

## 🚀 Want to Run This Right Now?

**👉 Choose your preferred guide:**

- **[QUICKSTART.md](QUICKSTART.md)** - Comprehensive 5-minute guide with troubleshooting
- **[VISUAL_GUIDE.md](VISUAL_GUIDE.md)** - Step-by-step with screenshots and visual examples
- **[HOW_TO_RUN.txt](HOW_TO_RUN.txt)** - Plain text format for easy copying

**Quick Commands:**
```bash
npm install          # Install dependencies
npm start            # Start server → http://localhost:3000
npm run simulator    # (In new terminal) Send test data
```

---

## Features

✅ **Real-Time UDP Monitoring** - Listens for UDP packets on configurable port (default: 4000)  
✅ **ICD Monitor Byte Decoding** - Decodes monitor bytes according to ICD specifications  
✅ **Live Web Dashboard** - Real-time status updates via WebSocket  
✅ **Multiple Equipment Support** - Monitor DME, DVOR, Localizer, and Glide Path simultaneously  
✅ **Status Indicators** - Visual representation of NORMAL/WARNING/ALARM states  
✅ **Path Monitoring** - ACTIVE/STANDBY path indication  
✅ **Connection Status** - Real-time connection monitoring  
✅ **Event History** - Historical data for each equipment  
✅ **REST API** - Programmatic access to status and history  
✅ **UDP Simulator** - Testing tool for development and demonstration  
✅ **Docker Support** - Easy deployment with Docker/Docker Compose  

## Table of Contents

- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [ICD Decoding Reference](#icd-decoding-reference)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Navigation Equipment                         │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  ┌────────────┐    │
│  │   DME   │  │  DVOR   │  │ Localizer  │  │ Glide Path │    │
│  └────┬────┘  └────┬────┘  └──────┬─────┘  └──────┬─────┘    │
│       │            │               │                │           │
│       └────────────┴───────────────┴────────────────┘           │
│                          │ UDP Packets                          │
└──────────────────────────┼──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Monitoring Server                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  UDP Listener (Port 4000)              │    │
│  └───────────────────┬────────────────────────────────────┘    │
│                      ▼                                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              ICD Monitor Byte Decoder                   │    │
│  └───────────────────┬────────────────────────────────────┘    │
│                      ▼                                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Equipment State Manager                    │    │
│  └───────────┬───────────────────────┬────────────────────┘    │
│              ▼                       ▼                           │
│  ┌─────────────────────┐  ┌─────────────────────────┐         │
│  │   REST API (3000)   │  │  WebSocket Server       │         │
│  └──────────┬──────────┘  └───────────┬─────────────┘         │
└─────────────┼──────────────────────────┼───────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Web Dashboard                               │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  Equipment Cards | Status | Alerts | History          │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- Network connectivity for UDP packets

### Quick Start

1. **Clone the repository:**
```bash
git clone <repository-url>
cd navigation-project
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment (optional):**
```bash
cp .env.example .env
# Edit .env if needed
```

4. **Start the server:**
```bash
npm start
```

5. **Open dashboard:**
```
http://localhost:3000
```

## Configuration

### Equipment Configuration

Edit `config/equipment.json` to configure your navigation equipment:

```json
{
  "equipment": [
    {
      "id": "dme",
      "name": "DME",
      "ip": "192.168.1.100",
      "port": 4000
    }
  ],
  "server": {
    "udpPort": 4000,
    "webPort": 3000,
    "host": "0.0.0.0"
  }
}
```

### Environment Variables

Create a `.env` file (or use `.env.example` as template):

```bash
# Server Configuration
UDP_PORT=4000
WEB_PORT=3000
HOST=0.0.0.0

# Logging
LOG_LEVEL=INFO

# Equipment Configuration
EQUIPMENT_CONFIG_PATH=./config/equipment.json
```

## Usage

### Start the Monitoring System

```bash
npm start
```

The system will:
- Start UDP listener on port 4000
- Start web server on port 3000
- Initialize WebSocket for real-time updates
- Display dashboard at http://localhost:3000

### Using the Dashboard

The dashboard displays:
- **Equipment Cards** - One card per configured equipment
- **Status Indicators** - Color-coded status (Green=Normal, Yellow=Warning, Red=Alarm)
- **Path Information** - ACTIVE or STANDBY
- **Connection Status** - Online/Offline indicator
- **Last Update Time** - Timestamp of last received packet
- **WebSocket Status** - Connection status in header

### Color Coding

🟢 **Green (NORMAL)** - Equipment operating normally  
🟡 **Yellow (WARNING)** - Warning condition detected  
🔴 **Red (ALARM)** - Alarm condition - immediate attention required  
🟣 **Purple (FAULT)** - System fault detected  

## Testing

### Using the UDP Simulator

The included simulator sends test UDP packets to localhost:

```bash
npm run simulator
```

The simulator will:
- Send packets for all configured equipment
- Cycle through different states (NORMAL → WARNING → ALARM)
- Alternate between ACTIVE and STANDBY paths
- Send packets every 5 seconds

### Simulator Output

```
═══════════════════════════════════════════════════════════════
  UDP Packet Simulator Started
═══════════════════════════════════════════════════════════════
  Target: 127.0.0.1:4000
  Interval: 5000ms
  Equipment Count: 4
═══════════════════════════════════════════════════════════════
  Packet Stream:
═══════════════════════════════════════════════════════════════
[2024-01-01T00:00:00.000Z] DME          → ACTIVE   | NORMAL   | Byte: 0xa0
[2024-01-01T00:00:00.001Z] DVOR         → ACTIVE   | WARNING  | Byte: 0xa8
```

### Manual Testing with netcat

Send a test UDP packet:

```bash
# Send hex bytes (example: 0xAA 0x55 0x01 0x00 0xA0)
echo -n -e '\xAA\x55\x01\x00\xA0' | nc -u -w1 localhost 4000
```

### Network Verification

#### Using tcpdump (Linux/Mac):

```bash
# Listen on UDP port 4000
sudo tcpdump -i any -n udp port 4000 -X
```

#### Using Wireshark:

1. Open Wireshark
2. Set capture filter: `udp.port == 4000`
3. Start capture
4. Run simulator or send test packets
5. Verify packets are received

## API Documentation

### REST API Endpoints

#### Get All Equipment Status
```http
GET /api/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dme": {
      "equipmentId": "dme",
      "path": "ACTIVE",
      "status": "NORMAL",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "connected": true
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Get Specific Equipment Status
```http
GET /api/status/:equipmentId
```

**Example:**
```bash
curl http://localhost:3000/api/status/dme
```

#### Get Event History
```http
GET /api/history/:equipmentId?limit=50
```

**Example:**
```bash
curl http://localhost:3000/api/history/dme?limit=100
```

#### Get Equipment List
```http
GET /api/equipment
```

#### Health Check
```http
GET /api/health
```

### WebSocket API

Connect to WebSocket:
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
};
```

**Message Types:**

- `connection` - Initial connection acknowledgment
- `statusUpdate` - Real-time equipment status update
- `pong` - Response to ping

**Status Update Format:**
```json
{
  "type": "statusUpdate",
  "data": {
    "equipmentId": "dme",
    "path": "ACTIVE",
    "status": "NORMAL",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "connected": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## ICD Decoding Reference

### Monitor Byte Structure

Valid monitor bytes must meet the condition: **B7 = 1 AND B6 = 0**

```
Bit Pattern: 1 0 X X X X X X
             │ │ └─────────┘
             │ │      └── Additional status bits
             │ └───────── B6 must be 0
             └─────────── B7 must be 1
```

### Byte Decoding

```
B7 B6 B5 B4 B3 B2 B1 B0
│  │  │  │  │
│  │  │  └──┴── Status Bits
│  │  │         00 = NORMAL
│  │  │         01 = WARNING
│  │  │         10 = ALARM
│  │  │         11 = FAULT
│  │  │
│  │  └──────── Path Bit
│  │            0 = STANDBY
│  │            1 = ACTIVE
│  │
│  └─────────── Must be 0 (validation)
│
└────────────── Must be 1 (validation)
```

### Examples

| Hex  | Binary    | Path    | Status  |
|------|-----------|---------|---------|
| 0xA0 | 10100000  | ACTIVE  | NORMAL  |
| 0xA8 | 10101000  | ACTIVE  | WARNING |
| 0xB0 | 10110000  | ACTIVE  | ALARM   |
| 0x80 | 10000000  | STANDBY | NORMAL  |
| 0x88 | 10001000  | STANDBY | WARNING |
| 0x90 | 10010000  | STANDBY | ALARM   |

## Troubleshooting

### No Data Received

**Problem:** Dashboard shows "No Data Available"

**Solutions:**

1. **Check Equipment Connection:**
   ```bash
   # Verify equipment is reachable
   ping 192.168.1.100
   ```

2. **Verify UDP Port:**
   ```bash
   # Check if server is listening
   netstat -an | grep 4000
   # Or on Linux:
   sudo lsof -i :4000
   ```

3. **Test with Simulator:**
   ```bash
   # Run simulator in separate terminal
   npm run simulator
   ```

4. **Check Firewall:**
   ```bash
   # Linux (allow UDP 4000)
   sudo ufw allow 4000/udp
   
   # Or disable firewall temporarily
   sudo ufw disable
   ```

### WebSocket Not Connecting

**Problem:** Dashboard shows "Disconnected" status

**Solutions:**

1. **Check server is running:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Check browser console** for WebSocket errors

3. **Verify port 3000 is not blocked** by firewall

### Invalid Monitor Bytes

**Problem:** Packets received but not decoded

**Check:**

1. **Review server logs** - Look for "Invalid packet" messages
2. **Verify byte format** - B7=1, B6=0 (binary: 10xxxxxx)
3. **Check packet structure** - Monitor byte should be in correct position

### Equipment Shows Offline

**Problem:** Equipment status shows offline despite sending packets

**Solutions:**

1. **Check IP configuration** in `config/equipment.json`
2. **Verify source IP** in server logs matches configured IP
3. **Check connection timeout** (default: 30 seconds)

## Deployment

### Development

```bash
npm run dev
```

### Production with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start backend/server.js --name navigation-monitoring

# View logs
pm2 logs navigation-monitoring

# Monitor
pm2 monit

# Auto-start on system boot
pm2 startup
pm2 save
```

### Docker Deployment

#### Build and Run:

```bash
# Build image
docker build -t navigation-monitoring .

# Run container
docker run -d \
  --name navigation-monitoring \
  -p 3000:3000 \
  -p 4000:4000/udp \
  navigation-monitoring
```

#### Using Docker Compose:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### systemd Service (Linux)

Create `/etc/systemd/system/navigation-monitoring.service`:

```ini
[Unit]
Description=Navigation Aid Monitoring System
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/navigation-project
ExecStart=/usr/bin/node backend/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable navigation-monitoring
sudo systemctl start navigation-monitoring
sudo systemctl status navigation-monitoring
```

## Project Structure

```
navigation-project/
├── backend/
│   ├── server.js              # Main Express server
│   ├── udpListener.js         # UDP packet listener
│   ├── icdDecoder.js          # ICD monitor byte decoder
│   ├── websocketServer.js     # WebSocket server
│   ├── equipmentManager.js    # Equipment state management
│   └── config.js              # Configuration manager
├── frontend/
│   ├── index.html             # Dashboard UI
│   ├── styles.css             # Styling
│   └── app.js                 # Frontend logic
├── simulator/
│   └── udpSimulator.js        # UDP packet simulator
├── config/
│   └── equipment.json         # Equipment configuration
├── package.json               # Dependencies
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Docker Compose setup
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## Technologies Used

- **Backend**: Node.js, Express
- **Real-Time**: WebSocket (ws library)
- **Networking**: UDP (dgram module)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Docker, Docker Compose

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Built for Aviation Navigation Aid Monitoring** 🛫
