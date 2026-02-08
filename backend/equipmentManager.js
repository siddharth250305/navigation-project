/**
 * Equipment Manager
 * Manages equipment state and history
 */

class EquipmentManager {
  constructor() {
    this.equipmentStatus = new Map();
    this.eventHistory = new Map();
    this.maxHistorySize = 100; // Keep last 100 events per equipment
  }

  /**
   * Updates equipment status
   */
  updateStatus(equipmentId, statusData) {
    const timestamp = new Date().toISOString();
    
    const status = {
      equipmentId,
      path: statusData.path,
      status: statusData.status,
      timestamp,
      lastUpdate: timestamp,
      connected: true,
      rawData: statusData.rawByte !== undefined ? statusData.rawByte : null,
      sourceIP: statusData.sourceIP || null,
      sourcePort: statusData.sourcePort || null,
      listenPort: statusData.listenPort || null
    };

    // Update current status
    this.equipmentStatus.set(equipmentId, status);

    // Add to history
    this.addToHistory(equipmentId, status);

    return status;
  }

  /**
   * Adds event to history
   */
  addToHistory(equipmentId, event) {
    if (!this.eventHistory.has(equipmentId)) {
      this.eventHistory.set(equipmentId, []);
    }

    const history = this.eventHistory.get(equipmentId);
    history.unshift(event); // Add to beginning

    // Trim history if too large
    if (history.length > this.maxHistorySize) {
      history.pop();
    }
  }

  /**
   * Gets current status for an equipment
   */
  getStatus(equipmentId) {
    return this.equipmentStatus.get(equipmentId) || null;
  }

  /**
   * Gets all equipment statuses
   */
  getAllStatuses() {
    const statuses = {};
    
    for (const [id, status] of this.equipmentStatus) {
      statuses[id] = status;
    }
    
    return statuses;
  }

  /**
   * Gets event history for an equipment
   */
  getHistory(equipmentId, limit = 50) {
    const history = this.eventHistory.get(equipmentId) || [];
    return history.slice(0, limit);
  }

  /**
   * Gets last update timestamp for equipment
   */
  getLastUpdate(equipmentId) {
    const status = this.equipmentStatus.get(equipmentId);
    return status ? status.timestamp : null;
  }

  /**
   * Marks equipment as disconnected if no update received
   */
  checkConnectionStatus(timeoutMs = 30000) {
    const now = Date.now();
    
    for (const [id, status] of this.equipmentStatus) {
      const lastUpdate = new Date(status.lastUpdate).getTime();
      
      if (now - lastUpdate > timeoutMs) {
        status.connected = false;
        this.equipmentStatus.set(id, status);
      }
    }
  }

  /**
   * Clears all data
   */
  clear() {
    this.equipmentStatus.clear();
    this.eventHistory.clear();
  }
}

module.exports = new EquipmentManager();
