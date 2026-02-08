/**
 * Main Express Server
 * Provides REST API and serves frontend
 */

const express = require('express');
const path = require('path');
const config = require('./config');
const equipmentManager = require('./equipmentManager');
const udpListener = require('./udpListener');
const websocketServer = require('./websocketServer');
const equipmentRoutes = require('./routes/equipmentRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// CORS headers for API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// ==================== REST API Routes ====================

// Equipment management routes
app.use('/api/equipment', equipmentRoutes);

/**
 * GET /api/status
 * Get current status of all equipment
 */
app.get('/api/status', (req, res) => {
  try {
    const statuses = equipmentManager.getAllStatuses();
    res.json({
      success: true,
      data: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/status/:equipmentId
 * Get current status of specific equipment
 */
app.get('/api/status/:equipmentId', (req, res) => {
  try {
    const { equipmentId } = req.params;
    const status = equipmentManager.getStatus(equipmentId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found or no data available'
      });
    }
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting equipment status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/history/:equipmentId
 * Get recent event history for specific equipment
 */
app.get('/api/history/:equipmentId', (req, res) => {
  try {
    const { equipmentId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = equipmentManager.getHistory(equipmentId, limit);
    
    res.json({
      success: true,
      data: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/equipment
 * Get list of configured equipment
 */
app.get('/api/equipment', (req, res) => {
  try {
    const equipment = config.getAllEquipment();
    res.json({
      success: true,
      data: equipment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting equipment list:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/equipment/ports
 * Get all equipment with port information
 */
app.get('/api/equipment/ports', (req, res) => {
  try {
    const equipment = config.getAllEquipment();
    const portsInfo = equipment.map(eq => ({
      id: eq.id,
      name: eq.name,
      ip: eq.ip,
      port: eq.port,
      enabled: eq.enabled !== false,
      listening: udpListener.isListening(eq.port),
      lastPacket: equipmentManager.getLastUpdate(eq.id)
    }));
    res.json({ 
      success: true, 
      equipment: portsInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting ports info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/equipment/:id/port
 * Update individual equipment port
 */
app.post('/api/equipment/:id/port', (req, res) => {
  try {
    const { id } = req.params;
    const { port } = req.body;
    
    // Validate port
    if (!port || port < 1024 || port > 65535) {
      return res.status(400).json({
        success: false,
        error: 'Port must be between 1024 and 65535'
      });
    }
    
    // Check if port is already in use
    if (udpListener.isPortInUse(port, id)) {
      return res.status(409).json({
        success: false,
        error: `Port ${port} is already in use by another equipment`
      });
    }
    
    // Update port
    udpListener.updatePort(id, port);
    config.updateEquipmentPort(id, port);
    config.save();
    
    // Broadcast change via WebSocket
    websocketServer.broadcast({
      type: 'port_changed',
      equipment: id,
      port: port
    });
    
    res.json({
      success: true,
      message: `Port updated to ${port} for ${id}`,
      port: port
    });
  } catch (error) {
    console.error('Error updating port:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/equipment/ports/batch
 * Batch update all ports
 */
app.post('/api/equipment/ports/batch', (req, res) => {
  try {
    const { updates } = req.body; // Array of {id, port}
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates must be an array'
      });
    }
    
    const results = updates.map(update => {
      try {
        udpListener.updatePort(update.id, update.port);
        config.updateEquipmentPort(update.id, update.port);
        return { id: update.id, port: update.port, success: true };
      } catch (error) {
        return { id: update.id, port: update.port, success: false, error: error.message };
      }
    });
    
    config.save();
    
    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Error batch updating ports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const equipment = config.getAllEquipment();
  const ports = equipment.map(eq => eq.port).filter((v, i, a) => a.indexOf(v) === i); // unique ports
  
  res.json({
    success: true,
    status: 'running',
    ports: ports,
    webPort: config.server.webPort,
    connectedClients: websocketServer.getClientCount(),
    timestamp: new Date().toISOString()
  });
});

// ==================== Serve Frontend ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==================== Error Handling ====================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ==================== Server Initialization ====================

const PORT = config.server.webPort;

const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Navigation Aid Monitoring System - Server Started');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Web Dashboard: http://localhost:${PORT}`);
  console.log(`  API Endpoint:  http://localhost:${PORT}/api`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Configured Equipment (Multi-Port):');
  
  config.getAllEquipment().forEach(eq => {
    const status = eq.enabled !== false ? '✅' : '⏸️ ';
    console.log(`    ${status} ${eq.name.padEnd(15)} ${eq.ip.padEnd(15)} Port ${eq.port}`);
  });
  
  console.log('═══════════════════════════════════════════════════════════════');
});

// Initialize WebSocket server
websocketServer.initialize(server);

// Start UDP listener with callback for status updates
udpListener.start((status) => {
  // Broadcast status update to all WebSocket clients
  websocketServer.broadcast(status);
});

// Check connection status periodically
setInterval(() => {
  equipmentManager.checkConnectionStatus(30000);
}, 10000); // Check every 10 seconds

// ==================== Graceful Shutdown ====================

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('\nShutting down gracefully...');
  
  udpListener.stop();
  websocketServer.close();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after 10 seconds - graceful shutdown timeout exceeded');
    process.exit(1);
  }, 10000);
}

module.exports = app;
