/**
 * Equipment Presets
 * Common aviation equipment configurations
 */

const EQUIPMENT_PRESETS = {
  dme: {
    name: 'DME',
    fullName: 'Distance Measuring Equipment',
    defaultPort: 4000,
    icon: '📡'
  },
  dvor: {
    name: 'DVOR',
    fullName: 'Doppler VHF Omnidirectional Range',
    defaultPort: 4001,
    icon: '📻'
  },
  localizer: {
    name: 'Localizer',
    fullName: 'ILS Localizer',
    defaultPort: 4002,
    icon: '🛬'
  },
  glidepath: {
    name: 'Glide Path',
    fullName: 'ILS Glide Path',
    defaultPort: 4003,
    icon: '📐'
  },
  vor: {
    name: 'VOR',
    fullName: 'VHF Omnidirectional Range',
    defaultPort: 4004,
    icon: '📶'
  },
  ils: {
    name: 'ILS',
    fullName: 'Instrument Landing System',
    defaultPort: 4005,
    icon: '✈️'
  }
};

// Array for easy iteration
const EQUIPMENT_PRESET_LIST = Object.keys(EQUIPMENT_PRESETS).map(key => ({
  id: key,
  ...EQUIPMENT_PRESETS[key]
}));
