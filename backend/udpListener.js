/**
 * UDP Listener
 * Listens for UDP packets from navigation equipment
 */

const dgram = require('dgram');
const config = require('./config');
const icdDecoder = require('./icdDecoder');
const equipmentManager = require('./equipmentManager');

class UDPListener {
  constructor() {
    this.socket = null;
    this.port = config.server.udpPort;
    this.host = config.server.host;
    this.onStatusUpdate = null; // Callback for status updates
  }

  /**
   * Starts the UDP listener
   */
  start(onStatusUpdate) {
    this.onStatusUpdate = onStatusUpdate;
    
    this.socket = dgram.createSocket('udp4');

    this.socket.on('error', (err) => {
      console.error(`UDP Socket Error: ${err.message}`);
      this.socket.close();
    });

    this.socket.on('message', (msg, rinfo) => {
      this.handleMessage(msg, rinfo);
    });

    this.socket.on('listening', () => {
      const address = this.socket.address();
      console.log(`UDP Listener started on ${address.address}:${address.port}`);
    });

    this.socket.bind(this.port, this.host);
  }

  /**
   * Handles incoming UDP messages
   */
  handleMessage(msg, rinfo) {
    try {
      const sourceIp = rinfo.address;
      const sourcePort = rinfo.port;
      
      // Log received packet
      this.logPacket(msg, sourceIp, sourcePort);

      // Identify equipment by source IP
      let equipment = config.getEquipmentByIp(sourceIp);
      
      // For localhost testing (simulator), use a mapping table to maintain consistency
      if (!equipment && (sourceIp === '127.0.0.1' || sourceIp === '::1' || sourceIp === '::ffff:127.0.0.1')) {
        console.log(`Localhost packet from port ${sourcePort}, attempting to identify equipment...`);
        
        // Initialize port mapping if not exists
        if (!this.localhostPortMap) {
          this.localhostPortMap = new Map();
          this.nextEquipmentIndex = 0;
        }
        
        // Check if we've seen this source port before
        if (this.localhostPortMap.has(sourcePort)) {
          equipment = this.localhostPortMap.get(sourcePort);
        } else {
          // Assign next equipment to this source port
          const allEquipment = config.getAllEquipment();
          if (allEquipment.length > 0 && this.nextEquipmentIndex < allEquipment.length) {
            equipment = allEquipment[this.nextEquipmentIndex];
            this.localhostPortMap.set(sourcePort, equipment);
            this.nextEquipmentIndex++;
            console.log(`Assigned ${equipment.name} to source port ${sourcePort}`);
          }
        }
      }
      
      if (!equipment) {
        console.warn(`Unknown equipment from ${sourceIp}:${sourcePort}`);
        // Still decode for debugging
        const decoded = icdDecoder.decodePacket(msg);
        console.log('Decoded data:', decoded);
        return;
      }

      // Decode the packet
      const decoded = icdDecoder.decodePacket(msg);

      if (!decoded.valid) {
        console.warn(`Invalid packet from ${equipment.name} (${sourceIp}): ${decoded.error}`);
        return;
      }

      // Update equipment status
      const status = equipmentManager.updateStatus(equipment.id, decoded);
      
      console.log(`Status Update - ${equipment.name}: ${status.path} | ${status.status}`);

      // Notify via callback (for WebSocket broadcast)
      if (this.onStatusUpdate) {
        this.onStatusUpdate(status);
      }

    } catch (error) {
      console.error(`Error handling UDP message: ${error.message}`);
    }
  }

  /**
   * Logs packet information
   */
  logPacket(msg, sourceIp, sourcePort) {
    const timestamp = new Date().toISOString();
    const hexDump = msg.toString('hex').match(/.{1,2}/g).join(' ');
    
    console.log('─────────────────────────────────────────────────');
    console.log(`[${timestamp}] UDP Packet Received`);
    console.log(`Source: ${sourceIp}:${sourcePort}`);
    console.log(`Length: ${msg.length} bytes`);
    console.log(`Hex: ${hexDump}`);
    console.log('─────────────────────────────────────────────────');
  }

  /**
   * Stops the UDP listener
   */
  stop() {
    if (this.socket) {
      this.socket.close();
      console.log('UDP Listener stopped');
    }
  }

  /**
   * Closes the socket gracefully
   */
  closeSocket() {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        resolve();
        return;
      }

      try {
        this.socket.close(() => {
          console.log(`[UDP] Socket closed on port ${this.port}`);
          this.socket = null;
          resolve();
        });
      } catch (error) {
        console.error(`[ERROR] Error closing socket: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Updates the UDP port and restarts the listener
   */
  async updatePort(newPort) {
    try {
      const oldPort = this.port;
      console.log(`[CONFIG] Port change requested: ${oldPort} → ${newPort}`);

      // Close existing socket
      console.log(`[UDP] Closing socket on port ${oldPort}`);
      await this.closeSocket();

      // Update port
      this.port = newPort;

      // Rebind to new port
      return new Promise((resolve, reject) => {
        this.socket = dgram.createSocket('udp4');

        this.socket.on('error', (err) => {
          console.error(`[ERROR] UDP Socket Error on port ${newPort}: ${err.message}`);
          
          // Check for specific error types
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${newPort} is already in use`));
          } else if (err.code === 'EACCES') {
            reject(new Error(`Permission denied. Port ${newPort} requires administrator privileges`));
          } else {
            reject(new Error(`Failed to bind to port ${newPort}: ${err.message}`));
          }
          
          this.socket.close();
        });

        this.socket.on('message', (msg, rinfo) => {
          this.handleMessage(msg, rinfo);
        });

        this.socket.on('listening', () => {
          const address = this.socket.address();
          console.log(`[UDP] Successfully listening on ${address.address}:${address.port}`);
          resolve({
            success: true,
            oldPort,
            newPort,
            message: 'UDP port updated successfully'
          });
        });

        try {
          this.socket.bind(this.port, this.host);
        } catch (error) {
          reject(error);
        }
      });

    } catch (error) {
      console.error(`[ERROR] Failed to update port: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets the current port
   */
  getCurrentPort() {
    return this.port;
  }
}

module.exports = new UDPListener();
