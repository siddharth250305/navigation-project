# 🚀 Quick Start Guide - Navigation Monitoring System

This guide will help you run the project in **under 5 minutes**!

## 📋 Prerequisites Check

Before you begin, ensure you have:

```bash
# Check Node.js (need 14.x or higher)
node --version

# Check npm (need 6.x or higher)
npm --version
```

If you don't have Node.js installed, download it from [nodejs.org](https://nodejs.org/)

## 🎯 Three Ways to Run

### Option 1: Quick Demo (Recommended for First Time) ⚡

**Perfect for:** Testing the system, demonstrations, learning how it works

1️⃣ **Install Dependencies**
```bash
npm install
```

2️⃣ **Start the Server** (in Terminal 1)
```bash
npm start
```

Expected output:
```
═══════════════════════════════════════════════════════════════
  Navigation Aid Monitoring System - Server Started
═══════════════════════════════════════════════════════════════
  Web Dashboard: http://localhost:3000
  API Endpoint:  http://localhost:3000/api
  UDP Listener:  Port 4000
═══════════════════════════════════════════════════════════════
```

3️⃣ **Open Dashboard**
```bash
# Open in your browser:
http://localhost:3000
```

4️⃣ **Start the Simulator** (in Terminal 2 - new terminal window)
```bash
npm run simulator
```

Expected output:
```
═══════════════════════════════════════════════════════════════
  UDP Packet Simulator Started
═══════════════════════════════════════════════════════════════
  Packet Stream:
═══════════════════════════════════════════════════════════════
[timestamp] DME          → ACTIVE   | NORMAL   | Byte: 0xa0
[timestamp] DVOR         → ACTIVE   | WARNING  | Byte: 0xa8
```

5️⃣ **Watch the Magic! ✨**

The dashboard will now update in real-time showing:
- 🟢 Equipment status (NORMAL/WARNING/ALARM)
- 📊 ACTIVE/STANDBY states
- 🔄 Live updates every 5 seconds
- ✅ Connection status

---

### Option 2: Development Mode 🔧

**Perfect for:** Making code changes, debugging

```bash
# Terminal 1: Start server with auto-reload (if you add nodemon)
npm run dev

# Terminal 2: Start simulator for testing
npm run simulator

# Terminal 3: Open dashboard
# http://localhost:3000
```

---

### Option 3: Docker (Production-Like) 🐳

**Perfect for:** Clean environment, deployment testing

```bash
# Start both server and simulator
docker-compose up

# Access dashboard at:
# http://localhost:3000
```

To stop:
```bash
docker-compose down
```

---

## 🎬 Step-by-Step Visual Guide

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Install Dependencies                                │
│ $ npm install                                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Start Server (Terminal 1)                          │
│ $ npm start                                                 │
│ ✅ Server running on http://localhost:3000                  │
│ ✅ UDP Listener on port 4000                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Open Browser                                        │
│ Navigate to: http://localhost:3000                         │
│ 📱 You'll see the dashboard (empty at first)                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Start Simulator (Terminal 2)                       │
│ $ npm run simulator                                         │
│ 🎯 Sends UDP packets to localhost:4000                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Watch Real-Time Updates                            │
│ 🎉 Dashboard shows equipment status in real-time!           │
│ 🔄 Updates automatically via WebSocket                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the monitoring server |
| `npm run dev` | Start server (same as start) |
| `npm run simulator` | Run UDP packet simulator |
| `npm test` | Run tests (shows test info) |

---

## 🔍 Verification Checklist

After starting the system, verify everything is working:

✅ **Server Running**
- [ ] Terminal shows "Server Started" message
- [ ] No error messages in terminal
- [ ] Ports 3000 and 4000 are not in use by other apps

✅ **Dashboard Accessible**
- [ ] Browser opens http://localhost:3000
- [ ] Page shows "Navigation Aid Monitoring System" header
- [ ] WebSocket status shows "Connected" (green indicator)

✅ **Simulator Working**
- [ ] Simulator terminal shows packet stream
- [ ] Server terminal shows "UDP Packet Received" messages
- [ ] Dashboard shows equipment cards with status

✅ **Real-Time Updates**
- [ ] Equipment status changes every few seconds
- [ ] Timestamps update in real-time
- [ ] No "No Data Available" message

---

## ❌ Troubleshooting

### Problem: "Port already in use"

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find and kill the process using the port
# On Linux/Mac:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Problem: "Cannot find module"

**Error:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Re-install dependencies
rm -rf node_modules package-lock.json
npm install
```

### Problem: Dashboard shows "No Data Available"

**Symptoms:**
- Dashboard loads but shows no equipment
- Message: "Waiting for UDP packets..."

**Solution:**
1. Make sure simulator is running: `npm run simulator`
2. Check server terminal for "UDP Packet Received" messages
3. Wait 5-10 seconds for first packet

### Problem: WebSocket shows "Disconnected"

**Symptoms:**
- Red "Disconnected" indicator in dashboard header

**Solution:**
1. Refresh the browser page
2. Check if server is still running
3. Look for errors in browser console (F12)

---

## 🎓 What You Should See

### 1. Server Terminal
```
WebSocket server initialized
═══════════════════════════════════════════════════════════════
  Navigation Aid Monitoring System - Server Started
═══════════════════════════════════════════════════════════════
  Web Dashboard: http://localhost:3000
  API Endpoint:  http://localhost:3000/api
  UDP Listener:  Port 4000
═══════════════════════════════════════════════════════════════
UDP Listener started on 0.0.0.0:4000
─────────────────────────────────────────────────
[timestamp] UDP Packet Received
Source: 127.0.0.1:xxxxx
Length: 20 bytes
─────────────────────────────────────────────────
Status Update - DME: ACTIVE | NORMAL
```

### 2. Simulator Terminal
```
═══════════════════════════════════════════════════════════════
  UDP Packet Simulator Started
═══════════════════════════════════════════════════════════════
  Packet Stream:
═══════════════════════════════════════════════════════════════
[timestamp] DME          → ACTIVE   | NORMAL   | Byte: 0xa0
[timestamp] DVOR         → ACTIVE   | WARNING  | Byte: 0xa8
[timestamp] Localizer    → ACTIVE   | ALARM    | Byte: 0xb0
[timestamp] Glide Path   → STANDBY  | NORMAL   | Byte: 0x80
```

### 3. Dashboard (Browser)
- Header: "🛫 Navigation Aid Monitoring System"
- Status: "● Connected" (green)
- Equipment Cards (4):
  - **DME** - Active path, colored status badge
  - **DVOR** - Active path, colored status badge
  - **Localizer** - Active path, colored status badge
  - **Glide Path** - Standby path, colored status badge

---

## 🎯 Next Steps

Once you have the system running:

1. **Explore the API**
   ```bash
   # Get all equipment status
   curl http://localhost:3000/api/status
   
   # Get specific equipment
   curl http://localhost:3000/api/status/dme
   
   # Health check
   curl http://localhost:3000/api/health
   ```

2. **Customize Configuration**
   - Edit `config/equipment.json` to add/modify equipment
   - Edit `.env` to change ports

3. **Read Full Documentation**
   - See [README.md](README.md) for complete documentation
   - See [SECURITY_SUMMARY.md](SECURITY_SUMMARY.md) for security info

---

## 🆘 Still Need Help?

1. Check the [Troubleshooting section in README.md](README.md#troubleshooting)
2. Ensure prerequisites are met (Node.js 14+, npm 6+)
3. Try running with `--verbose` flag for more details
4. Check firewall settings (ports 3000 and 4000)

---

## 🎉 Success!

If you can see the dashboard updating with equipment status, **you're all set!**

The system is now:
- ✅ Receiving UDP packets
- ✅ Decoding ICD monitor bytes
- ✅ Broadcasting via WebSocket
- ✅ Displaying real-time status

**Ready for production?** See [README.md - Deployment](README.md#deployment) section.
