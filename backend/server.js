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

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// CORS headers for API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ==================== REST API Routes ====================

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
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    udpPort: config.server.udpPort,
    webPort: config.server.webPort,
    connectedClients: websocketServer.getClientCount(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/config/current
 * Get current configuration
 */
app.get('/api/config/current', (req, res) => {
  try {
    const currentConfig = config.getCurrentConfig();
    res.json({
      success: true,
      data: currentConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting current configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/config/port
 * Update UDP port configuration
 */
app.post('/api/config/port', async (req, res) => {
  try {
    const { port } = req.body;

    if (!port) {
      return res.status(400).json({
        success: false,
        error: 'Port number is required'
      });
    }

    // Validate port
    const validation = config.validatePort(port);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        port: parseInt(port)
      });
    }

    const newPort = parseInt(port);
    const oldPort = udpListener.getCurrentPort();

    // Check if port is the same as current
    if (newPort === oldPort) {
      return res.json({
        success: true,
        message: 'Port is already set to ' + newPort,
        port: newPort,
        timestamp: new Date().toISOString()
      });
    }

    // Update UDP listener to new port
    const result = await udpListener.updatePort(newPort);

    // Update config
    config.updateUdpPort(newPort);

    // Save configuration to file
    const saveResult = config.saveConfig();
    if (!saveResult.success) {
      console.warn(`[WARNING] Port updated but failed to save to config file: ${saveResult.error}`);
    }

    // Notify all WebSocket clients
    websocketServer.broadcastPortChange(oldPort, newPort);

    res.json({
      success: true,
      message: 'UDP port updated successfully',
      port: newPort,
      oldPort: oldPort,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[ERROR] Failed to update port: ${error.message}`);
    
    let errorMessage = error.message;
    let statusCode = 500;

    // Check for specific error types
    if (error.message.includes('already in use')) {
      statusCode = 409;
      errorMessage = error.message;
    } else if (error.message.includes('Permission denied')) {
      statusCode = 403;
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      port: req.body.port
    });
  }
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
  console.log(`  UDP Listener:  Port ${config.server.udpPort}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Configured Equipment:');
  
  config.getAllEquipment().forEach(eq => {
    console.log(`    - ${eq.name.padEnd(15)} ${eq.ip}:${eq.port}`);
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
