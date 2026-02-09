/**
 * EmptyState Component
 * Displays when no equipment is configured
 */

class EmptyState {
  constructor() {
    this.container = null;
  }

  /**
   * Render the empty state UI
   */
  render() {
    const html = `
      <div class="empty-state">
        <div class="empty-state-icon">📡</div>
        <h2 class="empty-state-title">No Equipment Configured Yet</h2>
        <p class="empty-state-description">
          Get started by adding your first navigation equipment to begin monitoring.
        </p>
        
        <div class="quick-start-guide">
          <h3>Quick Start:</h3>
          <ol>
            <li>Click "Add New Equipment" button</li>
            <li>Enter equipment name (e.g., DME)</li>
            <li>Enter IP address or use auto-detect</li>
            <li>Enter UDP port number (e.g., 4000)</li>
            <li>Click "Add Equipment"</li>
          </ol>
          <p class="guide-footer">Your equipment will start monitoring instantly!</p>
        </div>

        <button class="btn-empty-state btn-add-first" onclick="window.openAddEquipmentModal()">
          ➕ Add Your First Equipment
        </button>

        <div class="empty-state-divider">
          <span>- OR -</span>
        </div>

        <button class="btn-empty-state btn-load-sample" onclick="window.loadSampleConfiguration()">
          📋 Load Sample Configuration
        </button>
        <p class="sample-config-description">
          (Adds DME, DVOR, Localizer, Glide Path)
        </p>
      </div>
    `;
    
    return html;
  }

  /**
   * Show the empty state
   */
  show() {
    const equipmentGrid = document.getElementById('equipment-grid');
    if (!equipmentGrid) return;

    // Remove existing empty state if any
    this.hide();

    // Create and insert empty state
    const emptyStateDiv = document.createElement('div');
    emptyStateDiv.id = 'empty-state-container';
    emptyStateDiv.innerHTML = this.render();
    
    // Insert before equipment grid
    equipmentGrid.parentNode.insertBefore(emptyStateDiv, equipmentGrid);
    
    // Hide the equipment grid
    equipmentGrid.style.display = 'none';
    
    this.container = emptyStateDiv;
  }

  /**
   * Hide the empty state
   */
  hide() {
    const existingEmptyState = document.getElementById('empty-state-container');
    if (existingEmptyState) {
      existingEmptyState.remove();
    }
    
    // Show the equipment grid
    const equipmentGrid = document.getElementById('equipment-grid');
    if (equipmentGrid) {
      equipmentGrid.style.display = 'grid';
    }
    
    this.container = null;
  }

  /**
   * Check if empty state is currently showing
   */
  isShowing() {
    return this.container !== null && document.getElementById('empty-state-container') !== null;
  }
}

// Make EmptyState available globally
if (typeof window !== 'undefined') {
  window.EmptyState = EmptyState;
}
