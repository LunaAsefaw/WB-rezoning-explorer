
const WIND = 'Wind';
const OFFSHORE = 'Off-Shore Wind';
const SOLAR = 'Solar PV';
export const RESOURCES = {
  WIND, OFFSHORE, SOLAR
};

export const apiResourceNameMap = {
  [WIND]: 'wind',
  [SOLAR]: 'solar',
  [OFFSHORE]: 'offshore'
};

export const checkIncluded = (obj, resource) => {
  return obj.energy_type.includes(apiResourceNameMap[resource]);
};

export const resourceList = [
  {
    name: SOLAR,
    iconPath: 'assets/graphics/content/resourceIcons/solar-pv.svg'
  },
  {
    name: WIND,
    iconPath: 'assets/graphics/content/resourceIcons/wind.svg'
  },
  {
    name: OFFSHORE,
    iconPath: 'assets/graphics/content/resourceIcons/wind-offshore.svg'
  }
];

const SLIDER = 'slider';
const BOOL = 'boolean';
const MULTI = 'multi-select';
const TEXT = 'text';
const DROPDOWN = 'dropdown';
const GRID_OPTIONS = [25, 50];
const DEFAULT_RANGE = [0, 1000000];
const DEFAULT_UNIT = '%';

export const INPUT_CONSTANTS = {
  SLIDER,
  BOOL,
  MULTI,
  DROPDOWN,
  TEXT,
  GRID_OPTIONS,
  DEFAULT_UNIT,
  DEFAULT_RANGE
};

export const allowedTypes = new Map();
allowedTypes.set('range_filter', SLIDER);
allowedTypes.set('boolean', BOOL);
allowedTypes.set('categorical_filter', MULTI);

export const lcoeList = [
  {
    name: 'Turbine / Solar Unit Type',
    id: 'turbine_type',
    input: {
      type: TEXT,
      range: [0, 3]
    }
  },
  {
    name: 'Capital Recovery Factor',
    id: 'crf',
    input: {
      type: TEXT
    }
  },
  {
    name: 'Generation - capital [USD/kW]',
    id: 'cg',
    input: {
      type: TEXT
    }

  },
  {
    name: 'Generation - fixed O&M [USD/MW/y]',
    id: 'omfg',
    input: {
      type: TEXT
    }
  },
  {
    name: 'Generation - variable O&M [USD/MWh]',
    id: 'omvg',
    input: {
      type: TEXT
    }
  },
  {
    name: 'Transmission (land cabling) - capital [USD/MW/km]',
    id: 'ct',
    input: {
      type: TEXT
    }
  },
  {
    name: 'Transmission - fixed O&M [USD/km]',
    id: 'omft',
    input: {
      type: TEXT,
      default: 1

    }
  },
  {
    name: 'Substation - capital [USD / two substations (per new transmission connection) ]',
    id: 'cs',
    input: {
      type: TEXT,
      default: 1
    }
  },
  {
    name: 'Road - capital [USD/km]',
    id: 'cr',
    input: {
      type: TEXT,
      default: 1
    }
  },
  {
    name: 'Road - fixed O&M [USD/km]',
    id: 'omfr',
    input: {
      type: TEXT,
      default: 1
    }
  },
  {
    name: 'Decommission % rate',
    id: 'decom',
    input: {
      type: TEXT,
      default: 1
    }
  },
  {
    name: 'Economic discount rate',
    id: 'i',
    input: {
      type: TEXT,
      default: 1,
      range: [0.1, 100]
    }
  },
  {
    name: 'Lifetime [years]',
    id: 'n',
    input: {
      type: TEXT,
      default: 1,
      range: [1, 100]
    }
  },
  {
    name: 'Land Use Factor',
    id: 'landuse',
    input: {
      default: 1,
      range: [0, Infinity],
      type: TEXT
    }
  },
  /*
  {
    name: 'Capacity Factor',
    id: 'capfac',
    input: {
      type: DROPDOWN,
      options: ['opt1', 'opt2', 'opt3']
    }
  }, */

  {
    name: 'Technical Loss Factor',
    // TODO add correct id
    id: 'tlf',
    input: {
      default: 1,
      range: [0, 1],
      type: TEXT
    }
  },
  {
    name: 'Unavailability Factor',
    // TODO add correct id
    id: 'uf',
    input: {
      default: 1,
      range: [0, 1],
      type: TEXT
    }
  }
];

export const weightsList = [
  {
    name: 'LCOE Generation',
    id: 'lcoe_gen',
    default: 1,
    input: {
      type: SLIDER,
      range: [0, 1],
      default: 1
    }
  },
  {
    name: 'LCOE Transmission',
    id: 'lcoe_transmission',
    default: 1,
    input: {
      type: SLIDER,
      range: [0, 1],
      default: 1
    }

  },
  {
    name: 'LCOE Road',
    id: 'lcoe_road',
    default: 1,
    input: {
      type: SLIDER,
      range: [0, 1],
      default: 1
    }
  },
  {
    name: 'Distance to Load Centers',
    id: 'distance_load',
    default: 1,
    input: {
      type: SLIDER,
      range: [0, 1],
      default: 1
    }
  },
  {
    name: 'Population Density',
    id: 'pop_density',
    default: 1,
    input: {
      type: SLIDER,
      range: [0, 1],
      default: 1
    }
  },
  {
    name: 'Slope',
    id: 'slope',
    default: 1,
    input: {
      type: SLIDER,
      range: [0, 1],
      default: 1
    }
  }
];

export const presets = {};
