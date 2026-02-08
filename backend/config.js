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
