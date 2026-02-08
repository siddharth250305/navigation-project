/**
 * WebSocket Server
 * Provides real-time updates to frontend clients
 */

const WebSocket = require('ws');

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  /**
   * Initializes WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`WebSocket client connected from ${clientIp}`);
      
      this.clients.add(ws);

      // Send initial connection acknowledgment
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Navigation Monitoring System',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error.message);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket client disconnected from ${clientIp}`);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        this.clients.delete(ws);
      });

      // Setup ping/pong for connection health check
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Heartbeat to detect broken connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Every 30 seconds

    console.log('WebSocket server initialized');
  }

  /**
   * Handles messages from clients
   */
  handleClientMessage(ws, data) {
    console.log('Received from client:', data);
    
    // Handle ping/pong or other client messages if needed
    if (data.type === 'ping') {
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Broadcasts status update to all connected clients
   */
  broadcast(data) {
    const message = JSON.stringify({
      type: 'statusUpdate',
      data,
      timestamp: new Date().toISOString()
    });

    let successCount = 0;
    let failCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          console.error('Error sending to client:', error.message);
          failCount++;
        }
      }
    });

    if (successCount > 0) {
      console.log(`Broadcast to ${successCount} client(s)`);
    }
  }

  /**
   * Broadcasts port change notification to all connected clients
   */
  broadcastPortChange(oldPort, newPort) {
    const message = JSON.stringify({
      type: 'port_changed',
      data: {
        oldPort,
        newPort,
        timestamp: new Date().toISOString()
      }
    });

    let successCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          console.error('Error sending port change notification:', error.message);
        }
      }
    });

    console.log(`Port change notification sent to ${successCount} client(s)`);
  }

  /**
   * Sends message to specific client
   */
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Gets number of connected clients
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Closes WebSocket server
   */
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close();
      console.log('WebSocket server closed');
    }
  }
}

module.exports = new WebSocketServer();
