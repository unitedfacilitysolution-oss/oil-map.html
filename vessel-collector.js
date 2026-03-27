// ══════════════════════════════════════════════════════════════════
// UFS VESSEL COLLECTOR v2.3
// United Facility Solution — Market Intelligence Platform
//
// What this does every 2 hours:
// 1. Collects 500 crude tanker positions from AISstream
//    using global bounding boxes targeting major crude routes
// 2. Classifies vessels by size with confidence scoring
// 3. Detects voyage starts and ends
// 4. Closes the learning loop when voyages complete
// 5. Seeds new voyage records for mid-ocean vessels
// ══════════════════════════════════════════════════════════════════

const WebSocket = require('ws');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const AISSTREAM_KEY = process.env.AISSTREAM_KEY;

const TARGET = 500;       // Vessels to track
const RAW_TARGET = 1200;  // Raw collected before filtering/dedup
const COLLECTION_TIMEOUT = 100000; // 100 seconds Phase 1
const STATIC_TIMEOUT = 25000;      // 25 seconds Phase 2

// ══════════════════════════════════════════════════════════════════
// GLOBAL BOUNDING BOXES — All major crude oil shipping regions
// Format: [[minLat, minLon], [maxLat, maxLon]]
// ══════════════════════════════════════════════════════════════════
const BOUNDING_BOXES = [
  // Persian Gulf / Strait of Hormuz
  [[21.0, 48.0], [30.5, 62.0]],
  // Red Sea / Gulf of Aden / Bab el-Mandeb
  [[10.0, 40.0], [28.0, 52.0]],
  // Arabian Sea
  [[5.0, 55.0], [25.0, 78.0]],
  // Strait of Malacca / Singapore
  [[-2.0, 95.0], [10.0, 106.0]],
  // South China Sea
  [[0.0, 105.0], [25.0, 125.0]],
  // Indian Ocean — Western lanes
  [[-35.0, 50.0], [5.0, 80.0]],
  // Indian Ocean — Eastern lanes
  [[-35.0, 80.0], [5.0, 100.0]],
  // West Africa / Gulf of Guinea
  [[-8.0, -5.0], [12.0, 15.0]],
  // Cape of Good Hope corridor
  [[-42.0, 10.0], [-28.0, 40.0]],
  // Gulf of Mexico / Caribbean
  [[14.0, -100.0], [32.0, -60.0]],
  // North Sea / Baltic — Russian crude routes
  [[50.0, -5.0], [66.0, 32.0]],
  // Mediterranean
  [[30.0, -6.0], [47.0, 37.0]],
  // Black Sea
  [[40.5, 27.5], [47.0, 42.0]],
  // Atlantic — VLCC transit lanes
  [[-10.0, -30.0], [20.0, -5.0]],
  // Pacific — Asia bound routes
  [[-5.0, 125.0], [35.0, 150.0]],
];

// ══════════════════════════════════════════════════════════════════
// KNOWN CRUDE OIL PORTS — For voyage detection and arrival matching
// ══════════════════════════════════════════════════════════════════
const KNOWN_PORTS = [
  // Middle East
  { name: 'Ras Tanura', lat: 26.64, lng: 50.16, region: 'Persian Gulf', type: 'export' },
  { name: 'Kharg Island', lat: 29.24, lng: 50.32, region: 'Persian Gulf', type: 'export' },
  { name: 'Basra Oil Terminal', lat: 29.68, lng: 48.82, region: 'Persian Gulf', type: 'export' },
  { name: 'Fujairah', lat: 25.11, lng: 56.34, region: 'Persian Gulf', type: 'transit' },
  { name: 'Jebel Ali', lat: 24.98, lng: 55.06, region: 'Persian Gulf', type: 'transit' },
  { name: 'Mina Al Ahmadi', lat: 29.07, lng: 48.13, region: 'Persian Gulf', type: 'export' },
  { name: 'Al Juaymah', lat: 26.90, lng: 49.95, region: 'Persian Gulf', type: 'export' },
  { name: 'Bandar Abbas', lat: 27.18, lng: 56.27, region: 'Persian Gulf', type: 'export' },
  { name: 'Lavan Island', lat: 26.81, lng: 53.36, region: 'Persian Gulf', type: 'export' },
  { name: 'Sidi Kerir', lat: 31.12, lng: 29.67, region: 'Mediterranean', type: 'export' },
  // Asia Pacific
  { name: 'Ningbo', lat: 29.86, lng: 121.55, region: 'China', type: 'import' },
  { name: 'Qingdao', lat: 36.07, lng: 120.38, region: 'China', type: 'import' },
  { name: 'Dalian', lat: 38.91, lng: 121.65, region: 'China', type: 'import' },
  { name: 'Tianjin', lat: 38.99, lng: 117.74, region: 'China', type: 'import' },
  { name: 'Zhoushan', lat: 29.99, lng: 122.21, region: 'China', type: 'import' },
  { name: 'Ulsan', lat: 35.53, lng: 129.39, region: 'South Korea', type: 'import' },
  { name: 'Yeosu', lat: 34.74, lng: 127.74, region: 'South Korea', type: 'import' },
  { name: 'Chiba', lat: 35.58, lng: 140.10, region: 'Japan', type: 'import' },
  { name: 'Mizushima', lat: 34.52, lng: 133.76, region: 'Japan', type: 'import' },
  { name: 'Yokkaichi', lat: 34.97, lng: 136.62, region: 'Japan', type: 'import' },
  { name: 'Singapore', lat: 1.27, lng: 103.82, region: 'Singapore', type: 'transit' },
  { name: 'Port Dickson', lat: 2.52, lng: 101.80, region: 'Malaysia', type: 'import' },
  // Europe
  { name: 'Rotterdam', lat: 51.92, lng: 4.48, region: 'Northwest Europe', type: 'import' },
  { name: 'Antwerp', lat: 51.27, lng: 4.39, region: 'Northwest Europe', type: 'import' },
  { name: 'Amsterdam', lat: 52.37, lng: 4.90, region: 'Northwest Europe', type: 'import' },
  { name: 'Wilhelmshaven', lat: 53.53, lng: 8.15, region: 'Northwest Europe', type: 'import' },
  { name: 'Trieste', lat: 45.65, lng: 13.78, region: 'Mediterranean', type: 'import' },
  { name: 'Augusta', lat: 37.22, lng: 15.22, region: 'Mediterranean', type: 'import' },
  { name: 'Lavera', lat: 43.40, lng: 5.02, region: 'Mediterranean', type: 'import' },
  // Africa
  { name: 'Bonny Terminal', lat: 4.45, lng: 7.16, region: 'West Africa', type: 'export' },
  { name: 'Forcados', lat: 5.35, lng: 5.37, region: 'West Africa', type: 'export' },
  { name: 'Escravos', lat: 5.54, lng: 5.14, region: 'West Africa', type: 'export' },
  { name: 'Djeno Terminal', lat: -4.73, lng: 11.89, region: 'West Africa', type: 'export' },
  { name: 'Cabinda', lat: -5.56, lng: 12.19, region: 'West Africa', type: 'export' },
  { name: 'Ras Lanuf', lat: 30.50, lng: 18.57, region: 'North Africa', type: 'export' },
  { name: 'Es Sider', lat: 30.63, lng: 18.66, region: 'North Africa', type: 'export' },
  // Americas
  { name: 'Houston', lat: 29.73, lng: -95.27, region: 'US Gulf', type: 'import' },
  { name: 'Corpus Christi', lat: 27.81, lng: -97.39, region: 'US Gulf', type: 'export' },
  { name: 'Louisiana Offshore', lat: 28.88, lng: -90.03, region: 'US Gulf', type: 'import' },
  { name: 'Freeport', lat: 28.95, lng: -95.36, region: 'US Gulf', type: 'export' },
  { name: 'Puerto La Cruz', lat: 10.21, lng: -64.63, region: 'Caribbean', type: 'export' },
  { name: 'Jose Terminal', lat: 10.19, lng: -64.98, region: 'Caribbean', type: 'export' },
  // Russia / Black Sea
  { name: 'Novorossiysk', lat: 44.72, lng: 37.77, region: 'Black Sea', type: 'export' },
  { name: 'Primorsk', lat: 60.37, lng: 28.62, region: 'Baltic', type: 'export' },
  { name: 'Ust-Luga', lat: 59.68, lng: 28.43, region: 'Baltic', type: 'export' },
  { name: 'Kozmino', lat: 42.75, lng: 133.07, region: 'Pacific Russia', type: 'export' },
  // India
  { name: 'Vadinar', lat: 22.46, lng: 69.78, region: 'India', type: 'import' },
  { name: 'Mundra', lat: 22.84, lng: 69.71, region: 'India', type: 'import' },
  { name: 'Paradip', lat: 20.26, lng: 86.67, region: 'India', type: 'import' },
];

// ══════════════════════════════════════════════════════════════════
// CHOKEPOINTS — For route detection during voyages
// ══════════════════════════════════════════════════════════════════
const CHOKEPOINTS = [
  { name: 'Strait of Hormuz', lat: 26.56, lng: 56.25, radius: 120 },
  { name: 'Strait of Malacca', lat: 1.80, lng: 102.50, radius: 150 },
  { name: 'Suez Canal', lat: 30.58, lng: 32.34, radius: 100 },
  { name: 'Bab el-Mandeb', lat: 12.58, lng: 43.42, radius: 100 },
  { name: 'Strait of Gibraltar', lat: 35.97, lng: -5.44, radius: 100 },
  { name: 'Cape of Good Hope', lat: -34.36, lng: 18.47, radius: 200 },
  { name: 'Bosphorus Strait', lat: 41.12, lng: 29.07, radius: 80 },
  { name: 'Danish Straits', lat: 57.50, lng: 10.60, radius: 120 },
  { name: 'Panama Canal', lat: 9.08, lng: -79.68, radius: 80 },
  { name: 'Lombok Strait', lat: -8.78, lng: 115.74, radius: 100 },
];

// ══════════════════════════════════════════════════════════════════
// OCEAN REGIONS — For classification and prediction
// ══════════════════════════════════════════════════════════════════
function getRegion(lat, lng) {
  if (lat >= 21 && lat <= 31 && lng >= 48 && lng <= 62) return 'Persian Gulf';
  if (lat >= 10 && lat <= 28 && lng >= 40 && lng <= 52) return 'Red Sea';
  if (lat >= 5 && lat <= 25 && lng >= 55 && lng <= 78) return 'Arabian Sea';
  if (lat >= -2 && lat <= 10 && lng >= 95 && lng <= 106) return 'Strait of Malacca';
  if (lat >= 0 && lat <= 25 && lng >= 105 && lng <= 125) return 'South China Sea';
  if (lat >= 25 && lat <= 40 && lng >= 115 && lng <= 125) return 'East China Sea';
  if (lat >= 28 && lat <= 42 && lng >= 117 && lng <= 135) return 'China';
  if (lat >= 30 && lat <= 40 && lng >= 125 && lng <= 132) return 'South Korea';
  if (lat >= 30 && lat <= 42 && lng >= 129 && lng <= 145) return 'Japan';
  if (lat >= -35 && lat <= 5 && lng >= 50 && lng <= 100) return 'Indian Ocean';
  if (lat >= -8 && lat <= 12 && lng >= -5 && lng <= 15) return 'West Africa';
  if (lat >= -42 && lat <= -28 && lng >= 10 && lng <= 40) return 'Cape of Good Hope';
  if (lat >= 14 && lat <= 32 && lng >= -100 && lng <= -60) return 'Gulf of Mexico';
  if (lat >= 50 && lat <= 66 && lng >= -5 && lng <= 32) return 'North Sea / Baltic';
  if (lat >= 40 && lat <= 47 && lng >= 27 && lng <= 42) return 'Black Sea';
  if (lat >= 30 && lat <= 47 && lng >= -6 && lng <= 37) return 'Mediterranean';
  if (lat >= -10 && lat <= 20 && lng >= -30 && lng <= -5) return 'Atlantic';
  if (lat >= 48 && lat <= 62 && lng >= -15 && lng <= 5) return 'Northwest Europe';
  if (lat >= 20 && lat <= 32 && lng >= 29 && lng <= 40) return 'North Africa';
  if (lat >= 10 && lat <= 25 && lng >= 60 && lng <= 80) return 'India';
  return 'Open Ocean';
}

// ══════════════════════════════════════════════════════════════════
// VESSEL CLASSIFICATION — Confidence-based, uses profile history
// ══════════════════════════════════════════════════════════════════
function classifyVessel(vessel, existingProfile) {
  let vesselClass = 'Tanker';
  let confidence = 0.3;
  let source = 'default';

  // Step 1 — Use existing profile if available and confident
  if (existingProfile && existingProfile.vessel_class && existingProfile.classification_confidence > 0.5) {
    vesselClass = existingProfile.vessel_class;
    confidence = Math.min(existingProfile.classification_confidence + 0.02, 0.98);
    source = 'profile_history';

    // Step 2 — Confirm or challenge with draught if available
    if (vessel.draught && vessel.draught > 3.5) {
      const draughtClass = classifyByDraught(vessel.draught);
      if (draughtClass === vesselClass) {
        confidence = Math.min(confidence + 0.05, 0.98);
        source = 'profile_confirmed_by_draught';
      } else if (confidence < 0.7) {
        vesselClass = draughtClass;
        confidence = 0.55;
        source = 'draught_override';
      }
    }
    return { vesselClass, confidence, source };
  }

  // Step 3 — No strong profile, use draught as primary signal
  if (vessel.draught && vessel.draught > 3.5) {
    vesselClass = classifyByDraught(vessel.draught);
    confidence = 0.65;
    source = 'draught';
    // Speed confirmation
    if (vessel.speed >= 10) {
      confidence = Math.min(confidence + 0.08, 0.98);
      source = 'draught_speed_confirmed';
    }
    return { vesselClass, confidence, source };
  }

  // Step 4 — No draught, use speed + region
  const region = getRegion(vessel.lat, vessel.lng);
  if (vessel.speed >= 12) {
    vesselClass = 'Tanker';
    confidence = 0.40;
    source = 'speed_region';
    if (['Persian Gulf', 'Arabian Sea', 'Indian Ocean', 'South China Sea'].includes(region)) {
      confidence = 0.45;
      source = 'speed_crude_region';
    }
  } else if (vessel.speed >= 8) {
    vesselClass = 'Tanker';
    confidence = 0.35;
    source = 'speed_moderate';
  } else {
    vesselClass = 'Coastal';
    confidence = 0.30;
    source = 'low_speed_default';
  }

  return { vesselClass, confidence, source };
}

function classifyByDraught(draught) {
  if (draught >= 18) return 'VLCC';
  if (draught >= 14) return 'Suezmax';
  if (draught >= 11) return 'Aframax';
  if (draught >= 3.5) return 'Tanker';
  return 'Coastal';
}

function estimateCargo(vessel, vesselClass) {
  if (!vessel.draught || vessel.draught < 3.5) return { tonnes: null, loadStatus: 'Unknown' };

  const maxDraught = { VLCC: 22.5, Suezmax: 20.0, Aframax: 14.5, Tanker: 12.0, Coastal: 8.0 };
  const maxTonnes = { VLCC: 300000, Suezmax: 160000, Aframax: 110000, Tanker: 50000, Coastal: 20000 };

  const max = maxDraught[vesselClass] || 12.0;
  const maxT = maxTonnes[vesselClass] || 50000;
  const ratio = Math.min(vessel.draught / max, 1.0);
  const tonnes = Math.round(ratio * maxT);
  const loadStatus = ratio > 0.75 ? 'Loaded' : ratio > 0.40 ? 'Partial' : 'Ballast';

  return { tonnes, loadStatus };
}

// ══════════════════════════════════════════════════════════════════
// DISTANCE CALCULATION
// ══════════════════════════════════════════════════════════════════
function haversineNm(lat1, lng1, lat2, lng2) {
  const R = 3440.065; // nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ══════════════════════════════════════════════════════════════════
// NEAREST PORT DETECTION
// ══════════════════════════════════════════════════════════════════
function getNearestPort(lat, lng, radiusNm = 50) {
  let nearest = null;
  let minDist = Infinity;
  for (const port of KNOWN_PORTS) {
    const dist = haversineNm(lat, lng, port.lat, port.lng);
    if (dist < radiusNm && dist < minDist) {
      minDist = dist;
      nearest = { ...port, distNm: dist };
    }
  }
  return nearest;
}

// ══════════════════════════════════════════════════════════════════
// CHOKEPOINT DETECTION
// ══════════════════════════════════════════════════════════════════
function getChokepointsPassed(lat, lng) {
  const passed = [];
  for (const cp of CHOKEPOINTS) {
    if (haversineNm(lat, lng, cp.lat, cp.lng) <= cp.radius) {
      passed.push(cp.name);
    }
  }
  return passed;
}

// ══════════════════════════════════════════════════════════════════
// HEADING PROJECTION — Project nose forward, score route waypoints
// ══════════════════════════════════════════════════════════════════
const ROUTE_WAYPOINTS = [
  { name: 'Rotterdam', lat: 51.92, lng: 4.48, routes: ['West Africa → Europe via Atlantic', 'Russia Baltic → Europe', 'Persian Gulf → Europe via Suez'] },
  { name: 'Ningbo', lat: 29.86, lng: 121.55, routes: ['Persian Gulf → China via Malacca', 'West Africa → China via Cape'] },
  { name: 'Qingdao', lat: 36.07, lng: 120.38, routes: ['Persian Gulf → China via Malacca', 'Russia Pacific → China'] },
  { name: 'Ulsan', lat: 35.53, lng: 129.39, routes: ['Persian Gulf → South Korea', 'West Africa → Asia via Cape'] },
  { name: 'Singapore', lat: 1.27, lng: 103.82, routes: ['Persian Gulf → China via Malacca', 'West Africa → Asia via Cape'] },
  { name: 'Houston', lat: 29.73, lng: -95.27, routes: ['West Africa → US Gulf', 'Venezuela → US Gulf'] },
  { name: 'Ras Tanura', lat: 26.64, lng: 50.16, routes: ['Persian Gulf → China via Malacca', 'Persian Gulf → Europe via Suez'] },
  { name: 'Novorossiysk', lat: 44.72, lng: 37.77, routes: ['Black Sea → Mediterranean'] },
  { name: 'Primorsk', lat: 60.37, lng: 28.62, routes: ['Russia Baltic → Europe'] },
  { name: 'Bonny Terminal', lat: 4.45, lng: 7.16, routes: ['West Africa → Europe via Atlantic', 'West Africa → Asia via Cape'] },
  { name: 'Suez Canal', lat: 30.58, lng: 32.34, routes: ['Persian Gulf → Europe via Suez', 'Persian Gulf → Mediterranean'] },
  { name: 'Cape of Good Hope', lat: -34.36, lng: 18.47, routes: ['West Africa → Asia via Cape', 'Persian Gulf → Europe via Cape'] },
  { name: 'Strait of Malacca', lat: 1.80, lng: 102.50, routes: ['Persian Gulf → China via Malacca', 'Persian Gulf → South Korea', 'Persian Gulf → Japan'] },
  { name: 'Chiba', lat: 35.58, lng: 140.10, routes: ['Persian Gulf → Japan', 'West Africa → Asia via Cape'] },
  { name: 'Vadinar', lat: 22.46, lng: 69.78, routes: ['Persian Gulf → India', 'West Africa → India'] },
];

function projectHeading(lat, lng, headingDeg, distanceNm) {
  const R = 3440.065;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  const brng = headingDeg * Math.PI / 180;
  const d = distanceNm / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
}

function getHeadingPrediction(lat, lng, heading) {
  if (!heading || heading < 0 || heading > 360) return null;

  const distances = [300, 600, 1200, 2000, 3500];
  const routeHits = {};

  for (const dist of distances) {
    const projected = projectHeading(lat, lng, heading, dist);
    for (const waypoint of ROUTE_WAYPOINTS) {
      const distToWaypoint = haversineNm(projected.lat, projected.lng, waypoint.lat, waypoint.lng);
      const tolerance = dist * 0.18;
      if (distToWaypoint <= tolerance) {
        for (const route of waypoint.routes) {
          routeHits[route] = (routeHits[route] || 0) + 1;
        }
      }
    }
  }

  if (Object.keys(routeHits).length === 0) return null;
  const bestRoute = Object.entries(routeHits).sort((a, b) => b[1] - a[1])[0];
  const confidence = Math.min(0.45 + bestRoute[1] * 0.07, 0.78);
  return { route: bestRoute[0], confidence };
}

// ══════════════════════════════════════════════════════════════════
// ROUTE PREDICTION ENGINE — Multi-signal hierarchy
// ══════════════════════════════════════════════════════════════════
const REGION_ROUTES = {
  'Persian Gulf': { route: 'Persian Gulf → China via Malacca', dest: 'China', confidence: 0.42 },
  'Arabian Sea': { route: 'Persian Gulf → India', dest: 'India', confidence: 0.40 },
  'Red Sea': { route: 'Persian Gulf → Europe via Suez', dest: 'Europe', confidence: 0.44 },
  'West Africa': { route: 'West Africa → Europe via Atlantic', dest: 'Europe', confidence: 0.40 },
  'Black Sea': { route: 'Black Sea → Mediterranean', dest: 'Mediterranean', confidence: 0.52 },
  'North Sea / Baltic': { route: 'Russia Baltic → Europe', dest: 'Northwest Europe', confidence: 0.50 },
  'Mediterranean': { route: 'Persian Gulf → Europe via Suez', dest: 'Europe', confidence: 0.38 },
  'South China Sea': { route: 'Persian Gulf → China via Malacca', dest: 'China', confidence: 0.45 },
  'Gulf of Mexico': { route: 'Venezuela → US Gulf', dest: 'US Gulf', confidence: 0.48 },
  'Indian Ocean': { route: 'Persian Gulf → India', dest: 'India', confidence: 0.38 },
  'Cape of Good Hope': { route: 'West Africa → Asia via Cape', dest: 'Asia', confidence: 0.44 },
};

function predictRoute(vessel, vesselClass, existingProfile) {
  const region = getRegion(vessel.lat, vessel.lng);

  // Signal 1 — Heading projection (strongest when valid)
  const headingPred = getHeadingPrediction(vessel.lat, vessel.lng, vessel.heading);
  if (headingPred && headingPred.confidence >= 0.52) {
    return { route: headingPred.route, confidence: headingPred.confidence, signal: 'heading_projection' };
  }

  // Signal 2 — Existing profile typical routes
  if (existingProfile && existingProfile.typical_routes && existingProfile.typical_routes.length > 0) {
    const topRoute = existingProfile.typical_routes[0];
    return { route: topRoute, confidence: 0.58, signal: 'vessel_history' };
  }

  // Signal 3 — Heading projection weaker signal
  if (headingPred) {
    return { route: headingPred.route, confidence: headingPred.confidence, signal: 'heading_weak' };
  }

  // Signal 4 — Region fallback
  const regionDefault = REGION_ROUTES[region];
  if (regionDefault) {
    return { route: regionDefault.route, confidence: regionDefault.confidence, signal: 'region_fallback' };
  }

  return { route: 'Unknown Route', confidence: 0.20, signal: 'no_signal' };
}

// ══════════════════════════════════════════════════════════════════
// LEARNING LOOP — Score predictions, save outcomes, update profiles
// ══════════════════════════════════════════════════════════════════
function scorePrediction(predictedRoute, predictedDest, actualArrivalPort, actualRegion) {
  if (!predictedRoute || !actualArrivalPort) return false;

  const predicted = (predictedDest || predictedRoute).toLowerCase();
  const actual = actualArrivalPort.toLowerCase();
  const actualReg = (actualRegion || '').toLowerCase();

  const routeKeywords = {
    'china': ['ningbo', 'qingdao', 'dalian', 'tianjin', 'zhoushan', 'china'],
    'europe': ['rotterdam', 'antwerp', 'amsterdam', 'wilhelmshaven', 'lavera', 'trieste', 'augusta', 'europe'],
    'india': ['vadinar', 'mundra', 'paradip', 'india'],
    'south korea': ['ulsan', 'yeosu', 'korea'],
    'japan': ['chiba', 'mizushima', 'yokkaichi', 'japan'],
    'us gulf': ['houston', 'corpus christi', 'freeport', 'louisiana', 'us gulf'],
    'singapore': ['singapore'],
    'mediterranean': ['trieste', 'augusta', 'lavera', 'sidi kerir', 'mediterranean'],
    'northwest europe': ['rotterdam', 'antwerp', 'amsterdam', 'wilhelmshaven'],
    'asia': ['ningbo', 'qingdao', 'ulsan', 'chiba', 'singapore', 'china', 'korea', 'japan'],
  };

  for (const [region, keywords] of Object.entries(routeKeywords)) {
    if (predicted.includes(region) || predicted.includes(region.split(' ')[0])) {
      for (const kw of keywords) {
        if (actual.includes(kw) || actualReg.includes(kw)) return true;
      }
    }
  }
  return false;
}

function deriveActualRoute(departureRegion, arrivalRegion, chokepointsPassed) {
  const cp = chokepointsPassed || [];
  const dep = (departureRegion || '').toLowerCase();
  const arr = (arrivalRegion || '').toLowerCase();

  if (dep.includes('persian gulf') || dep.includes('arabian')) {
    if (cp.includes('Suez Canal')) return 'Persian Gulf → Europe via Suez';
    if (cp.includes('Strait of Malacca')) {
      if (arr.includes('china')) return 'Persian Gulf → China via Malacca';
      if (arr.includes('korea')) return 'Persian Gulf → South Korea';
      if (arr.includes('japan')) return 'Persian Gulf → Japan';
      return 'Persian Gulf → Asia via Malacca';
    }
    if (cp.includes('Cape of Good Hope')) return 'Persian Gulf → Europe via Cape';
    if (arr.includes('india')) return 'Persian Gulf → India';
  }
  if (dep.includes('west africa')) {
    if (cp.includes('Cape of Good Hope') || cp.includes('Strait of Malacca')) return 'West Africa → Asia via Cape';
    return 'West Africa → Europe via Atlantic';
  }
  if (dep.includes('black sea')) return 'Black Sea → Mediterranean';
  if (dep.includes('baltic') || dep.includes('north sea')) return 'Russia Baltic → Europe';
  return `${departureRegion || 'Unknown'} → ${arrivalRegion || 'Unknown'}`;
}

async function saveLearningOutcome(activeVoyage, arrivalPort, arrivalRegion, voyageDays, chokepointsPassed, headers) {
  try {
    const correct = scorePrediction(
      activeVoyage.predicted_route,
      activeVoyage.predicted_destination,
      arrivalPort,
      arrivalRegion
    );

    const actualRoute = deriveActualRoute(
      activeVoyage.departure_region,
      arrivalRegion,
      chokepointsPassed
    );

    const outcome = {
      voyage_id: activeVoyage.id,
      mmsi: activeVoyage.mmsi,
      vessel_name: activeVoyage.vessel_name,
      vessel_class: activeVoyage.vessel_class,
      departure_port: activeVoyage.departure_port,
      departure_region: activeVoyage.departure_region,
      actual_arrival_port: arrivalPort,
      actual_arrival_region: arrivalRegion,
      predicted_route: activeVoyage.predicted_route,
      actual_route: actualRoute,
      prediction_correct: correct,
      prediction_confidence: activeVoyage.confidence_at_departure,
      arrival_confidence: 0.75,
      trade_classification: 'normal',
      voyage_days: voyageDays,
      chokepoints_passed: chokepointsPassed,
      signals_that_were_correct: correct ? ['route_prediction'] : [],
      signals_that_were_wrong: correct ? [] : ['route_prediction'],
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/learning_outcomes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(outcome),
    });

    if (res.ok) {
      console.log(`  ✅ Learning outcome: ${activeVoyage.vessel_name} | ${correct ? 'CORRECT ✓' : 'WRONG ✗'} | Actual: ${actualRoute}`);
    }

    return { correct, actualRoute };
  } catch (err) {
    console.error(`  ⚠️ Learning outcome error: ${err.message}`);
    return { correct: false, actualRoute: 'Unknown' };
  }
}

async function updateProfileWithConfirmedRoute(mmsi, confirmedRoute, headers) {
  try {
    // Get existing profile
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles?mmsi=eq.${mmsi}&select=typical_routes,classification_confidence`, { headers });
    if (!res.ok) return;
    const profiles = await res.json();
    if (!profiles.length) return;

    const profile = profiles[0];
    const existingRoutes = profile.typical_routes || [];

    // Add confirmed route, keep top 5
    const updatedRoutes = [confirmedRoute, ...existingRoutes.filter(r => r !== confirmedRoute)].slice(0, 5);
    const newConfidence = Math.min((profile.classification_confidence || 0.5) + 0.10, 0.98);

    await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles?mmsi=eq.${mmsi}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        typical_routes: updatedRoutes,
        classification_confidence: newConfidence,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error(`  ⚠️ Profile update error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════
// VOYAGE DETECTION — Start and end events
// ══════════════════════════════════════════════════════════════════
async function detectVoyageEvents(vessel, vesselClass, existingProfile, activeVoyage, headers) {
  const isStationary = vessel.speed < 2.0;
  const isMoving = vessel.speed >= 6.0;
  const nearPort = getNearestPort(vessel.lat, vessel.lng, 50);
  const region = getRegion(vessel.lat, vessel.lng);
  const chokepointsNow = getChokepointsPassed(vessel.lat, vessel.lng);
  const voyageUpdates = [];
  const newVoyages = [];

  // ── VOYAGE END: Moving, now stationary near a port ──
  if (activeVoyage && isStationary && nearPort) {
    console.log(`  🏁 VOYAGE END: ${vessel.name} arrived at ${nearPort.name}`);

    const allChokepoints = [...new Set([
      ...(activeVoyage.chokepoints_passed || []),
      ...chokepointsNow,
    ])];

    const voyageDays = activeVoyage.departure_timestamp
      ? (Date.now() - new Date(activeVoyage.departure_timestamp).getTime()) / 86400000
      : null;

    // ── LEARNING LOOP ──
    const { correct, actualRoute } = await saveLearningOutcome(
      activeVoyage, nearPort.name, region, voyageDays, allChokepoints, headers
    );
    await updateProfileWithConfirmedRoute(vessel.mmsi, actualRoute, headers);

    voyageUpdates.push({
      id: activeVoyage.id,
      status: 'completed',
      arrival_timestamp: vessel.last_updated,
      arrival_lat: vessel.lat,
      arrival_lng: vessel.lng,
      arrival_port: nearPort.name,
      arrival_region: region,
      arrival_draught: vessel.draught,
      arrival_confirmed: true,
      arrival_confidence: 0.75,
      chokepoints_passed: allChokepoints,
      actual_destination: nearPort.name,
      total_voyage_days: voyageDays,
      prediction_correct: correct,
      prediction_scored: true,
    });
  }

  // ── CHOKEPOINT UPDATE: Active voyage, update chokepoints ──
  if (activeVoyage && !isStationary && chokepointsNow.length > 0) {
    const existing = activeVoyage.chokepoints_passed || [];
    const merged = [...new Set([...existing, ...chokepointsNow])];
    if (merged.length > existing.length) {
      console.log(`  ⚓ Chokepoint: ${vessel.name} passed ${chokepointsNow.join(', ')}`);
      voyageUpdates.push({ id: activeVoyage.id, chokepoints_passed: merged });
    }
  }

  // ── VOYAGE START: Was stationary, now moving, near or leaving a port ──
  const wasStationary = existingProfile && (existingProfile.last_speed || 0) < 2.0;
  const loadStatus = vessel.draught ? (vessel.draught >= 8 ? 'Loaded' : 'Ballast') : 'Unknown';

  if (!activeVoyage && isMoving && wasStationary && loadStatus === 'Loaded') {
    const prediction = predictRoute(vessel, vesselClass, existingProfile);
    console.log(`  🚢 VOYAGE START: ${vessel.name} departing | Pred: ${prediction.route}`);
    newVoyages.push({
      mmsi: vessel.mmsi,
      vessel_name: vessel.name,
      vessel_class: vesselClass,
      departure_timestamp: vessel.last_updated,
      departure_lat: vessel.lat,
      departure_lng: vessel.lng,
      departure_port: nearPort ? nearPort.name : null,
      departure_region: region,
      departure_draught: vessel.draught,
      departure_load_status: loadStatus,
      estimated_cargo_tonnes: estimateCargo(vessel, vesselClass).tonnes,
      declared_destination: vessel.destination || null,
      predicted_destination: prediction.route.split('→')[1]?.trim() || null,
      predicted_route: prediction.route,
      confidence_at_departure: prediction.confidence,
      status: 'active',
    });
  }

  return { voyageUpdates, newVoyages };
}

// ══════════════════════════════════════════════════════════════════
// VOYAGE SEEDING — Create voyage records for mid-ocean vessels
// ══════════════════════════════════════════════════════════════════
async function seedMidOceanVoyages(vessels, activeVoyageMmsis, existingProfileMap, headers) {
  let seeded = 0;
  const candidates = vessels.filter(v =>
    v.speed >= 8 &&
    !activeVoyageMmsis.has(v.mmsi) &&
    ['Persian Gulf', 'Arabian Sea', 'Indian Ocean', 'South China Sea', 'West Africa',
     'Atlantic', 'Cape of Good Hope', 'Red Sea', 'Open Ocean'].includes(getRegion(v.lat, v.lng))
  );

  for (const vessel of candidates.slice(0, 30)) {
    const region = getRegion(vessel.lat, vessel.lng);
    const existingProfile = existingProfileMap[vessel.mmsi];
    const prediction = predictRoute(vessel, vessel.vessel_class || 'Tanker', existingProfile);

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/voyages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mmsi: vessel.mmsi,
          vessel_name: vessel.name,
          vessel_class: vessel.vessel_class || 'Tanker',
          departure_timestamp: vessel.last_updated,
          departure_lat: vessel.lat,
          departure_lng: vessel.lng,
          departure_port: null,
          departure_region: region,
          departure_draught: vessel.draught || null,
          estimated_cargo_tonnes: vessel.draught ? estimateCargo(vessel, vessel.vessel_class || 'Tanker').tonnes : null,
          declared_destination: vessel.destination || null,
          predicted_destination: prediction.route.split('→')[1]?.trim() || null,
          predicted_route: prediction.route,
          confidence_at_departure: prediction.confidence,
          status: 'active',
        }),
      });
      if (res.ok) seeded++;
    } catch (_) {}
  }

  if (seeded > 0) console.log(`🌱 Seeded ${seeded} new mid-ocean voyages`);
}

// ══════════════════════════════════════════════════════════════════
// MAIN COLLECTION FUNCTION
// ══════════════════════════════════════════════════════════════════
async function main() {
  console.log('🛢️ UFS Vessel Collector v2.3 starting...');
  console.log(`Target: ${TARGET} vessels | Bounding boxes: ${BOUNDING_BOXES.length} regions | Timeout: ${COLLECTION_TIMEOUT / 1000}s`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'apikey': SUPABASE_SERVICE_KEY,
    'Prefer': 'return=minimal',
  };

  // ── Step 1: Fetch locked vessels (active voyages) ──
  let lockedMmsis = new Set();
  let activeVoyageMap = {};
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/voyages?status=eq.active&select=id,mmsi,vessel_name,vessel_class,departure_timestamp,departure_region,departure_port,predicted_route,predicted_destination,confidence_at_departure,chokepoints_passed`, { headers });
    if (res.ok) {
      const voyages = await res.json();
      for (const v of voyages) {
        lockedMmsis.add(v.mmsi);
        activeVoyageMap[v.mmsi] = v;
      }
      console.log(`🔒 ${lockedMmsis.size} locked vessels (active voyages)`);
    }
  } catch (err) {
    console.error('Failed to fetch active voyages:', err.message);
  }

  // ── Step 2: Fetch existing profiles ──
  let existingProfileMap = {};
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles?select=mmsi,vessel_class,classification_confidence,classification_source,total_observations,typical_routes,last_speed,last_draught,last_load_status`, { headers });
    if (res.ok) {
      const profiles = await res.json();
      for (const p of profiles) existingProfileMap[p.mmsi] = p;
      console.log(`📚 ${profiles.length} existing profiles loaded`);
    }
  } catch (err) {
    console.error('Failed to fetch profiles:', err.message);
  }

  // ── Step 3: Phase 1 — Collect vessel positions from AISstream ──
  console.log('\n📡 Phase 1: Collecting vessel positions...');
  const positions = {};
  let totalMessages = 0;

  await new Promise((resolve) => {
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    const timer = setTimeout(() => { ws.close(); resolve(); }, COLLECTION_TIMEOUT);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        APIKey: AISSTREAM_KEY,
        BoundingBoxes: BOUNDING_BOXES,
        FilterMessageTypes: ['PositionReport'],
        FiltersShipType: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
      }));
      console.log('✅ Connected to AISstream WebSocket');
    });

    ws.on('message', (data) => {
      try {
        totalMessages++;
        const msg = JSON.parse(data);
        if (msg.MessageType !== 'PositionReport') return;

        const pos = msg.Message?.PositionReport;
        const meta = msg.MetaData;
        if (!pos || !meta) return;

        const mmsi = String(pos.UserID || meta.MMSI_String);
        if (!mmsi || mmsi === '0') return;

        const lat = meta.latitude ?? pos.Latitude;
        const lng = meta.longitude ?? pos.Longitude;
        if (!lat || !lng || lat === 0 || lng === 0) return;

        const heading = pos.TrueHeading >= 0 && pos.TrueHeading <= 360 ? pos.TrueHeading : null;
        const speed = pos.Sog || 0;

        if (!positions[mmsi]) {
          positions[mmsi] = {
            mmsi,
            name: meta.ShipName?.trim() || `Tanker-${mmsi.slice(-4)}`,
            lat,
            lng,
            heading,
            speed,
            nav_status: pos.NavigationalStatus,
            last_updated: new Date().toISOString(),
            destination: null,
            draught: null,
          };
        }

        if (Object.keys(positions).length >= RAW_TARGET && lockedMmsis.size === 0) {
          clearTimeout(timer);
          ws.close();
          resolve();
        }
      } catch (_) {}
    });

    ws.on('error', (err) => { console.error('WebSocket error:', err.message); });
    ws.on('close', () => { clearTimeout(timer); resolve(); });
  });

  console.log(`  Collected ${Object.keys(positions).length} raw positions from ${totalMessages} messages`);

  // ── Step 4: Phase 2 — Collect static data (draught, destination) ──
  console.log('\n📡 Phase 2: Collecting draught and destination...');
  const collectedMmsis = Object.keys(positions);

  await new Promise((resolve) => {
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    const timer = setTimeout(() => { ws.close(); resolve(); }, STATIC_TIMEOUT);
    let staticCount = 0;

    ws.on('open', () => {
      ws.send(JSON.stringify({
        APIKey: AISSTREAM_KEY,
        BoundingBoxes: BOUNDING_BOXES,
        FilterMessageTypes: ['ShipStaticData'],
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.MessageType !== 'ShipStaticData') return;
        const mmsi = String(msg.MetaData?.MMSI_String || msg.Message?.ShipStaticData?.UserID);
        if (!positions[mmsi]) return;

        const staticData = msg.Message?.ShipStaticData;
        if (staticData?.Draught && staticData.Draught > 0.5) {
          positions[mmsi].draught = staticData.Draught;
          staticCount++;
        }
        if (staticData?.Destination) {
          positions[mmsi].destination = staticData.Destination.trim();
        }
        if (staticData?.ShipName && positions[mmsi].name.startsWith('Tanker-')) {
          positions[mmsi].name = staticData.ShipName.trim();
        }
      } catch (_) {}
    });

    ws.on('error', () => {});
    ws.on('close', () => { clearTimeout(timer); resolve(); });
  });

  // ── Step 5: Ensure locked vessels are included ──
  for (const mmsi of lockedMmsis) {
    if (!positions[mmsi]) {
      const profile = existingProfileMap[mmsi];
      if (profile) {
        positions[mmsi] = {
          mmsi,
          name: activeVoyageMap[mmsi]?.vessel_name || `Vessel-${mmsi.slice(-4)}`,
          lat: profile.last_lat || 0,
          lng: profile.last_lng || 0,
          heading: null,
          speed: 0,
          last_updated: new Date().toISOString(),
          destination: null,
          draught: profile.last_draught || null,
          _notSeenThisRun: true,
        };
      }
    }
  }

  // ── Step 6: Classify all vessels ──
  const allVessels = Object.values(positions);
  for (const vessel of allVessels) {
    const profile = existingProfileMap[vessel.mmsi];
    const { vesselClass, confidence, source } = classifyVessel(vessel, profile);
    vessel.vessel_class = vesselClass;
    vessel.classification_confidence = confidence;
    vessel.classification_source = source;
    const cargo = estimateCargo(vessel, vesselClass);
    vessel.estimated_cargo_tonnes = cargo.tonnes;
    vessel.load_status = cargo.loadStatus;
  }

  // ── Step 7: Sort by classification confidence, take top TARGET ──
  // Always keep locked vessels, fill rest by confidence
  const lockedVessels = allVessels.filter(v => lockedMmsis.has(v.mmsi));
  const unlockedVessels = allVessels
    .filter(v => !lockedMmsis.has(v.mmsi))
    .sort((a, b) => b.classification_confidence - a.classification_confidence);

  const finalVessels = [...lockedVessels, ...unlockedVessels].slice(0, TARGET);
  console.log(`\n✅ Final fleet: ${finalVessels.length} vessels (${lockedVessels.length} locked + ${finalVessels.length - lockedVessels.length} new)`);

  // Classification summary
  const classCounts = {};
  for (const v of finalVessels) {
    classCounts[v.vessel_class] = (classCounts[v.vessel_class] || 0) + 1;
  }
  console.log('📊 Classification:', Object.entries(classCounts).map(([k, v]) => `${k}: ${v}`).join(' | '));

  // ── Step 8: Voyage event detection ──
  console.log('\n🔍 Detecting voyage events...');
  const allVoyageUpdates = [];
  const allNewVoyages = [];

  for (const vessel of finalVessels) {
    if (vessel._notSeenThisRun) continue;
    const activeVoyage = activeVoyageMap[vessel.mmsi] || null;
    const existingProfile = existingProfileMap[vessel.mmsi] || null;
    const { vesselClass } = classifyVessel(vessel, existingProfile);
    const { voyageUpdates, newVoyages } = await detectVoyageEvents(
      vessel, vesselClass, existingProfile, activeVoyage, headers
    );
    allVoyageUpdates.push(...voyageUpdates);
    allNewVoyages.push(...newVoyages);
  }

  // ── Step 9: Save to Supabase ──
  console.log('\n💾 Saving to Supabase...');

  // Clear and insert vessels
  const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/vessels?id=gt.0`, { method: 'DELETE', headers });
  console.log(`  Delete vessels: HTTP ${deleteRes.status}`);

  const vesselRows = finalVessels.map(v => ({
    mmsi: v.mmsi,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    heading: v.heading,
    speed: v.speed,
    vessel_class: v.vessel_class,
    destination: v.destination,
    draught: v.draught,
    load_status: v.load_status,
    estimated_cargo_tonnes: v.estimated_cargo_tonnes,
    last_updated: v.last_updated,
    last_seen_at: v._notSeenThisRun ? null : v.last_updated,
    times_not_seen: v._notSeenThisRun ? 1 : 0,
  }));

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/vessels`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify(vesselRows),
  });
  console.log(`  Insert vessels: HTTP ${insertRes.status}`);

  // Insert vessel history
  const historyRows = finalVessels
    .filter(v => !v._notSeenThisRun)
    .map(v => ({
      mmsi: v.mmsi,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      heading: v.heading,
      speed: v.speed,
      vessel_class: v.vessel_class,
      draught: v.draught,
      load_status: v.load_status,
      recorded_at: v.last_updated,
    }));

  const histRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_history`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify(historyRows),
  });
  if (!histRes.ok) {
    const err = await histRes.text();
    console.log(`  Insert history: HTTP ${histRes.status} — ${err}`);
  } else {
    console.log(`  Insert history: HTTP ${histRes.status}`);
  }

  // Insert predictions — using table column names: route_name, predicted_destination, confidence, signal_used
  const predRows = finalVessels.map(v => {
    const profile = existingProfileMap[v.mmsi];
    const pred = predictRoute(v, v.vessel_class, profile);
    return {
      mmsi: v.mmsi,
      vessel_name: v.name,
      route_name: pred.route,
      predicted_destination: pred.route.split('→')[1]?.trim() || null,
      confidence: pred.confidence,
      signal_used: pred.signal,
    };
  });

  const predRes = await fetch(`${SUPABASE_URL}/rest/v1/predictions`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify(predRows),
  });
  if (!predRes.ok) {
    const err = await predRes.text();
    console.log(`  Insert predictions: HTTP ${predRes.status} — ${err}`);
  } else {
    console.log(`  Insert predictions: HTTP ${predRes.status}`);
  }

  // Upsert vessel profiles
  const profileRows = finalVessels.map(v => {
    const existing = existingProfileMap[v.mmsi];
    const obs = (existing?.total_observations || 0) + 1;
    return {
      mmsi: v.mmsi,
      vessel_name: v.name,
      vessel_class: v.vessel_class,
      classification_confidence: v.classification_confidence,
      classification_source: v.classification_source,
      total_observations: obs,
      last_speed: v.speed,
      last_heading: v.heading,
      last_draught: v.draught,
      last_load_status: v.load_status,
      typical_routes: existing?.typical_routes || [],
      updated_at: new Date().toISOString(),
    };
  });

  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(profileRows),
  });
  if (!profRes.ok) {
    const err = await profRes.text();
    console.log(`  Upsert profiles: HTTP ${profRes.status} — ${err}`);
  } else {
    console.log(`  Upsert profiles: HTTP ${profRes.status}`);
  }

  // Apply voyage updates
  for (const update of allVoyageUpdates) {
    const { id, ...fields } = update;
    await fetch(`${SUPABASE_URL}/rest/v1/voyages?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(fields),
    });
  }
  if (allVoyageUpdates.length > 0) console.log(`  Updated ${allVoyageUpdates.length} voyage records`);

  // Insert new voyages
  if (allNewVoyages.length > 0) {
    const newVoyRes = await fetch(`${SUPABASE_URL}/rest/v1/voyages`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(allNewVoyages),
    });
    console.log(`  New voyages: HTTP ${newVoyRes.status} (${allNewVoyages.length} created)`);
  }

  // ── Step 10: Seed mid-ocean voyages ──
  const activeVoyageMmsis = new Set([...Object.keys(activeVoyageMap), ...allNewVoyages.map(v => v.mmsi)]);
  await seedMidOceanVoyages(finalVessels, activeVoyageMmsis, existingProfileMap, headers);

  console.log('\n✅ UFS Vessel Collector v2.3 complete');
  console.log(`   ${finalVessels.length} vessels | ${allVoyageUpdates.length} voyage updates | ${allNewVoyages.length} new voyages`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
