/**
 * UDP Packet Simulator
 * Simulates UDP packets from navigation equipment for testing
 */

const dgram = require('dgram');
const path = require('path');
const fs = require('fs');

// Load equipment configuration
const configPath = path.resolve(__dirname, '../config/equipment.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// ICD Decoder for creating valid monitor bytes
class ICDEncoder {
  createMonitorByte(path, status) {
    let byte = 0x80; // Set B7 = 1, B6 = 0 (10xxxxxx)
    
    // Set B5 for Active/Standby
    if (path === 'ACTIVE') {
      byte |= 0x20;
    }
    
    // Set B4, B3 for status
    let statusBits = 0;
    switch (status) {
      case 'NORMAL':
        statusBits = 0b00;
        break;
      case 'WARNING':
        statusBits = 0b01;
        break;
      case 'ALARM':
        statusBits = 0b10;
        break;
      case 'FAULT':
        statusBits = 0b11;
        break;
    }
    
    byte |= (statusBits << 3);
    
    return byte;
  }
}

class UDPSimulator {
  constructor() {
    this.encoder = new ICDEncoder();
    this.equipment = config.equipment;
    this.targetHost = '127.0.0.1'; // localhost for testing
    this.targetPort = config.server?.udpPort || 4000;
    this.interval = 5000; // Send packet every 5 seconds
    this.currentStateIndex = 0;
    
    // Define test states to cycle through
    this.states = [
      { path: 'ACTIVE', status: 'NORMAL' },
      { path: 'ACTIVE', status: 'WARNING' },
      { path: 'ACTIVE', status: 'ALARM' },
      { path: 'STANDBY', status: 'NORMAL' },
      { path: 'STANDBY', status: 'WARNING' },
      { path: 'STANDBY', status: 'ALARM' }
    ];
    
    this.equipmentStates = {};
    
    // Initialize state for each equipment
    this.equipment.forEach((eq, index) => {
      this.equipmentStates[eq.id] = {
        ...eq,
        stateIndex: index % this.states.length, // Stagger initial states
        socket: dgram.createSocket('udp4')
      };
    });
  }

  /**
   * Creates a simulated UDP packet
   */
  createPacket(path, status) {
    // Create a buffer with monitor byte and some dummy data
    const monitorByte = this.encoder.createMonitorByte(path, status);
    
    // Create packet with header + monitor byte + some payload
    const packet = Buffer.alloc(20);
    
    // Add some header bytes
    packet[0] = 0xAA; // Sync byte
    packet[1] = 0x55; // Sync byte
    packet[2] = 0x01; // Version
    packet[3] = 0x00; // Reserved
    
    // Add monitor byte at position 4
    packet[4] = monitorByte;
    
    // Fill rest with dummy data
    for (let i = 5; i < 20; i++) {
      packet[i] = Math.floor(Math.random() * 256);
    }
    
    return packet;
  }

  /**
   * Sends packet from specific equipment
   */
  sendPacket(equipmentId) {
    const eq = this.equipmentStates[equipmentId];
    const state = this.states[eq.stateIndex];
    
    const packet = this.createPacket(state.path, state.status);
    
    // Set source port to match equipment configuration
    // Note: We can't actually set source IP in localhost simulation,
    // but we can vary the source port to distinguish equipment
    const sourcePort = eq.port + parseInt(eq.id.charCodeAt(eq.id.length - 1) || 0);
    
    // Bind socket to specific port if not already bound
    if (!eq.socket._bound) {
      try {
        eq.socket.bind(sourcePort);
        eq.socket._bound = true;
      } catch (error) {
        console.error(`Error binding socket for ${eq.name}:`, error.message);
      }
    }
    
    eq.socket.send(packet, this.targetPort, this.targetHost, (err) => {
      if (err) {
        console.error(`Error sending packet for ${eq.name}:`, err.message);
      } else {
        const timestamp = new Date().toISOString();
        console.log(
          `[${timestamp}] ${eq.name.padEnd(12)} → ${state.path.padEnd(8)} | ` +
          `${state.status.padEnd(8)} | Byte: 0x${packet[4].toString(16).padStart(2, '0')}`
        );
      }
    });
    
    // Cycle to next state
    eq.stateIndex = (eq.stateIndex + 1) % this.states.length;
  }

  /**
   * Starts the simulator
   */
  start() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  UDP Packet Simulator Started');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Target: ${this.targetHost}:${this.targetPort}`);
    console.log(`  Interval: ${this.interval}ms`);
    console.log(`  Equipment Count: ${this.equipment.length}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Simulating Equipment:');
    
    this.equipment.forEach(eq => {
      console.log(`    - ${eq.name}`);
    });
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Packet Stream:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Send initial packets
    Object.keys(this.equipmentStates).forEach(id => {
      this.sendPacket(id);
    });
    
    // Schedule periodic sends
    this.intervalId = setInterval(() => {
      Object.keys(this.equipmentStates).forEach(id => {
        this.sendPacket(id);
      });
    }, this.interval);
  }

  /**
   * Stops the simulator
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    Object.values(this.equipmentStates).forEach(eq => {
      if (eq.socket) {
        eq.socket.close();
      }
    });
    
    console.log('\nSimulator stopped');
  }
}

// ==================== Main ====================

const simulator = new UDPSimulator();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  simulator.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  simulator.stop();
  process.exit(0);
});

// Start simulator
simulator.start();
