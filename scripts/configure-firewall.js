#!/usr/bin/env node

/**
 * Firewall Configuration Helper
 * Configures firewall rules for multi-port UDP listener
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load equipment configuration
const configPath = path.resolve(__dirname, '../config/equipment.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function configureWindowsFirewall() {
  const equipment = config.equipment.filter(eq => eq.enabled !== false);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Configuring Windows Firewall for Multi-Port UDP Listener');
  console.log('═══════════════════════════════════════════════════════════════');
  
  equipment.forEach(eq => {
    const ruleName = `Navigation-${eq.name}-${eq.port}`;
    const command = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=UDP localport=${eq.port}`;
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Added rule for ${eq.name} on port ${eq.port}`);
    } catch (error) {
      console.error(`❌ Failed to add rule for ${eq.name}: ${error.message}`);
    }
  });
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Firewall configuration completed');
  console.log('═══════════════════════════════════════════════════════════════');
}

function configureLinuxFirewall() {
  const equipment = config.equipment.filter(eq => eq.enabled !== false);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Configuring Linux Firewall (ufw) for Multi-Port UDP Listener');
  console.log('═══════════════════════════════════════════════════════════════');
  
  equipment.forEach(eq => {
    try {
      execSync(`sudo ufw allow ${eq.port}/udp`, { stdio: 'inherit' });
      console.log(`✅ Allowed UDP port ${eq.port} for ${eq.name}`);
    } catch (error) {
      console.error(`❌ Failed to configure port ${eq.port}: ${error.message}`);
    }
  });
  
  try {
    execSync('sudo ufw reload', { stdio: 'inherit' });
    console.log('✅ Firewall reloaded');
  } catch (error) {
    console.error('❌ Failed to reload firewall');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Firewall configuration completed');
  console.log('═══════════════════════════════════════════════════════════════');
}

function showManualInstructions() {
  const equipment = config.equipment.filter(eq => eq.enabled !== false);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Manual Firewall Configuration Instructions');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nWindows (Run as Administrator):');
  equipment.forEach(eq => {
    console.log(`netsh advfirewall firewall add rule name="Navigation-${eq.name}" dir=in action=allow protocol=UDP localport=${eq.port}`);
  });
  
  console.log('\nLinux (ufw):');
  equipment.forEach(eq => {
    console.log(`sudo ufw allow ${eq.port}/udp`);
  });
  console.log('sudo ufw reload');
  
  console.log('\nLinux (iptables):');
  equipment.forEach(eq => {
    console.log(`sudo iptables -A INPUT -p udp --dport ${eq.port} -j ACCEPT`);
  });
  console.log('sudo iptables-save > /etc/iptables/rules.v4');
  
  console.log('\nmacOS:');
  console.log('macOS firewall typically allows incoming UDP by default.');
  console.log('If needed, configure via System Preferences > Security & Privacy > Firewall');
  
  console.log('═══════════════════════════════════════════════════════════════');
}

// Main execution
const platform = process.platform;
const args = process.argv.slice(2);

if (args.includes('--manual') || args.includes('-m')) {
  showManualInstructions();
} else if (platform === 'win32') {
  console.log('\n⚠️  This script requires administrator privileges on Windows');
  console.log('Please run Command Prompt as Administrator and execute this script\n');
  configureWindowsFirewall();
} else if (platform === 'linux') {
  console.log('\n⚠️  This script requires sudo privileges on Linux\n');
  configureLinuxFirewall();
} else if (platform === 'darwin') {
  console.log('\nmacOS detected. Showing manual instructions:\n');
  showManualInstructions();
} else {
  console.log('\nUnsupported platform. Showing manual instructions:\n');
  showManualInstructions();
}
