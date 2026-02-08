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
    this.loadCurrentPort();
  }

  /**
   * Load current UDP port configuration
   */
  async loadCurrentPort() {
    try {
      const response = await fetch('/api/config/current');
      const result = await response.json();
      
      if (result.success && result.data) {
        const port = result.data.udpPort;
        this.updatePortDisplay(port);
      }
    } catch (error) {
      console.error('Error loading current port:', error);
    }
  }

  /**
   * Update port display in UI
   */
  updatePortDisplay(port) {
    const portInput = document.getElementById('udp-port');
    const currentPortSpan = document.getElementById('current-port');
    const footerPortSpan = document.getElementById('footer-port');
    
    if (portInput) portInput.value = port;
    if (currentPortSpan) currentPortSpan.textContent = port;
    if (footerPortSpan) footerPortSpan.textContent = port;
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
          
        case 'port_changed':
          this.handlePortChanged(message.data);
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
   * Handle port change notification from server
   */
  handlePortChanged(data) {
    console.log('Port changed:', data);
    this.updatePortDisplay(data.newPort);
    this.showNotification(
      `Port updated successfully from ${data.oldPort} to ${data.newPort}`,
      'success'
    );
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
      connected: status.connected
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

    // Port update button
    const updatePortBtn = document.getElementById('update-port-btn');
    if (updatePortBtn) {
      updatePortBtn.addEventListener('click', () => this.handlePortUpdate());
    }

    // Enter key in port input
    const portInput = document.getElementById('udp-port');
    if (portInput) {
      portInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handlePortUpdate();
        }
      });
    }
  }

  /**
   * Handle port update button click
   */
  async handlePortUpdate() {
    const portInput = document.getElementById('udp-port');
    const updateBtn = document.getElementById('update-port-btn');
    const port = parseInt(portInput.value);

    // Validate input
    if (isNaN(port)) {
      this.showNotification('Please enter a valid port number', 'error');
      return;
    }

    if (port < 1024 || port > 65535) {
      this.showNotification('Port must be between 1024 and 65535', 'error');
      return;
    }

    // Show loading state
    updateBtn.disabled = true;
    updateBtn.classList.add('loading');
    portInput.disabled = true;
    const originalText = updateBtn.textContent;
    updateBtn.textContent = 'Updating...';

    try {
      const response = await fetch('/api/config/port', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ port })
      });

      const result = await response.json();

      if (result.success) {
        this.updatePortDisplay(port);
        this.showNotification(result.message || `Port updated successfully to ${port}`, 'success');
      } else {
        this.showNotification(result.error || 'Failed to update port', 'error');
        // Restore previous port value
        this.loadCurrentPort();
      }

    } catch (error) {
      console.error('Error updating port:', error);
      this.showNotification('Network error. Failed to update port.', 'error');
      this.loadCurrentPort();
    } finally {
      // Remove loading state
      updateBtn.disabled = false;
      updateBtn.classList.remove('loading');
      portInput.disabled = false;
      updateBtn.textContent = originalText;
    }
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.className = `notification ${type}`;
    
    // Map notification type to icon
    const iconMap = {
      'success': '✅',
      'error': '❌',
      'warning': '⚠️'
    };
    const icon = iconMap[type] || '⚠️';
    
    notification.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    
    notification.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 5000);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new MonitoringApp();
});
