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
    
    // Server configuration
    this.server = {
      udpPort: this.udpPort,
      webPort: this.webPort,
      host: this.host
    };
  }

  loadEquipmentConfig(configPath) {
    try {
      const fullPath = path.resolve(configPath);
      const data = fs.readFileSync(fullPath, 'utf8');
      const config = JSON.parse(data);
      
      // Override with config file server settings if present
      if (config.server) {
        this.server = {
          udpPort: config.server.udpPort || this.udpPort,
          webPort: config.server.webPort || this.webPort,
          host: config.server.host || this.host
        };
      }
      
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
}

module.exports = new Config();
