/**
 * Equipment Validator
 * Validates equipment configuration inputs
 */

/**
 * Validate IPv4 address
 * @param {string} ip - IP address to validate
 * @returns {object} - {valid: boolean, error?: string}
 */
function validateIPv4(ip) {
  if (!ip || ip.trim() === '') {
    return { valid: false, error: 'IP address is required' };
  }

  if (ip === 'auto') {
    return { valid: true };
  }
  
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipRegex);
  
  if (!match) {
    return { valid: false, error: 'Invalid IP format. Expected: xxx.xxx.xxx.xxx' };
  }
  
  const octets = match.slice(1, 5).map(Number);
  const invalidOctet = octets.find(octet => octet > 255);
  
  if (invalidOctet !== undefined) {
    return { valid: false, error: 'IP octet must be 0-255' };
  }
  
  return { valid: true };
}

/**
 * Validate port number
 * @param {number|string} port - Port number to validate
 * @returns {object} - {valid: boolean, error?: string}
 */
function validatePort(port) {
  const portNum = Number(port);
  
  if (isNaN(portNum)) {
    return { valid: false, error: 'Port must be a number' };
  }
  
  if (!Number.isInteger(portNum)) {
    return { valid: false, error: 'Port must be an integer' };
  }
  
  if (portNum < 1024) {
    return { valid: false, error: 'Port must be >= 1024 (non-privileged)' };
  }
  
  if (portNum > 65535) {
    return { valid: false, error: 'Port must be <= 65535' };
  }
  
  return { valid: true };
}

/**
 * Validate equipment name
 * @param {string} name - Equipment name to validate
 * @returns {object} - {valid: boolean, error?: string}
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length < 3) {
    return { valid: false, error: 'Name must be at least 3 characters' };
  }
  
  if (trimmedName.length > 50) {
    return { valid: false, error: 'Name must be less than 50 characters' };
  }
  
  return { valid: true };
}

/**
 * Generate equipment ID from name
 * @param {string} name - Equipment name
 * @returns {string} - Generated ID
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
 * Validate complete equipment configuration
 * @param {object} config - Equipment configuration
 * @returns {object} - {valid: boolean, errors?: object}
 */
function validateEquipmentConfig(config) {
  const errors = {};
  let valid = true;

  // Validate name
  const nameValidation = validateName(config.name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.error;
    valid = false;
  }

  // Validate IP
  const ipValidation = validateIPv4(config.ip);
  if (!ipValidation.valid) {
    errors.ip = ipValidation.error;
    valid = false;
  }

  // Validate port
  const portValidation = validatePort(config.port);
  if (!portValidation.valid) {
    errors.port = portValidation.error;
    valid = false;
  }

  return { valid, errors: valid ? undefined : errors };
}

module.exports = {
  validateIPv4,
  validatePort,
  validateName,
  generateEquipmentId,
  validateEquipmentConfig
};
