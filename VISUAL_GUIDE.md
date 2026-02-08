# 📸 Visual Guide - How to Run the System

This visual guide shows you exactly what to expect when running the Navigation Monitoring System.

## 🎯 What You'll See

After following the steps in [QUICKSTART.md](QUICKSTART.md), your system will look like this:

### Working Dashboard

![Navigation Monitoring Dashboard](https://github.com/user-attachments/assets/965ae9e5-c2f0-43c0-a8f3-3272b0b6c8f3)

**What you're seeing:**

✅ **Header Section (Top)**
- "🛫 Navigation Aid Monitoring System" title
- Green "● Connected" indicator (WebSocket is active)
- "Last Update" timestamp showing live updates

✅ **Equipment Cards (4 cards)**
Each card shows:
- **Equipment Name**: DME, DVOR, Localizer, Glide Path
- **Online Status**: Green "● Online" indicator
- **Path State**: Blue "ACTIVE" badge (or purple "STANDBY")
- **Equipment Status**: 
  - 🟢 Green "NORMAL" badge = All good
  - 🟡 Orange "WARNING" badge = Warning condition (shown in screenshot)
  - 🔴 Red "ALARM" badge = Critical alert
- **Last Update Time**: When the last data was received

✅ **Footer Section (Bottom)**
- System information: "Real-Time UDP Monitoring System | Port: 4000 | WebSocket: Active"

---

## 📋 Step-by-Step Visual Walkthrough

### Step 1: Install Dependencies

**Command:**
```bash
npm install
```

**What you'll see:**
```
added 70 packages, and audited 71 packages in 3s

16 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

✅ **Success indicator**: "found 0 vulnerabilities"

---

### Step 2: Start the Server

**Command:**
```bash
npm start
```

**What you'll see:**
```
═══════════════════════════════════════════════════════════════
  Navigation Aid Monitoring System - Server Started
═══════════════════════════════════════════════════════════════
  Web Dashboard: http://localhost:3000
  API Endpoint:  http://localhost:3000/api
  UDP Listener:  Port 4000
═══════════════════════════════════════════════════════════════
  Configured Equipment:
    - DME             192.168.1.100:4000
    - DVOR            192.168.1.101:4000
    - Localizer       192.168.1.102:4000
    - Glide Path      192.168.1.103:4000
═══════════════════════════════════════════════════════════════
UDP Listener started on 0.0.0.0:4000
```

✅ **Success indicators**:
- "Server Started" message
- "UDP Listener started" message
- No error messages

⚠️ **Keep this terminal open!** Don't close it.

---

### Step 3: Open Dashboard in Browser

**URL:**
```
http://localhost:3000
```

**What you'll see initially:**

```
┌────────────────────────────────────────────────┐
│ 🛫 Navigation Aid Monitoring System            │
│                                                 │
│ ● Connected                                     │
│ Last Update: Never                              │
├────────────────────────────────────────────────┤
│                                                 │
│         ⚠️ No Data Available                    │
│                                                 │
│    Waiting for UDP packets from                 │
│    navigation equipment...                      │
│                                                 │
│    ✓ Check that equipment is connected         │
│    ✓ Run the simulator: npm run simulator      │
│                                                 │
└────────────────────────────────────────────────┘
```

✅ **Success indicator**: Green "● Connected" status
⚠️ **Normal**: "No Data Available" is expected until simulator starts

---

### Step 4: Start the Simulator (New Terminal)

**Command:**
```bash
npm run simulator
```

**What you'll see:**
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
[2026-02-08T01:27:00.000Z] DME          → ACTIVE   | NORMAL   | Byte: 0xa0
[2026-02-08T01:27:00.001Z] DVOR         → ACTIVE   | WARNING  | Byte: 0xa8
[2026-02-08T01:27:00.002Z] Localizer    → ACTIVE   | ALARM    | Byte: 0xb0
[2026-02-08T01:27:00.003Z] Glide Path   → STANDBY  | NORMAL   | Byte: 0x80
```

✅ **Success indicators**:
- "Simulator Started" message
- Packet stream showing equipment names
- No error messages

**In the Server Terminal**, you'll now see:
```
─────────────────────────────────────────────────
[timestamp] UDP Packet Received
Source: 127.0.0.1:xxxxx
Length: 20 bytes
Hex: aa 55 01 00 a0 ...
─────────────────────────────────────────────────
Status Update - DME: ACTIVE | NORMAL
```

✅ **Success indicator**: "Status Update" messages appearing

---

### Step 5: Dashboard Updates Automatically! 🎉

**Switch back to your browser** and you'll see the dashboard transform:

The "No Data Available" message disappears and is replaced with **4 equipment cards** showing real-time status (see screenshot above).

**Status Changes**:
- Every 5 seconds, new UDP packets arrive
- Equipment status cycles through: NORMAL → WARNING → ALARM
- Path switches between: ACTIVE ↔ STANDBY
- Timestamps update in real-time
- Colors change to reflect status

---

## 🎨 Understanding the Color Coding

### Status Colors

| Color | Badge | Meaning |
|-------|-------|---------|
| 🟢 Green | NORMAL | Equipment operating normally |
| 🟡 Orange/Yellow | WARNING | Warning condition detected |
| 🔴 Red | ALARM | Critical alert - immediate attention needed |
| 🟣 Purple | FAULT | System fault detected |

### Path Colors

| Color | Badge | Meaning |
|-------|-------|---------|
| 🔵 Blue | ACTIVE | Equipment is actively operating |
| 🟣 Purple | STANDBY | Equipment is in standby mode |

### Connection Indicators

| Indicator | Meaning |
|-----------|---------|
| ● Online (green) | Equipment is connected and sending data |
| ● Offline (red) | No data received for 30+ seconds |

---

## 🔄 Real-Time Updates

Watch these elements update automatically:

1. **Status Badges** - Change color every 5 seconds
2. **Path Indicators** - Switch between ACTIVE/STANDBY
3. **Timestamps** - Update with each packet
4. **Connection Status** - Shows online/offline state
5. **Card Borders** - Change color to match status

---

## 📊 Example Status Progression

The simulator cycles through states. Here's what you'll see over time:

**First 5 seconds:**
```
DME: ACTIVE | NORMAL (green)
```

**Next 5 seconds:**
```
DME: ACTIVE | WARNING (orange)
```

**Next 5 seconds:**
```
DME: ACTIVE | ALARM (red)
```

**Next 5 seconds:**
```
DME: STANDBY | NORMAL (green)
```

And the cycle continues...

---

## 🎬 Animation Demo

When the system is working correctly, you'll notice:

- 💫 **Smooth transitions** between status colors
- 🔄 **Automatic updates** without page refresh
- ⚡ **Instant feedback** when simulator sends packets
- 📡 **Live timestamp** updates in header
- 🎯 **Card highlighting** when data changes

---

## 🎯 Verification Checklist

Use this checklist to confirm everything is working:

### Server Terminal
- [ ] Shows "Server Started" message
- [ ] Shows "UDP Listener started" message
- [ ] Shows "UDP Packet Received" messages
- [ ] Shows "Status Update" messages
- [ ] No red error messages

### Simulator Terminal
- [ ] Shows "Simulator Started" message
- [ ] Shows "Packet Stream" header
- [ ] Shows equipment names and statuses
- [ ] New lines appear every 5 seconds

### Browser Dashboard
- [ ] Page loads successfully
- [ ] Shows "Connected" status (green)
- [ ] Shows 4 equipment cards
- [ ] Each card has equipment name
- [ ] Each card shows path (ACTIVE/STANDBY)
- [ ] Each card shows status (NORMAL/WARNING/ALARM)
- [ ] Timestamps update automatically
- [ ] Colors change over time

### WebSocket Connection
- [ ] Header shows green "Connected" indicator
- [ ] No "Disconnected" message
- [ ] Last Update timestamp changes

---

## ❌ What Problems Look Like

### Problem: Port Already in Use

**In Terminal:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Fix:** Another app is using port 3000. Kill it or change port in `.env`

---

### Problem: Module Not Found

**In Terminal:**
```
Error: Cannot find module 'express'
```

**Fix:** Run `npm install` again

---

### Problem: No Data in Dashboard

**In Browser:**
Dashboard shows "No Data Available" message with troubleshooting tips.

**Fix:** Start the simulator: `npm run simulator`

---

### Problem: WebSocket Disconnected

**In Browser:**
Red "● Disconnected" indicator in header

**Fix:** 
1. Check if server is still running
2. Refresh the browser page
3. Check browser console for errors (F12)

---

## 🎓 What Success Looks Like

✅ **Two terminals running** (server + simulator)
✅ **Browser showing dashboard** with green "Connected"
✅ **Four equipment cards** visible
✅ **Status badges** changing colors every 5 seconds
✅ **Timestamps** updating automatically
✅ **No error messages** in any terminal

**That's it!** Your system is running successfully! 🎉

---

## 📚 Next Steps

Once you have the visual confirmation that everything works:

1. **Explore the API**: Try the examples in [QUICKSTART.md](QUICKSTART.md)
2. **Customize Configuration**: Edit `config/equipment.json`
3. **Read Full Docs**: See [README.md](README.md)
4. **Deploy to Production**: See deployment section in README

---

## 🆘 Still Stuck?

If your screen doesn't look like the screenshot above:

1. **Check Prerequisites**: Node.js 14+, npm 6+
2. **Read Error Messages**: Look for red text in terminals
3. **Follow Troubleshooting**: See [QUICKSTART.md](QUICKSTART.md) or [HOW_TO_RUN.txt](HOW_TO_RUN.txt)
4. **Verify Ports**: Make sure 3000 and 4000 are not in use

---

**Pro Tip**: Keep both terminals visible side-by-side with the browser to watch the data flow in real-time! 🚀
