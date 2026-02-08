/**
 * Configuration Manager
 * Loads and manages system configuration
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class Config {
  constructor() {
    this.udpPort = parseInt(process.env.UDP_PORT || '4000');
    this.webPort = parseInt(process.env.WEB_PORT || '3000');
    this.host = process.env.HOST || '0.0.0.0';
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    
    // Load equipment configuration
    const configPath = process.env.EQUIPMENT_CONFIG_PATH || './config/equipment.json';
    this.equipment = this.loadEquipmentConfig(configPath);
  }

  loadEquipmentConfig(configPath) {
    try {
      const fullPath = path.resolve(configPath);
      const data = fs.readFileSync(fullPath, 'utf8');
      const config = JSON.parse(data);
      
      // Configuration priority order:
      // 1. Environment variables (highest - if explicitly set)
      // 2. Config file (runtime changes from dashboard are saved here)
      // 3. Default values (lowest)
      // Note: Dashboard changes update the config file, which takes precedence on next load
      const configUdpPort = config.server?.udpPort;
      const configWebPort = config.server?.webPort;
      const configHost = config.server?.host;
      
      this.server = {
        udpPort: process.env.UDP_PORT ? parseInt(process.env.UDP_PORT) : (configUdpPort || this.udpPort),
        webPort: process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : (configWebPort || this.webPort),
        host: process.env.HOST || configHost || this.host
      };
      
      return config.equipment || [];
    } catch (error) {
      console.error(`Error loading equipment configuration: ${error.message}`);
      return [];
    }
  }

  getEquipmentByIp(ip) {
    return this.equipment.find(eq => eq.ip === ip);
  }

  getEquipmentById(id) {
    return this.equipment.find(eq => eq.id === id);
  }

  getAllEquipment() {
    return this.equipment;
  }

  /**
   * Validates if a port number is valid
   */
  validatePort(port) {
    const portNum = parseInt(port);
    
    if (isNaN(portNum)) {
      return { valid: false, error: 'Port must be a valid number' };
    }
    
    if (portNum < 1024 || portNum > 65535) {
      return { valid: false, error: 'Port must be between 1024 and 65535' };
    }
    
    return { valid: true };
  }

  /**
   * Updates the UDP port configuration
   */
  updateUdpPort(newPort) {
    const validation = this.validatePort(newPort);
    if (!validation.valid) {
      return validation;
    }
    
    this.server.udpPort = parseInt(newPort);
    return { valid: true };
  }

  /**
   * Saves current configuration to file
   */
  saveConfig() {
    try {
      const configPath = process.env.EQUIPMENT_CONFIG_PATH || './config/equipment.json';
      const fullPath = path.resolve(configPath);
      
      const configData = {
        equipment: this.equipment,
        server: this.server
      };
      
      fs.writeFileSync(fullPath, JSON.stringify(configData, null, 2), 'utf8');
      console.log(`[CONFIG] Configuration saved to ${fullPath}`);
      return { success: true };
    } catch (error) {
      console.error(`[ERROR] Failed to save configuration: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gets current server configuration
   */
  getCurrentConfig() {
    return {
      udpPort: this.server.udpPort,
      webPort: this.server.webPort,
      host: this.server.host
    };
  }
}

module.exports = new Config();
