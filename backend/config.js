/**
 * Configuration Manager
 * Loads and manages system configuration
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class Config {
  constructor() {
    this.webPort = parseInt(process.env.WEB_PORT || '3000');
    this.host = process.env.HOST || '0.0.0.0';
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    
    // Load equipment configuration
    this.configPath = process.env.EQUIPMENT_CONFIG_PATH || './config/equipment.json';
    this.loadEquipmentConfig(this.configPath);
  }

  loadEquipmentConfig(configPath) {
    try {
      const fullPath = path.resolve(configPath);
      this.configFilePath = fullPath;
      const data = fs.readFileSync(fullPath, 'utf8');
      const config = JSON.parse(data);
      
      this.equipment = config.equipment || [];
      
      // Server configuration
      this.server = {
        webPort: config.server?.webPort || this.webPort,
        host: config.server?.host || this.host,
        connectionTimeout: config.server?.connectionTimeout || 30000,
        allowUnknownIPs: config.server?.allowUnknownIPs || false
      };
      
      return this.equipment;
    } catch (error) {
      console.error(`Error loading equipment configuration: ${error.message}`);
      this.equipment = [];
      this.server = {
        webPort: this.webPort,
        host: this.host,
        connectionTimeout: 30000,
        allowUnknownIPs: false
      };
      return [];
    }
  }

  getEquipmentByIp(ip) {
    return this.equipment.find(eq => eq.ip === ip);
  }

  getEquipmentById(id) {
    return this.equipment.find(eq => eq.id === id);
  }

  getEquipmentByPort(port) {
    return this.equipment.find(eq => eq.port === port);
  }

  getAllEquipment() {
    return this.equipment;
  }

  getEnabledEquipment() {
    return this.equipment.filter(eq => eq.enabled !== false);
  }

  updateEquipmentPort(equipmentId, newPort) {
    const equipment = this.equipment.find(eq => eq.id === equipmentId);
    if (equipment) {
      equipment.port = newPort;
      return true;
    }
    return false;
  }

  /**
   * Add new equipment to configuration
   * @param {object} equipment - Equipment configuration
   * @returns {boolean} - Success status
   */
  addEquipment(equipment) {
    // Check if equipment with same ID already exists
    const existing = this.equipment.find(eq => eq.id === equipment.id);
    if (existing) {
      throw new Error(`Equipment with ID '${equipment.id}' already exists`);
    }

    // Check if port is already in use
    const portInUse = this.equipment.find(eq => eq.port === equipment.port);
    if (portInUse) {
      throw new Error(`Port ${equipment.port} is already in use by '${portInUse.name}'`);
    }

    this.equipment.push(equipment);
    return true;
  }

  /**
   * Update equipment configuration
   * @param {string} equipmentId - Equipment ID
   * @param {object} updates - Fields to update
   * @returns {object|null} - Updated equipment or null
   */
  updateEquipment(equipmentId, updates) {
    const equipment = this.equipment.find(eq => eq.id === equipmentId);
    if (!equipment) {
      return null;
    }

    // If port is being changed, check if new port is available
    if (updates.port !== undefined && updates.port !== equipment.port) {
      const portInUse = this.equipment.find(eq => eq.port === updates.port && eq.id !== equipmentId);
      if (portInUse) {
        throw new Error(`Port ${updates.port} is already in use by '${portInUse.name}'`);
      }
    }

    // If name is being changed, check if new name is unique
    if (updates.name !== undefined && updates.name !== equipment.name) {
      const nameInUse = this.equipment.find(eq => eq.name === updates.name && eq.id !== equipmentId);
      if (nameInUse) {
        throw new Error(`Equipment name '${updates.name}' is already in use`);
      }
    }

    // Apply updates
    Object.assign(equipment, updates);
    return equipment;
  }

  /**
   * Remove equipment from configuration
   * @param {string} equipmentId - Equipment ID to remove
   * @returns {boolean} - Success status
   */
  removeEquipment(equipmentId) {
    const index = this.equipment.findIndex(eq => eq.id === equipmentId);
    if (index === -1) {
      return false;
    }

    this.equipment.splice(index, 1);
    return true;
  }

  /**
   * Check if port is available
   * @param {number} port - Port to check
   * @param {string} excludeId - Equipment ID to exclude from check
   * @returns {object} - {available: boolean, usedBy?: string}
   */
  isPortAvailable(port, excludeId = null) {
    const equipment = this.equipment.find(eq => eq.port === port && eq.id !== excludeId);
    if (equipment) {
      return { available: false, usedBy: equipment.name };
    }
    return { available: true };
  }

  /**
   * Get next available port
   * @param {number} startPort - Starting port number
   * @returns {number} - Next available port
   */
  getNextAvailablePort(startPort = 4000) {
    const usedPorts = new Set(this.equipment.map(eq => eq.port));
    let port = startPort;
    
    while (usedPorts.has(port) && port <= 65535) {
      port++;
    }
    
    return port;
  }

  save() {
    try {
      const config = {
        equipment: this.equipment,
        server: this.server
      };
      fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error saving configuration: ${error.message}`);
      return false;
    }
  }
}

module.exports = new Config();
