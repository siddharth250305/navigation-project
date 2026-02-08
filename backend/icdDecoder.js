/**
 * ICD Monitor Byte Decoder
 * Decodes ICD-defined monitor bytes from UDP payload
 */

class ICDDecoder {
  /**
   * Validates if a byte is a valid monitor byte
   * Valid condition: B7 = 1 AND B6 = 0
   * Binary pattern: 10xxxxxx
   */
  isValidMonitorByte(byte) {
    // Check if B7 is 1 and B6 is 0
    // B7 = 1 means byte >= 128 (0x80)
    // B6 = 0 means byte < 192 (0xC0)
    return (byte & 0x80) === 0x80 && (byte & 0x40) === 0x00;
  }

  /**
   * Decodes the Active/Standby state from a monitor byte
   * B5: 0 = STANDBY, 1 = ACTIVE
   */
  decodeActiveStandby(byte) {
    return (byte & 0x20) ? 'ACTIVE' : 'STANDBY';
  }

  /**
   * Decodes the status from a monitor byte
   * B4, B3: 00 = NORMAL, 01 = WARNING, 10 = ALARM, 11 = FAULT
   */
  decodeStatus(byte) {
    const statusBits = (byte >> 3) & 0x03;
    
    switch (statusBits) {
      case 0b00:
        return 'NORMAL';
      case 0b01:
        return 'WARNING';
      case 0b10:
        return 'ALARM';
      case 0b11:
        return 'FAULT';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Decodes a complete monitor byte
   */
  decodeByte(byte) {
    if (!this.isValidMonitorByte(byte)) {
      return null;
    }

    return {
      valid: true,
      path: this.decodeActiveStandby(byte),
      status: this.decodeStatus(byte),
      rawByte: byte,
      binaryRepresentation: byte.toString(2).padStart(8, '0')
    };
  }

  /**
   * Decodes a UDP payload and extracts monitor bytes
   * Returns the first valid monitor byte found
   */
  decodePayload(buffer) {
    const results = [];
    
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      const decoded = this.decodeByte(byte);
      
      if (decoded) {
        results.push({
          ...decoded,
          position: i
        });
      }
    }

    return results;
  }

  /**
   * Decodes UDP payload and returns the most relevant monitor byte
   * (First valid byte or aggregate status)
   */
  decodePacket(buffer) {
    const validBytes = this.decodePayload(buffer);
    
    if (validBytes.length === 0) {
      return {
        valid: false,
        error: 'No valid monitor bytes found in payload'
      };
    }

    // Return the first valid monitor byte
    // In production, you might want to implement more sophisticated logic
    // (e.g., voting, priority-based selection, etc.)
    return validBytes[0];
  }

  /**
   * Creates a test monitor byte with specified parameters
   * Useful for testing and simulation
   */
  createMonitorByte(path, status) {
    let byte = 0x80; // Set B7 = 1, B6 = 0 (10xxxxxx)
    
    // Set B5 for Active/Standby
    if (path === 'ACTIVE') {
      byte |= 0x20;
    }
    
    // Set B4, B3 for status
    let statusBits = 0;
    switch (status) {
      case 'NORMAL':
        statusBits = 0b00;
        break;
      case 'WARNING':
        statusBits = 0b01;
        break;
      case 'ALARM':
        statusBits = 0b10;
        break;
      case 'FAULT':
        statusBits = 0b11;
        break;
    }
    
    byte |= (statusBits << 3);
    
    return byte;
  }
}

module.exports = new ICDDecoder();
