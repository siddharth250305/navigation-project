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
    this.emptyState = null;
    
    this.init();
  }

  /**
   * Initialize application
   */
  init() {
    this.emptyState = new EmptyState();
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

        case 'equipment_added':
          this.handleEquipmentAdded(message.data);
          break;

        case 'equipment_updated':
          this.handleEquipmentUpdated(message.data);
          break;

        case 'equipment_removed':
          this.handleEquipmentRemoved(message.data);
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
    if (!status || !status.equipmentId) {
      console.warn('Invalid status update received:', status);
      return;
    }

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
    
    // Check if equipment list is empty
    const equipmentCount = Object.keys(this.equipmentData).length;
    
    if (equipmentCount === 0) {
      // Show empty state
      this.emptyState.show();
      return;
    }
    
    // Hide empty state if it's showing
    this.emptyState.hide();
    
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
    
    // Update IP
    const ipValue = card.querySelector('.ip-value');
    if (ipValue) {
      ipValue.textContent = equipment.ip || 'N/A';
    }
    
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

    // Setup event listeners for card buttons
    this.setupCardEventListeners(card, equipmentId);
  }

  /**
   * Setup event listeners for equipment card buttons
   */
  setupCardEventListeners(card, equipmentId) {
    // Card menu button
    const menuBtn = card.querySelector('.card-menu-btn');
    if (menuBtn) {
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        showCardMenu(e.target, equipmentId);
      };
    }

    // Edit IP button
    const editIpBtn = card.querySelector('.edit-ip-btn');
    if (editIpBtn) {
      editIpBtn.onclick = () => editEquipmentField(equipmentId, 'ip');
    }

    // Edit Port button
    const editPortBtn = card.querySelector('.edit-port-btn');
    if (editPortBtn) {
      editPortBtn.onclick = () => editEquipmentField(equipmentId, 'port');
    }
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
    const equipmentCount = Object.keys(this.equipmentData).length;
    const hasData = Object.values(this.equipmentData).some(eq => eq.status !== null);
    const noDataElement = document.getElementById('no-data');
    const gridElement = document.getElementById('equipment-grid');
    
    // If no equipment exists, empty state will handle the display
    if (equipmentCount === 0) {
      noDataElement.style.display = 'none';
      gridElement.style.display = 'none';
      return;
    }
    
    // If equipment exists but no data received yet, show cards anyway
    // (they will display as offline/disconnected)
    if (hasData) {
      noDataElement.style.display = 'none';
      gridElement.style.display = 'grid';
    } else {
      // Show the equipment cards even without data
      noDataElement.style.display = 'none';
      gridElement.style.display = 'grid';
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
    // Add equipment button
    const addBtn = document.getElementById('add-equipment-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openAddEquipmentModal());
    }

    // Send periodic ping to keep connection alive
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle equipment added event
   */
  handleEquipmentAdded(data) {
    this.equipmentData[data.id] = {
      id: data.id,
      name: data.name,
      ip: data.ip,
      port: data.port,
      status: null,
      path: null,
      timestamp: null,
      connected: false
    };
    
    this.renderEquipmentCards();
    showNotification(`Equipment '${data.name}' added successfully`, 'success');
  }

  /**
   * Handle equipment updated event
   */
  handleEquipmentUpdated(data) {
    if (this.equipmentData[data.id]) {
      Object.assign(this.equipmentData[data.id], data.equipment);
      this.updateEquipmentCard(data.id);
      showNotification(`Equipment '${data.equipment.name}' updated`, 'success');
    }
  }

  /**
   * Handle equipment removed event
   */
  handleEquipmentRemoved(data) {
    delete this.equipmentData[data.id];
    const card = document.querySelector(`[data-equipment-id="${data.id}"]`);
    if (card) {
      card.remove();
    }
    showNotification(`Equipment '${data.name}' deleted`, 'info');
    
    // Check if all equipment is removed
    if (Object.keys(this.equipmentData).length === 0) {
      this.emptyState.show();
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.monitoringApp = new MonitoringApp();
  setupModalHandlers();
});

// ==================== Equipment Management Functions ====================

let currentEquipmentId = null;

/**
 * Setup modal form handlers
 */
function setupModalHandlers() {
  // Add Equipment Form
  const addForm = document.getElementById('add-equipment-form');
  if (addForm) {
    addForm.addEventListener('submit', handleAddEquipment);
  }

  // Equipment type selector
  const typeSelect = document.getElementById('equipment-type-select');
  if (typeSelect) {
    typeSelect.addEventListener('change', handleEquipmentTypeChange);
  }

  // IP mode radio buttons
  document.querySelectorAll('input[name="ip-mode"]').forEach(radio => {
    radio.addEventListener('change', handleIpModeChange);
  });

  document.querySelectorAll('input[name="edit-ip-mode"]').forEach(radio => {
    radio.addEventListener('change', handleEditIpModeChange);
  });

  // Real-time validation
  const nameInput = document.getElementById('equipment-name');
  if (nameInput) {
    nameInput.addEventListener('input', validateEquipmentName);
  }

  const ipInput = document.getElementById('equipment-ip');
  if (ipInput) {
    ipInput.addEventListener('input', validateIpAddress);
  }

  const portInput = document.getElementById('equipment-port');
  if (portInput) {
    portInput.addEventListener('input', validatePortNumber);
  }

  // Edit Equipment Form
  const editForm = document.getElementById('edit-equipment-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditEquipment);
  }

  const editNameInput = document.getElementById('edit-equipment-name');
  if (editNameInput) {
    editNameInput.addEventListener('input', validateEditEquipmentName);
  }

  const editIpInput = document.getElementById('edit-equipment-ip');
  if (editIpInput) {
    editIpInput.addEventListener('input', validateEditIpAddress);
  }

  const editPortInput = document.getElementById('edit-equipment-port');
  if (editPortInput) {
    editPortInput.addEventListener('input', validateEditPortNumber);
  }

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

/**
 * Open Add Equipment Modal
 */
function openAddEquipmentModal() {
  const modal = document.getElementById('add-equipment-modal');
  modal.style.display = 'flex';
  
  // Reset form
  document.getElementById('add-equipment-form').reset();
  document.getElementById('equipment-name').style.display = 'none';
  document.getElementById('equipment-ip').style.display = 'none';
  document.getElementById('equipment-id').value = '';
  
  // Clear feedback
  clearFeedback();
  
  // Get next available port
  fetch('/api/equipment/next-port')
    .then(res => res.json())
    .then(data => {
      document.getElementById('equipment-port').value = data.port;
    });
}

/**
 * Close Add Equipment Modal
 */
function closeAddEquipmentModal() {
  document.getElementById('add-equipment-modal').style.display = 'none';
}

/**
 * Handle equipment type selection
 */
function handleEquipmentTypeChange(e) {
  const value = e.target.value;
  const nameInput = document.getElementById('equipment-name');
  const portInput = document.getElementById('equipment-port');
  const idInput = document.getElementById('equipment-id');

  if (value === 'custom') {
    nameInput.style.display = 'block';
    nameInput.value = '';
    nameInput.focus();
    idInput.value = '';
  } else if (value && EQUIPMENT_PRESETS[value]) {
    nameInput.style.display = 'none';
    const preset = EQUIPMENT_PRESETS[value];
    nameInput.value = preset.name;
    portInput.value = preset.defaultPort;
    idInput.value = value;
    validatePortNumber();
  } else {
    nameInput.style.display = 'none';
    nameInput.value = '';
    idInput.value = '';
  }
}

/**
 * Handle IP mode change
 */
function handleIpModeChange(e) {
  const ipInput = document.getElementById('equipment-ip');
  if (e.target.value === 'manual') {
    ipInput.style.display = 'block';
    ipInput.required = true;
  } else {
    ipInput.style.display = 'none';
    ipInput.required = false;
    ipInput.value = '';
  }
}

/**
 * Handle Edit IP mode change
 */
function handleEditIpModeChange(e) {
  const ipInput = document.getElementById('edit-equipment-ip');
  if (e.target.value === 'manual') {
    ipInput.style.display = 'block';
    ipInput.required = true;
  } else {
    ipInput.style.display = 'none';
    ipInput.required = false;
  }
}

/**
 * Validate equipment name
 */
function validateEquipmentName() {
  const nameInput = document.getElementById('equipment-name');
  const idInput = document.getElementById('equipment-id');
  const feedback = document.getElementById('name-feedback');
  
  const name = nameInput.value.trim();
  
  if (name.length < 3) {
    showFeedback(feedback, 'Name must be at least 3 characters', 'error');
    return false;
  }
  
  if (name.length > 50) {
    showFeedback(feedback, 'Name must be less than 50 characters', 'error');
    return false;
  }
  
  // Generate ID
  const id = generateEquipmentId(name);
  idInput.value = id;
  
  showFeedback(feedback, '✅ Valid name', 'success');
  return true;
}

/**
 * Validate IP address
 */
async function validateIpAddress() {
  const ipInput = document.getElementById('equipment-ip');
  const feedback = document.getElementById('ip-feedback');
  
  const ip = ipInput.value.trim();
  
  if (!ip) {
    clearFeedback(feedback);
    return false;
  }
  
  try {
    const response = await fetch(`/api/equipment/validate-ip?ip=${encodeURIComponent(ip)}`);
    const data = await response.json();
    
    if (data.valid) {
      showFeedback(feedback, '✅ Valid IPv4 address', 'success');
      return true;
    } else {
      showFeedback(feedback, `❌ ${data.error}`, 'error');
      return false;
    }
  } catch (error) {
    showFeedback(feedback, '❌ Error validating IP', 'error');
    return false;
  }
}

/**
 * Validate port number
 */
async function validatePortNumber() {
  const portInput = document.getElementById('equipment-port');
  const feedback = document.getElementById('port-feedback');
  
  const port = portInput.value;
  
  if (!port) {
    clearFeedback(feedback);
    return false;
  }
  
  try {
    const response = await fetch(`/api/equipment/check-port?port=${port}`);
    const data = await response.json();
    
    if (data.available) {
      showFeedback(feedback, '✅ Port is available', 'success');
      return true;
    } else {
      showFeedback(feedback, `❌ Port ${port} is used by ${data.usedBy}. Try ${data.suggestedPort}`, 'error');
      return false;
    }
  } catch (error) {
    showFeedback(feedback, '❌ Error checking port', 'error');
    return false;
  }
}

/**
 * Handle Add Equipment form submission
 */
async function handleAddEquipment(e) {
  e.preventDefault();
  
  const typeSelect = document.getElementById('equipment-type-select').value;
  const nameInput = document.getElementById('equipment-name');
  const ipMode = document.querySelector('input[name="ip-mode"]:checked').value;
  const ipInput = document.getElementById('equipment-ip');
  const portInput = document.getElementById('equipment-port');
  const idInput = document.getElementById('equipment-id');
  const enabledInput = document.getElementById('equipment-enabled');
  
  // Get name from select or input
  let name;
  if (typeSelect === 'custom') {
    name = nameInput.value.trim();
  } else if (typeSelect && EQUIPMENT_PRESETS[typeSelect]) {
    name = EQUIPMENT_PRESETS[typeSelect].name;
  } else {
    showNotification('Please select equipment type', 'error');
    return;
  }
  
  const ip = ipMode === 'auto' ? 'auto' : ipInput.value.trim();
  const port = parseInt(portInput.value);
  const id = idInput.value;
  const enabled = enabledInput.checked;
  
  try {
    const response = await fetch('/api/equipment/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ip, port, id, enabled })
    });
    
    const data = await response.json();
    
    if (data.success) {
      closeAddEquipmentModal();
      showNotification(data.message, 'success');
    } else {
      showNotification(data.error, 'error');
      if (data.suggestedPort) {
        portInput.value = data.suggestedPort;
      }
    }
  } catch (error) {
    showNotification('Error adding equipment: ' + error.message, 'error');
  }
}

/**
 * Open Edit Equipment Modal
 */
function openEditEquipmentModal(equipmentId) {
  currentEquipmentId = equipmentId;
  const modal = document.getElementById('edit-equipment-modal');
  const equipment = window.monitoringApp.equipmentData[equipmentId];
  
  if (!equipment) {
    showNotification('Equipment not found', 'error');
    return;
  }
  
  // Fill form
  document.getElementById('edit-equipment-id').value = equipment.id;
  document.getElementById('edit-equipment-name').value = equipment.name;
  document.getElementById('edit-equipment-port').value = equipment.port;
  document.getElementById('edit-equipment-enabled').checked = equipment.enabled !== false;
  
  // Set IP mode
  const isAuto = equipment.ip === 'auto';
  document.querySelector(`input[name="edit-ip-mode"][value="${isAuto ? 'auto' : 'manual'}"]`).checked = true;
  
  const editIpInput = document.getElementById('edit-equipment-ip');
  if (isAuto) {
    editIpInput.style.display = 'none';
    editIpInput.value = '';
  } else {
    editIpInput.style.display = 'block';
    editIpInput.value = equipment.ip;
  }
  
  modal.style.display = 'flex';
  clearFeedback();
}

/**
 * Close Edit Equipment Modal
 */
function closeEditEquipmentModal() {
  document.getElementById('edit-equipment-modal').style.display = 'none';
  currentEquipmentId = null;
}

/**
 * Validate edit equipment name
 */
function validateEditEquipmentName() {
  const nameInput = document.getElementById('edit-equipment-name');
  const feedback = document.getElementById('edit-name-feedback');
  
  const name = nameInput.value.trim();
  
  if (name.length < 3) {
    showFeedback(feedback, 'Name must be at least 3 characters', 'error');
    return false;
  }
  
  if (name.length > 50) {
    showFeedback(feedback, 'Name must be less than 50 characters', 'error');
    return false;
  }
  
  showFeedback(feedback, '✅ Valid name', 'success');
  return true;
}

/**
 * Validate edit IP address
 */
async function validateEditIpAddress() {
  const ipInput = document.getElementById('edit-equipment-ip');
  const feedback = document.getElementById('edit-ip-feedback');
  
  if (ipInput.style.display === 'none') {
    clearFeedback(feedback);
    return true;
  }
  
  const ip = ipInput.value.trim();
  
  if (!ip) {
    clearFeedback(feedback);
    return false;
  }
  
  try {
    const response = await fetch(`/api/equipment/validate-ip?ip=${encodeURIComponent(ip)}`);
    const data = await response.json();
    
    if (data.valid) {
      showFeedback(feedback, '✅ Valid IPv4 address', 'success');
      return true;
    } else {
      showFeedback(feedback, `❌ ${data.error}`, 'error');
      return false;
    }
  } catch (error) {
    showFeedback(feedback, '❌ Error validating IP', 'error');
    return false;
  }
}

/**
 * Validate edit port number
 */
async function validateEditPortNumber() {
  const portInput = document.getElementById('edit-equipment-port');
  const feedback = document.getElementById('edit-port-feedback');
  
  const port = portInput.value;
  
  if (!port) {
    clearFeedback(feedback);
    return false;
  }
  
  try {
    const response = await fetch(`/api/equipment/check-port?port=${port}&excludeId=${currentEquipmentId}`);
    const data = await response.json();
    
    if (data.available) {
      showFeedback(feedback, '✅ Port is available', 'success');
      return true;
    } else {
      showFeedback(feedback, `❌ Port ${port} is used by ${data.usedBy}`, 'error');
      return false;
    }
  } catch (error) {
    showFeedback(feedback, '❌ Error checking port', 'error');
    return false;
  }
}

/**
 * Handle Edit Equipment form submission
 */
async function handleEditEquipment(e) {
  e.preventDefault();
  
  const id = currentEquipmentId;
  const name = document.getElementById('edit-equipment-name').value.trim();
  const ipMode = document.querySelector('input[name="edit-ip-mode"]:checked').value;
  const ipInput = document.getElementById('edit-equipment-ip');
  const ip = ipMode === 'auto' ? 'auto' : ipInput.value.trim();
  const port = parseInt(document.getElementById('edit-equipment-port').value);
  const enabled = document.getElementById('edit-equipment-enabled').checked;
  
  try {
    const response = await fetch(`/api/equipment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ip, port, enabled })
    });
    
    const data = await response.json();
    
    if (data.success) {
      closeEditEquipmentModal();
      showNotification(data.message, 'success');
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Error updating equipment: ' + error.message, 'error');
  }
}

/**
 * Delete equipment
 */
function deleteEquipment() {
  const equipment = window.monitoringApp.equipmentData[currentEquipmentId];
  
  if (!equipment) {
    showNotification('Equipment not found', 'error');
    return;
  }
  
  // Show confirmation dialog
  document.getElementById('delete-equipment-name').textContent = equipment.name;
  document.getElementById('delete-equipment-ip').textContent = equipment.ip;
  document.getElementById('delete-equipment-port').textContent = equipment.port;
  
  document.getElementById('edit-equipment-modal').style.display = 'none';
  document.getElementById('delete-confirm-modal').style.display = 'flex';
}

/**
 * Close Delete Confirmation Modal
 */
function closeDeleteConfirmModal() {
  document.getElementById('delete-confirm-modal').style.display = 'none';
}

/**
 * Confirm delete equipment
 */
async function confirmDelete() {
  const id = currentEquipmentId;
  
  try {
    const response = await fetch(`/api/equipment/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      closeDeleteConfirmModal();
      showNotification(data.message, 'success');
      currentEquipmentId = null;
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Error deleting equipment: ' + error.message, 'error');
  }
}

/**
 * Show card menu
 */
function showCardMenu(button, equipmentId) {
  currentEquipmentId = equipmentId;
  const menu = document.getElementById('card-menu-popup');
  
  // Position menu
  const rect = button.getBoundingClientRect();
  menu.style.top = (rect.bottom + 5) + 'px';
  menu.style.left = (rect.left - 150) + 'px';
  menu.style.display = 'block';
  
  // Close menu on click outside
  setTimeout(() => {
    document.addEventListener('click', closeCardMenuOnClickOutside);
  }, 100);
}

/**
 * Close card menu on click outside
 */
function closeCardMenuOnClickOutside(e) {
  const menu = document.getElementById('card-menu-popup');
  if (!menu.contains(e.target)) {
    menu.style.display = 'none';
    document.removeEventListener('click', closeCardMenuOnClickOutside);
  }
}

/**
 * Edit equipment from menu
 */
function editEquipmentFromMenu() {
  document.getElementById('card-menu-popup').style.display = 'none';
  openEditEquipmentModal(currentEquipmentId);
}

/**
 * Delete equipment from menu
 */
function deleteEquipmentFromMenu() {
  document.getElementById('card-menu-popup').style.display = 'none';
  deleteEquipment();
}

/**
 * Edit equipment field inline
 */
async function editEquipmentField(equipmentId, field) {
  const equipment = window.monitoringApp.equipmentData[equipmentId];
  if (!equipment) return;
  
  const currentValue = equipment[field];
  const newValue = prompt(`Enter new ${field}:`, currentValue);
  
  if (!newValue || newValue === currentValue) return;
  
  try {
    const response = await fetch(`/api/equipment/${equipmentId}/${field}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: field === 'port' ? parseInt(newValue) : newValue })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(`${field} updated successfully`, 'success');
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification(`Error updating ${field}: ` + error.message, 'error');
  }
}

/**
 * Generate equipment ID from name
 */
function generateEquipmentId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Show feedback message
 */
function showFeedback(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = `form-feedback ${type}`;
  element.style.display = 'block';
}

/**
 * Clear feedback message
 */
function clearFeedback(element) {
  if (element) {
    element.textContent = '';
    element.style.display = 'none';
  } else {
    // Clear all feedback
    document.querySelectorAll('.form-feedback').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
  }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const toast = document.getElementById('notification-toast');
  const messageEl = document.getElementById('notification-message');
  
  messageEl.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// ==================== Empty State Functions ====================

/**
 * Open add equipment modal from empty state
 * Store reference before window assignment to avoid recursion
 */
const _openAddEquipmentModal = openAddEquipmentModal;
window.openAddEquipmentModal = function() {
  _openAddEquipmentModal();
};

/**
 * Load sample configuration
 */
window.loadSampleConfiguration = async function() {
  // Show confirmation dialog
  const confirmed = confirm(
    'Load Sample Configuration?\n\n' +
    'This will add 4 sample equipment:\n' +
    '• DME (Port 4000)\n' +
    '• DVOR (Port 4001)\n' +
    '• Localizer (Port 4002)\n' +
    '• Glide Path (Port 4003)\n\n' +
    'All will use auto-detect for IP address.\n\n' +
    'Click OK to continue.'
  );
  
  if (!confirmed) {
    return;
  }
  
  // Sample equipment to add
  const sampleEquipment = [
    { id: 'dme', name: 'DME', ip: 'auto', port: 4000, enabled: true },
    { id: 'dvor', name: 'DVOR', ip: 'auto', port: 4001, enabled: true },
    { id: 'localizer', name: 'Localizer', ip: 'auto', port: 4002, enabled: true },
    { id: 'glide-path', name: 'Glide Path', ip: 'auto', port: 4003, enabled: true }
  ];
  
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (const equipment of sampleEquipment) {
      try {
        const response = await fetch('/api/equipment/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(equipment)
        });
        
        const data = await response.json();
        
        if (data.success) {
          successCount++;
        } else {
          console.error(`Failed to add ${equipment.name}:`, data.error);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error adding ${equipment.name}:`, error);
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      showNotification(`Successfully added ${successCount} equipment!`, 'success');
    }
    
    if (errorCount > 0) {
      showNotification(`Failed to add ${errorCount} equipment. Check console for details.`, 'error');
    }
    
  } catch (error) {
    showNotification('Error loading sample configuration: ' + error.message, 'error');
  }
};


