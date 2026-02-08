/**
 * Frontend Application
 * Handles WebSocket connection and UI updates
 */

class MonitoringApp {
  constructor() {
    this.ws = null;
    this.equipmentData = {};
    this.reconnectInterval = null;
    this.reconnectDelay = 3000;
    this.maxReconnectDelay = 30000;
    this.currentReconnectDelay = this.reconnectDelay;
    
    this.init();
  }

  /**
   * Initialize application
   */
  init() {
    this.setupWebSocket();
    this.loadInitialData();
    this.setupEventListeners();
  }

  /**
   * Setup WebSocket connection
   */
  setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.updateConnectionStatus(true);
        this.currentReconnectDelay = this.reconnectDelay;
        
        if (this.reconnectInterval) {
          clearTimeout(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.updateConnectionStatus(false);
        this.scheduleReconnect();
      };
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule WebSocket reconnection
   */
  scheduleReconnect() {
    if (this.reconnectInterval) {
      return;
    }
    
    console.log(`Reconnecting in ${this.currentReconnectDelay / 1000} seconds...`);
    
    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null;
      this.setupWebSocket();
      
      // Exponential backoff
      this.currentReconnectDelay = Math.min(
        this.currentReconnectDelay * 1.5,
        this.maxReconnectDelay
      );
    }, this.currentReconnectDelay);
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'connection':
          console.log('Server message:', message.message);
          break;
          
        case 'statusUpdate':
          this.updateEquipmentStatus(message.data);
          break;
          
        case 'pong':
          // Handle pong response if needed
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Load initial data from REST API
   */
  async loadInitialData() {
    try {
      // Load equipment list
      const equipmentResponse = await fetch('/api/equipment');
      const equipmentResult = await equipmentResponse.json();
      
      if (equipmentResult.success) {
        equipmentResult.data.forEach(eq => {
          this.equipmentData[eq.id] = {
            id: eq.id,
            name: eq.name,
            ip: eq.ip,
            port: eq.port,
            status: null,
            path: null,
            timestamp: null,
            connected: false
          };
        });
        
        this.renderEquipmentCards();
      }
      
      // Load current status
      const statusResponse = await fetch('/api/status');
      const statusResult = await statusResponse.json();
      
      if (statusResult.success) {
        Object.entries(statusResult.data).forEach(([id, status]) => {
          this.updateEquipmentStatus(status);
        });
      }
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  /**
   * Update equipment status
   */
  updateEquipmentStatus(status) {
    if (!this.equipmentData[status.equipmentId]) {
      this.equipmentData[status.equipmentId] = {
        id: status.equipmentId,
        name: status.equipmentId.toUpperCase()
      };
      this.renderEquipmentCards();
    }
    
    this.equipmentData[status.equipmentId] = {
      ...this.equipmentData[status.equipmentId],
      status: status.status,
      path: status.path,
      timestamp: status.timestamp,
      connected: status.connected,
      sourceIP: status.sourceIP,
      sourcePort: status.sourcePort,
      listenPort: status.listenPort
    };
    
    this.updateEquipmentCard(status.equipmentId);
    this.updateLastUpdateTime();
    this.toggleNoDataMessage();
  }

  /**
   * Render equipment cards
   */
  renderEquipmentCards() {
    const grid = document.getElementById('equipment-grid');
    grid.innerHTML = '';
    
    Object.values(this.equipmentData).forEach(equipment => {
      const card = this.createEquipmentCard(equipment);
      grid.appendChild(card);
    });
    
    this.toggleNoDataMessage();
  }

  /**
   * Create equipment card element
   */
  createEquipmentCard(equipment) {
    const template = document.getElementById('equipment-card-template');
    const card = template.content.cloneNode(true);
    
    const cardElement = card.querySelector('.equipment-card');
    cardElement.setAttribute('data-equipment-id', equipment.id);
    
    const name = card.querySelector('.equipment-name');
    name.textContent = equipment.name;
    
    return card;
  }

  /**
   * Update equipment card with latest data
   */
  updateEquipmentCard(equipmentId) {
    const equipment = this.equipmentData[equipmentId];
    const card = document.querySelector(`[data-equipment-id="${equipmentId}"]`);
    
    if (!card) return;
    
    // Update connection indicator
    const connectionIndicator = card.querySelector('.connection-indicator');
    connectionIndicator.className = `connection-indicator ${equipment.connected ? 'connected' : 'disconnected'}`;
    connectionIndicator.textContent = equipment.connected ? '● Online' : '● Offline';
    
    // Update port
    const portValue = card.querySelector('.port-value');
    if (portValue) {
      portValue.textContent = equipment.listenPort || equipment.port || 'N/A';
    }
    
    // Update source IP
    const sourceIpValue = card.querySelector('.source-ip-value');
    if (sourceIpValue) {
      sourceIpValue.textContent = equipment.sourceIP || 'N/A';
    }
    
    // Update path
    const pathBadge = card.querySelector('.path-badge');
    pathBadge.textContent = equipment.path || 'N/A';
    pathBadge.className = `path-badge ${equipment.path ? equipment.path.toLowerCase() : ''}`;
    
    // Update status
    const statusBadge = card.querySelector('.status-badge-main');
    statusBadge.textContent = equipment.status || 'N/A';
    statusBadge.className = `status-badge-main ${equipment.status ? equipment.status.toLowerCase() : ''}`;
    
    // Update last update time
    const lastUpdateTime = card.querySelector('.last-update-time');
    if (equipment.timestamp) {
      lastUpdateTime.textContent = this.formatTimestamp(equipment.timestamp);
    } else {
      lastUpdateTime.textContent = 'Never';
    }
    
    // Add status class to card
    card.className = `equipment-card ${equipment.status ? equipment.status.toLowerCase() : ''}`;
  }

  /**
   * Update connection status in header
   */
  updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    statusElement.className = `status-badge ${connected ? 'connected' : 'disconnected'}`;
    statusElement.innerHTML = `
      <span class="status-dot"></span>
      ${connected ? 'Connected' : 'Disconnected'}
    `;
  }

  /**
   * Update last update time in header
   */
  updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('last-update');
    lastUpdateElement.textContent = `Last Update: ${new Date().toLocaleTimeString()}`;
  }

  /**
   * Toggle no data message
   */
  toggleNoDataMessage() {
    const hasData = Object.values(this.equipmentData).some(eq => eq.status !== null);
    const noDataElement = document.getElementById('no-data');
    const gridElement = document.getElementById('equipment-grid');
    
    if (hasData) {
      noDataElement.style.display = 'none';
      gridElement.style.display = 'grid';
    } else {
      noDataElement.style.display = 'flex';
      gridElement.style.display = 'none';
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Send periodic ping to keep connection alive
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new MonitoringApp();
});
