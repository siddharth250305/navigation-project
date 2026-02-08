/**
 * Equipment Management Routes
 * Provides CRUD operations for equipment configuration
 */

const express = require('express');
const router = express.Router();
const config = require('../config');
const udpListener = require('../udpListener');
const websocketServer = require('../websocketServer');
const validator = require('../validators/equipmentValidator');

/**
 * POST /api/equipment/add
 * Add new equipment
 */
router.post('/add', (req, res) => {
  try {
    const { name, ip, port, enabled, id } = req.body;

    // Validate inputs
    const validation = validator.validateEquipmentConfig({ name, ip, port });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    // Generate or use provided ID
    const equipmentId = id || validator.generateEquipmentId(name);

    // Check if ID already exists
    if (config.getEquipmentById(equipmentId)) {
      return res.status(409).json({
        success: false,
        error: `Equipment with ID '${equipmentId}' already exists`
      });
    }

    // Check port availability
    const portCheck = config.isPortAvailable(port);
    if (!portCheck.available) {
      const suggestedPort = config.getNextAvailablePort(port);
      return res.status(409).json({
        success: false,
        error: `Port ${port} is already in use by ${portCheck.usedBy}`,
        suggestedPort
      });
    }

    // Create equipment object
    const equipment = {
      id: equipmentId,
      name: name.trim(),
      ip: ip.trim(),
      port: parseInt(port),
      enabled: enabled !== false
    };

    // Add to configuration
    config.addEquipment(equipment);
    config.save();

    // Start UDP listener if enabled
    if (equipment.enabled) {
      udpListener.addEquipment(equipment);
    }

    // Broadcast to WebSocket clients
    websocketServer.broadcast({
      type: 'equipment_added',
      data: equipment,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      equipment,
      message: `Equipment '${equipment.name}' added successfully`
    });

  } catch (error) {
    console.error('Error adding equipment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/equipment/:id
 * Update equipment configuration
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if equipment exists
    const equipment = config.getEquipmentById(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    // Validate updates
    if (updates.name) {
      const nameValidation = validator.validateName(updates.name);
      if (!nameValidation.valid) {
        return res.status(400).json({
          success: false,
          error: nameValidation.error
        });
      }
    }

    if (updates.ip) {
      const ipValidation = validator.validateIPv4(updates.ip);
      if (!ipValidation.valid) {
        return res.status(400).json({
          success: false,
          error: ipValidation.error
        });
      }
    }

    if (updates.port !== undefined) {
      const portValidation = validator.validatePort(updates.port);
      if (!portValidation.valid) {
        return res.status(400).json({
          success: false,
          error: portValidation.error
        });
      }

      // Check if port is available (excluding current equipment)
      const portCheck = config.isPortAvailable(updates.port, id);
      if (!portCheck.available) {
        return res.status(409).json({
          success: false,
          error: `Port ${updates.port} is already in use by ${portCheck.usedBy}`
        });
      }
    }

    // Store old port for listener update
    const oldPort = equipment.port;
    const portChanged = updates.port !== undefined && updates.port !== oldPort;

    // Update configuration
    const updatedEquipment = config.updateEquipment(id, updates);
    config.save();

    // Update UDP listener if port changed
    if (portChanged && equipment.enabled) {
      udpListener.updatePort(id, updates.port);
    }

    // Update IP in listener if changed
    if (updates.ip && equipment.enabled) {
      udpListener.updateEquipmentIP(id, updates.ip);
    }

    // Broadcast to WebSocket clients
    websocketServer.broadcast({
      type: 'equipment_updated',
      data: {
        id,
        equipment: updatedEquipment,
        changes: updates
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      equipment: updatedEquipment,
      message: `Equipment '${updatedEquipment.name}' updated successfully`
    });

  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/equipment/:id/ip
 * Update only IP address
 */
router.put('/:id/ip', (req, res) => {
  try {
    const { id } = req.params;
    const { ip } = req.body;

    // Validate IP
    const ipValidation = validator.validateIPv4(ip);
    if (!ipValidation.valid) {
      return res.status(400).json({
        success: false,
        error: ipValidation.error
      });
    }

    // Update
    const equipment = config.updateEquipment(id, { ip: ip.trim() });
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    config.save();

    // Update listener
    if (equipment.enabled) {
      udpListener.updateEquipmentIP(id, ip.trim());
    }

    // Broadcast
    websocketServer.broadcast({
      type: 'equipment_updated',
      data: { id, equipment, changes: { ip: ip.trim() } }
    });

    res.json({
      success: true,
      ip: equipment.ip
    });

  } catch (error) {
    console.error('Error updating IP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/equipment/:id/port
 * Update only port number
 */
router.put('/:id/port', (req, res) => {
  try {
    const { id } = req.params;
    const { port } = req.body;

    // Validate port
    const portValidation = validator.validatePort(port);
    if (!portValidation.valid) {
      return res.status(400).json({
        success: false,
        error: portValidation.error
      });
    }

    // Check availability
    const portCheck = config.isPortAvailable(port, id);
    if (!portCheck.available) {
      return res.status(409).json({
        success: false,
        error: `Port ${port} is already in use by ${portCheck.usedBy}`
      });
    }

    // Update
    const equipment = config.updateEquipment(id, { port: parseInt(port) });
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    config.save();

    // Update listener (will restart on new port)
    if (equipment.enabled) {
      udpListener.updatePort(id, parseInt(port));
    }

    // Broadcast
    websocketServer.broadcast({
      type: 'equipment_updated',
      data: { id, equipment, changes: { port: parseInt(port) } }
    });

    res.json({
      success: true,
      port: equipment.port
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
 * DELETE /api/equipment/:id
 * Delete equipment
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if equipment exists
    const equipment = config.getEquipmentById(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    // Stop UDP listener
    if (equipment.enabled) {
      udpListener.removeEquipment(id);
    }

    // Remove from configuration
    config.removeEquipment(id);
    config.save();

    // Broadcast to WebSocket clients
    websocketServer.broadcast({
      type: 'equipment_removed',
      data: {
        id,
        name: equipment.name
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Equipment '${equipment.name}' deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/equipment/check-port
 * Check if port is available
 */
router.get('/check-port', (req, res) => {
  try {
    const { port, excludeId } = req.query;

    if (!port) {
      return res.status(400).json({
        success: false,
        error: 'Port parameter is required'
      });
    }

    // Validate port
    const portValidation = validator.validatePort(port);
    if (!portValidation.valid) {
      return res.status(400).json({
        success: false,
        error: portValidation.error
      });
    }

    const portCheck = config.isPortAvailable(parseInt(port), excludeId);
    const response = {
      available: portCheck.available,
      port: parseInt(port)
    };

    if (!portCheck.available) {
      response.usedBy = portCheck.usedBy;
      response.suggestedPort = config.getNextAvailablePort(parseInt(port) + 1);
    }

    res.json(response);

  } catch (error) {
    console.error('Error checking port:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/equipment/validate-ip
 * Validate IP address
 */
router.get('/validate-ip', (req, res) => {
  try {
    const { ip } = req.query;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP parameter is required'
      });
    }

    const validation = validator.validateIPv4(ip);
    res.json({
      valid: validation.valid,
      error: validation.error
    });

  } catch (error) {
    console.error('Error validating IP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/equipment/next-port
 * Get next available port
 */
router.get('/next-port', (req, res) => {
  try {
    const startPort = parseInt(req.query.start) || 4000;
    const nextPort = config.getNextAvailablePort(startPort);

    res.json({
      port: nextPort
    });

  } catch (error) {
    console.error('Error getting next port:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
