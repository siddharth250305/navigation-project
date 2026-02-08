/**
 * Multi-Port UDP Listener
 * Listens for UDP packets from navigation equipment on dedicated ports
 */

const dgram = require('dgram');
const config = require('./config');
const icdDecoder = require('./icdDecoder');
const equipmentManager = require('./equipmentManager');

class MultiPortUDPListener {
  constructor() {
    this.sockets = new Map(); // Map<port, socket>
    this.equipmentMap = new Map(); // Map<port, equipmentConfig>
    this.onStatusUpdate = null; // Callback for status updates
  }

  /**
   * Starts the multi-port UDP listener
   */
  start(onStatusUpdate) {
    this.onStatusUpdate = onStatusUpdate;
    
    const equipment = config.getEnabledEquipment();
    
    if (equipment.length === 0) {
      console.warn('[UDP] No enabled equipment found in configuration');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Multi-Port UDP Listener Starting');
    console.log('═══════════════════════════════════════════════════════════════');
    
    equipment.forEach(eq => {
      this.startEquipmentListener(eq);
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  ✅ Multi-port listener started for ${this.sockets.size} equipment`);
    console.log('═══════════════════════════════════════════════════════════════');
  }

  /**
   * Starts listener for a specific equipment
   */
  startEquipmentListener(equipment) {
    // Check if port is already in use
    if (this.sockets.has(equipment.port)) {
      console.error(`[UDP] ❌ Port ${equipment.port} already in use by another equipment`);
      return;
    }

    // Create dedicated socket for this equipment
    const server = dgram.createSocket('udp4');
    
    server.on('listening', () => {
      const address = server.address();
      console.log(`  ${equipment.name.padEnd(15)} → Port ${equipment.port.toString().padStart(4)} ✅ Listening`);
    });

    server.on('message', (msg, rinfo) => {
      this.handleMessage(equipment, msg, rinfo);
    });

    server.on('error', (err) => {
      console.error(`[UDP] ❌ Error on ${equipment.name} port ${equipment.port}: ${err.message}`);
      // Remove from maps if error occurs
      this.sockets.delete(equipment.port);
      this.equipmentMap.delete(equipment.port);
    });

    // Bind to equipment's dedicated port
    server.bind(equipment.port, config.server.host);
    
    // Store references
    this.sockets.set(equipment.port, server);
    this.equipmentMap.set(equipment.port, equipment);
  }

  /**
   * Handles incoming UDP messages
   */
  handleMessage(equipment, msg, rinfo) {
    try {
      const sourceIp = rinfo.address;
      const sourcePort = rinfo.port;
      
      // Log received packet
      this.logPacket(equipment, msg, sourceIp, sourcePort);

      // Validate source IP matches expected equipment IP (with localhost exception)
      const isLocalhost = sourceIp === '127.0.0.1' || sourceIp === '::1' || sourceIp === '::ffff:127.0.0.1';
      
      if (!isLocalhost && equipment.ip !== sourceIp && !config.server.allowUnknownIPs) {
        console.warn(`[${equipment.name}] ⚠️  Source IP mismatch! Expected ${equipment.ip}, got ${sourceIp}`);
      }

      // Decode the packet
      const decoded = icdDecoder.decodePacket(msg);

      if (!decoded.valid) {
        console.warn(`[${equipment.name}] Invalid packet from ${sourceIp}: ${decoded.error}`);
        return;
      }

      // Update equipment status
      const status = equipmentManager.updateStatus(equipment.id, {
        ...decoded,
        sourceIP: sourceIp,
        sourcePort: sourcePort,
        listenPort: equipment.port
      });
      
      console.log(`[${equipment.name}:${equipment.port}] Status: ${status.path} | ${status.status}`);

      // Notify via callback (for WebSocket broadcast)
      if (this.onStatusUpdate) {
        this.onStatusUpdate(status);
      }

    } catch (error) {
      console.error(`[${equipment.name}] Error handling UDP message: ${error.message}`);
    }
  }

  /**
   * Logs packet information
   */
  logPacket(equipment, msg, sourceIp, sourcePort) {
    const timestamp = new Date().toISOString();
    const hexDump = msg.toString('hex').match(/.{1,2}/g).join(' ');
    
    console.log('─────────────────────────────────────────────────');
    console.log(`[${timestamp}] [${equipment.name}:${equipment.port}] UDP Packet`);
    console.log(`Source: ${sourceIp}:${sourcePort}`);
    console.log(`Length: ${msg.length} bytes`);
    console.log(`Hex: ${hexDump}`);
    console.log('─────────────────────────────────────────────────');
  }

  /**
   * Checks if a port is listening
   */
  isListening(port) {
    return this.sockets.has(port);
  }

  /**
   * Checks if a port is in use by another equipment
   */
  isPortInUse(port, excludeEquipmentId = null) {
    if (!this.sockets.has(port)) {
      return false;
    }
    
    const equipment = this.equipmentMap.get(port);
    if (equipment && equipment.id === excludeEquipmentId) {
      return false;
    }
    
    return true;
  }

  /**
   * Updates port for specific equipment
   */
  updatePort(equipmentId, newPort) {
    const equipment = config.getEquipmentById(equipmentId);
    
    if (!equipment) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }

    // Check if new port is already in use
    if (this.isPortInUse(newPort, equipmentId)) {
      throw new Error(`Port ${newPort} is already in use`);
    }

    // Stop old socket
    const oldPort = equipment.port;
    if (this.sockets.has(oldPort)) {
      const socket = this.sockets.get(oldPort);
      socket.close();
      this.sockets.delete(oldPort);
      this.equipmentMap.delete(oldPort);
      console.log(`[UDP] Closed ${equipment.name} port ${oldPort}`);
    }

    // Update port in equipment
    equipment.port = newPort;

    // Start new socket on new port
    this.startEquipmentListener(equipment);
    
    console.log(`[UDP] ✅ ${equipment.name} moved from port ${oldPort} to ${newPort}`);
  }

  /**
   * Gets statistics for a specific port
   */
  getPortInfo(port) {
    const equipment = this.equipmentMap.get(port);
    return {
      port: port,
      equipment: equipment ? equipment.name : 'Unknown',
      listening: this.sockets.has(port)
    };
  }

  /**
   * Add new equipment listener
   * @param {object} equipment - Equipment configuration
   */
  addEquipment(equipment) {
    if (this.sockets.has(equipment.port)) {
      throw new Error(`Port ${equipment.port} is already in use`);
    }

    this.startEquipmentListener(equipment);
    console.log(`[UDP] ✅ Added ${equipment.name} on port ${equipment.port}`);
  }

  /**
   * Remove equipment listener
   * @param {string} equipmentId - Equipment ID
   */
  removeEquipment(equipmentId) {
    // Find equipment by ID
    let portToRemove = null;
    for (const [port, equipment] of this.equipmentMap) {
      if (equipment.id === equipmentId) {
        portToRemove = port;
        break;
      }
    }

    if (portToRemove !== null) {
      const socket = this.sockets.get(portToRemove);
      if (socket) {
        socket.close();
        this.sockets.delete(portToRemove);
      }
      this.equipmentMap.delete(portToRemove);
      console.log(`[UDP] ✅ Removed equipment on port ${portToRemove}`);
      return true;
    }

    return false;
  }

  /**
   * Update equipment IP address
   * @param {string} equipmentId - Equipment ID
   * @param {string} newIP - New IP address
   */
  updateEquipmentIP(equipmentId, newIP) {
    for (const [port, equipment] of this.equipmentMap) {
      if (equipment.id === equipmentId) {
        equipment.ip = newIP;
        console.log(`[UDP] ✅ Updated ${equipment.name} IP to ${newIP}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Stops the UDP listener
   */
  stop() {
    console.log('[UDP] Stopping all listeners...');
    this.sockets.forEach((socket, port) => {
      socket.close();
      console.log(`[UDP] Closed port ${port}`);
    });
    this.sockets.clear();
    this.equipmentMap.clear();
    console.log('[UDP] All listeners stopped');
  }
}

module.exports = new MultiPortUDPListener();
