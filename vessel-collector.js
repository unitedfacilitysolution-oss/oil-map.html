// ══════════════════════════════════════════════════════════════════
// UFS VESSEL COLLECTOR v2.0
// United Facility Solution — Market Intelligence Platform
//
// What this does every 6 hours:
// 1. Collects 100 crude tanker positions from AISstream
// 2. Collects draught (weight indicator) for each vessel
// 3. Calculates load status and estimated cargo weight
// 4. Uses heading + position to predict routes (primary signal)
// 5. Detects chokepoints passed based on position history
// 6. Detects voyage start and end events
// 7. Records complete voyage data for learning system
// 8. Saves everything to Supabase
// ══════════════════════════════════════════════════════════════════

const WebSocket = require('ws');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const AISSTREAM_KEY = process.env.AISSTREAM_KEY;

const TARGET = 100;
const COLLECT_MS = 55000;

// ══════════════════════════════════════════════════════════════════
// KNOWN CRUDE OIL PORTS
// Used to match vessel arrival/departure positions
// ══════════════════════════════════════════════════════════════════
const KNOWN_PORTS = [
  // MIDDLE EAST
  { name: "Ras Tanura",         lat: 26.64,  lng: 50.16,  region: "Persian Gulf" },
  { name: "Ju'aymah",           lat: 26.94,  lng: 49.97,  region: "Persian Gulf" },
  { name: "Kharg Island",       lat: 29.25,  lng: 50.32,  region: "Persian Gulf" },
  { name: "Basra Oil Terminal", lat: 29.68,  lng: 48.82,  region: "Persian Gulf" },
  { name: "Mina Al Ahmadi",     lat: 29.05,  lng: 48.15,  region: "Persian Gulf" },
  { name: "Ruwais",             lat: 24.11,  lng: 52.73,  region: "Persian Gulf" },
  { name: "Fujairah",           lat: 25.12,  lng: 56.36,  region: "Persian Gulf" },
  { name: "Sohar",              lat: 24.34,  lng: 56.75,  region: "Arabian Sea"  },
  { name: "Muscat",             lat: 23.62,  lng: 58.59,  region: "Arabian Sea"  },

  // RED SEA / SUEZ
  { name: "Yanbu",              lat: 24.09,  lng: 38.06,  region: "Red Sea"      },
  { name: "Jeddah",             lat: 21.49,  lng: 39.17,  region: "Red Sea"      },
  { name: "Ain Sukhna",         lat: 29.59,  lng: 32.35,  region: "Red Sea"      },

  // WEST AFRICA
  { name: "Bonny Terminal",     lat: 4.45,   lng: 7.15,   region: "West Africa"  },
  { name: "Forcados",           lat: 5.35,   lng: 5.07,   region: "West Africa"  },
  { name: "Escravos",           lat: 5.59,   lng: 5.14,   region: "West Africa"  },
  { name: "Cabinda",            lat: -5.55,  lng: 12.19,  region: "West Africa"  },
  { name: "Malongo",            lat: -5.61,  lng: 12.08,  region: "West Africa"  },
  { name: "Djeno Terminal",     lat: -4.83,  lng: 11.85,  region: "West Africa"  },

  // EUROPE
  { name: "Rotterdam",          lat: 51.89,  lng: 4.10,   region: "European Atlantic" },
  { name: "Antwerp",            lat: 51.26,  lng: 4.42,   region: "European Atlantic" },
  { name: "Amsterdam",          lat: 52.37,  lng: 4.90,   region: "European Atlantic" },
  { name: "Fos-sur-Mer",        lat: 43.41,  lng: 4.94,   region: "Mediterranean" },
  { name: "Augusta",            lat: 37.22,  lng: 15.22,  region: "Mediterranean" },
  { name: "Trieste",            lat: 45.65,  lng: 13.78,  region: "Mediterranean" },
  { name: "Novorossiysk",       lat: 44.72,  lng: 37.77,  region: "Black Sea"    },
  { name: "Primorsk",           lat: 60.36,  lng: 28.62,  region: "Baltic Sea"   },
  { name: "Ust-Luga",           lat: 59.68,  lng: 28.44,  region: "Baltic Sea"   },

  // ASIA
  { name: "Ningbo",             lat: 29.87,  lng: 121.55, region: "South China Sea" },
  { name: "Qingdao",            lat: 36.07,  lng: 120.38, region: "South China Sea" },
  { name: "Dalian",             lat: 38.91,  lng: 121.64, region: "South China Sea" },
  { name: "Shanghai",           lat: 31.23,  lng: 121.47, region: "South China Sea" },
  { name: "Zhoushan",           lat: 30.02,  lng: 122.10, region: "South China Sea" },
  { name: "Ulsan",              lat: 35.54,  lng: 129.32, region: "Japan/Korea Waters" },
  { name: "Yeosu",              lat: 34.74,  lng: 127.74, region: "Japan/Korea Waters" },
  { name: "Chiba",              lat: 35.61,  lng: 140.05, region: "Japan/Korea Waters" },
  { name: "Yokohama",           lat: 35.44,  lng: 139.64, region: "Japan/Korea Waters" },
  { name: "Singapore",          lat: 1.29,   lng: 103.85, region: "Strait of Malacca" },
  { name: "Jamnagar",           lat: 22.47,  lng: 69.07,  region: "Arabian Sea"  },
  { name: "Mumbai",             lat: 18.93,  lng: 72.84,  region: "Arabian Sea"  },
  { name: "Paradip",            lat: 20.26,  lng: 86.67,  region: "Indian Ocean" },

  // AMERICAS
  { name: "Port Arthur",        lat: 29.87,  lng: -93.94, region: "Gulf of Mexico" },
  { name: "Houston",            lat: 29.75,  lng: -95.37, region: "Gulf of Mexico" },
  { name: "Louisiana Offshore", lat: 28.88,  lng: -90.02, region: "Gulf of Mexico" },
  { name: "Corpus Christi",     lat: 27.81,  lng: -97.40, region: "Gulf of Mexico" },
  { name: "Santos",             lat: -23.94, lng: -46.33, region: "South America Atlantic" },
  { name: "Aratu",              lat: -12.77, lng: -38.48, region: "South America Atlantic" },
];

// ══════════════════════════════════════════════════════════════════
// MARITIME CHOKEPOINTS
// Detected by checking if vessel passes within range
// ══════════════════════════════════════════════════════════════════
const CHOKEPOINTS = [
  { name: "Strait of Hormuz",   lat: 26.57,  lng: 56.50,  radiusNm: 60  },
  { name: "Strait of Malacca",  lat: 1.30,   lng: 103.80, radiusNm: 80  },
  { name: "Suez Canal",         lat: 30.70,  lng: 32.50,  radiusNm: 80  },
  { name: "Bab el-Mandeb",      lat: 12.50,  lng: 43.50,  radiusNm: 60  },
  { name: "Cape of Good Hope",  lat: -34.50, lng: 26.00,  radiusNm: 150 },
  { name: "Bosphorus",          lat: 41.10,  lng: 29.00,  radiusNm: 50  },
  { name: "Gibraltar",          lat: 35.95,  lng: -5.45,  radiusNm: 60  },
  { name: "Oresund Strait",     lat: 56.00,  lng: 12.60,  radiusNm: 60  },
  { name: "Panama Canal",       lat: 9.20,   lng: -79.90, radiusNm: 60  },
  { name: "Florida Strait",     lat: 24.50,  lng: -80.50, radiusNm: 80  },
];

// ══════════════════════════════════════════════════════════════════
// VESSEL CLASS MAX DRAUGHT & CARGO CAPACITY
// Used to estimate cargo weight from draught reading
// ══════════════════════════════════════════════════════════════════
const VESSEL_CLASS_DATA = {
  'VLCC':    { maxDraught: 22.0, maxCargo: 300000, minDraught: 8.0  },
  'Suezmax': { maxDraught: 17.0, maxCargo: 150000, minDraught: 6.0  },
  'Aframax': { maxDraught: 14.5, maxCargo: 100000, minDraught: 5.5  },
  'Tanker':  { maxDraught: 14.0, maxCargo: 80000,  minDraught: 5.0  },
};

// ══════════════════════════════════════════════════════════════════
// MARITIME ROUTES — 25 ROUTES WITH WAYPOINTS
// ══════════════════════════════════════════════════════════════════
const ROUTES = {
  "Persian Gulf → China via Malacca":            { destName: "China",                 avgDays: 18, waypoints: [[26.5,50.5],[23.5,59.5],[20.0,63.0],[8.5,75.0],[1.3,103.8],[10.0,111.0],[25.0,120.0],[30.0,122.0]] },
  "Persian Gulf → Japan/Korea via Malacca":      { destName: "Japan/Korea",           avgDays: 20, waypoints: [[26.5,50.5],[23.5,59.5],[20.0,63.0],[1.3,103.8],[18.0,118.0],[35.0,136.0]] },
  "Persian Gulf → India":                        { destName: "India",                 avgDays: 7,  waypoints: [[26.5,50.5],[23.5,59.5],[22.0,63.0],[19.1,72.8]] },
  "Persian Gulf → Europe via Suez":              { destName: "Rotterdam",             avgDays: 16, waypoints: [[26.5,50.5],[23.5,59.5],[12.5,43.5],[30.7,32.5],[35.9,-5.7],[51.9,4.1]] },
  "Persian Gulf → Europe via Cape":              { destName: "Rotterdam (Cape)",      avgDays: 31, waypoints: [[26.5,50.5],[23.5,59.5],[-34.5,26.0],[35.9,-5.7],[51.9,4.1]] },
  "Persian Gulf → USA via Cape":                 { destName: "US Gulf Coast",         avgDays: 38, waypoints: [[26.5,50.5],[23.5,59.5],[-34.5,26.0],[25.0,-65.0],[29.7,-93.9]] },
  "Persian Gulf → Singapore":                    { destName: "Singapore",             avgDays: 12, waypoints: [[26.5,50.5],[23.5,59.5],[1.3,103.8]] },
  "Persian Gulf → Australia":                    { destName: "Australia",             avgDays: 22, waypoints: [[26.5,50.5],[23.5,59.5],[-20.0,100.0],[-33.9,151.2]] },
  "West Africa → China via Cape":                { destName: "China",                 avgDays: 28, waypoints: [[4.5,5.0],[-34.5,26.0],[1.3,103.8],[30.0,122.0]] },
  "West Africa → Europe via Atlantic":           { destName: "Rotterdam",             avgDays: 14, waypoints: [[4.5,5.0],[35.9,-5.7],[51.9,4.1]] },
  "West Africa → USA East Coast":                { destName: "New York",              avgDays: 16, waypoints: [[4.5,5.0],[17.0,-30.0],[40.7,-74.0]] },
  "West Africa → India via Cape":                { destName: "Mumbai",                avgDays: 20, waypoints: [[4.5,5.0],[-34.5,26.0],[19.1,72.8]] },
  "Black Sea → Mediterranean via Bosphorus":     { destName: "Rotterdam",             avgDays: 12, waypoints: [[44.7,37.8],[41.5,29.5],[35.9,-5.7],[51.9,4.1]] },
  "Russia Baltic → Europe via Oresund":          { destName: "Rotterdam",             avgDays: 5,  waypoints: [[60.4,28.6],[56.0,12.6],[51.9,4.1]] },
  "Russia ESPO → China/Japan":                   { destName: "Korea/Japan",           avgDays: 4,  waypoints: [[42.7,133.1],[35.0,129.0]] },
  "USA Gulf → Europe via Atlantic":              { destName: "Rotterdam",             avgDays: 14, waypoints: [[29.7,-93.9],[25.5,-80.0],[35.0,-70.0],[51.9,4.1]] },
  "USA Gulf → Asia via Panama":                  { destName: "Japan",                 avgDays: 26, waypoints: [[29.7,-93.9],[9.2,-79.9],[15.0,-120.0],[35.0,136.0]] },
  "Brazil → China via Cape":                     { destName: "China",                 avgDays: 32, waypoints: [[-23.9,-46.3],[-34.5,26.0],[1.3,103.8],[30.0,122.0]] },
  "Brazil → Europe via Atlantic":                { destName: "Rotterdam",             avgDays: 18, waypoints: [[-23.9,-46.3],[35.9,-5.7],[51.9,4.1]] },
  "North Sea → Global via English Channel":      { destName: "Rotterdam",             avgDays: 2,  waypoints: [[60.5,-1.3],[51.9,4.1]] },
  "Libya/Algeria → Europe via Mediterranean":    { destName: "Rotterdam",             avgDays: 8,  waypoints: [[32.9,13.2],[35.9,-5.7],[51.9,4.1]] },
  "Caspian → Mediterranean via Ceyhan":          { destName: "Europe",                avgDays: 10, waypoints: [[40.8,36.9],[35.9,-5.7],[51.9,4.1]] },
  "Middle East → Europe via Cape (Suez bypass)": { destName: "Rotterdam (Houthi)",    avgDays: 31, waypoints: [[26.5,50.5],[-34.5,26.0],[35.9,-5.7],[51.9,4.1]] },
  "Canada Pacific → Asia":                       { destName: "Japan",                 avgDays: 12, waypoints: [[49.2,-123.1],[35.0,136.0]] },
  "Asia → USA West Coast via Pacific":           { destName: "Los Angeles",           avgDays: 14, waypoints: [[35.0,136.0],[25.0,-160.0],[33.7,-118.2]] },
};

const DEST_KEYWORDS = {
  "Persian Gulf → China via Malacca":       ["CHINA","NINGBO","QINGDAO","DALIAN","TIANJIN","SHANGHAI","ZHOUSHAN"],
  "Persian Gulf → Japan/Korea via Malacca": ["JAPAN","KOREA","ULSAN","YOKOHAMA","CHIBA","BUSAN","NAGOYA"],
  "Persian Gulf → India":                   ["INDIA","MUMBAI","JAMNAGAR","VADINAR","PARADIP","SIKKA"],
  "Persian Gulf → Europe via Suez":         ["ROTTERDAM","EUROPE","ANTWERP","AMSTERDAM","HAMBURG","TRIESTE"],
  "Persian Gulf → USA via Cape":            ["HOUSTON","PORT ARTHUR","TEXAS","LOUISIANA"],
  "Persian Gulf → Singapore":               ["SINGAPORE","JURONG"],
  "West Africa → USA East Coast":           ["NEW YORK","PHILADELPHIA","BALTIMORE"],
  "Russia Baltic → Europe via Oresund":     ["PRIMORSK","UST-LUGA","ROTTERDAM"],
  "Russia ESPO → China/Japan":              ["KOZMINO","KOREA","JAPAN","CHINA"],
};

// ══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════

// Haversine distance in nautical miles
function haversineNm(lat1, lng1, lat2, lng2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Project a position forward along a heading by a given distance (nm)
function projectPosition(lat, lng, headingDeg, distanceNm) {
  const R = 3440.065;
  const d = distanceNm / R;
  const heading = headingDeg * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1)*Math.cos(d) + Math.cos(lat1)*Math.sin(d)*Math.cos(heading));
  const lng2 = lng1 + Math.atan2(Math.sin(heading)*Math.sin(d)*Math.cos(lat1), Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
  return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
}

// Detect ocean region from position
function detectRegion(lat, lng) {
  if (lng > 47 && lng < 60 && lat > 22 && lat < 30) return "Persian Gulf";
  if (lng > 32 && lng < 44 && lat > 12 && lat < 30) return "Red Sea";
  if (lng > 44 && lng < 60 && lat > 10 && lat < 16) return "Gulf of Aden";
  if (lng > 55 && lng < 78 && lat > 5  && lat < 25) return "Arabian Sea";
  if (lng > 60 && lng < 100 && lat > -20 && lat < 5) return "Indian Ocean";
  if (lng > 100 && lng < 112 && lat > -6 && lat < 6) return "Strait of Malacca";
  if (lng > 110 && lng < 125 && lat > 0  && lat < 25) return "South China Sea";
  if (lng > 120 && lng < 150 && lat > 25 && lat < 45) return "Japan/Korea Waters";
  if (lng > -20 && lng < 20  && lat > -5 && lat < 15) return "West Africa";
  if (lng > -15 && lng < 10  && lat > 35 && lat < 60) return "European Atlantic";
  if (lng > -6  && lng < 42  && lat > 30 && lat < 46) return "Mediterranean";
  if (lng > 27  && lng < 42  && lat > 40 && lat < 47) return "Black Sea";
  if (lng > 9   && lng < 30  && lat > 54 && lat < 66) return "Baltic Sea";
  if (lng > 10  && lng < 40  && lat > -40 && lat < -25) return "Cape of Good Hope";
  if (lng > -100 && lng < -80 && lat > 18 && lat < 31) return "Gulf of Mexico";
  if (lng > -82  && lng < -60 && lat > 25 && lat < 45) return "US East Coast";
  if (lng > -130 && lng < -115 && lat > 30 && lat < 50) return "US West Coast";
  if (lng > -55  && lng < -30 && lat > -35 && lat < 5) return "South America Atlantic";
  return "Open Ocean";
}

// Find nearest port within 50nm
function matchPort(lat, lng) {
  let nearest = null;
  let minDist = 50; // Only match within 50nm
  for (const port of KNOWN_PORTS) {
    const dist = haversineNm(lat, lng, port.lat, port.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = port;
    }
  }
  return nearest;
}

// Detect which chokepoints a vessel is near
function detectChokepoints(lat, lng) {
  const passed = [];
  for (const cp of CHOKEPOINTS) {
    const dist = haversineNm(lat, lng, cp.lat, cp.lng);
    if (dist <= cp.radiusNm) {
      passed.push(cp.name);
    }
  }
  return passed;
}

// Calculate load status and estimated cargo from draught
function calculateLoadStatus(draught, vesselClass) {
  const classData = VESSEL_CLASS_DATA[vesselClass] || VESSEL_CLASS_DATA['Tanker'];
  if (!draught || draught <= 0) return { loadStatus: 'unknown', estimatedCargo: null };
  const range = classData.maxDraught - classData.minDraught;
  const loadFraction = Math.max(0, Math.min(1, (draught - classData.minDraught) / range));
  const estimatedCargo = Math.round(loadFraction * classData.maxCargo);
  let loadStatus;
  if (loadFraction > 0.80)      loadStatus = 'loaded';
  else if (loadFraction > 0.35) loadStatus = 'partial';
  else                           loadStatus = 'ballast';
  return { loadStatus, estimatedCargo };
}

// ══════════════════════════════════════════════════════════════════
// HEADING-FIRST PREDICTION ENGINE
// Signal hierarchy:
// 1. Heading projected forward — what waypoints/chokepoints does
//    the vessel's nose point toward?
// 2. Chokepoints already passed this voyage
// 3. Load status — loaded vessel leaving producer = outbound
// 4. Declared destination keyword match
// 5. Vessel history typical routes
// 6. Region fallback
// ══════════════════════════════════════════════════════════════════
function predictRoute(lat, lng, heading, destination, region, loadStatus, vesselClass, typicalRoutes, chokepointsPassed) {
  let routeName = null;
  let confidence = 0.40;
  let signals = [];

  // ── SIGNAL 1: Project heading forward and check waypoint alignment ──
  // Project 500nm, 1000nm, 2000nm ahead and see what's nearby
  const projections = [
    projectPosition(lat, lng, heading, 500),
    projectPosition(lat, lng, heading, 1000),
    projectPosition(lat, lng, heading, 2000),
    projectPosition(lat, lng, heading, 3000),
  ];

  let bestHeadingRoute = null;
  let bestHeadingScore = 0;

  for (const [rName, rData] of Object.entries(ROUTES)) {
    let waypointHits = 0;
    for (const proj of projections) {
      for (const wp of rData.waypoints) {
        const dist = haversineNm(proj.lat, proj.lng, wp[0], wp[1]);
        if (dist < 300) waypointHits++;
      }
    }
    // Also check chokepoint alignment
    for (const cp of CHOKEPOINTS) {
      for (const proj of projections) {
        const dist = haversineNm(proj.lat, proj.lng, cp.lat, cp.lng);
        if (dist < 200) {
          // Check if this chokepoint is on this route
          for (const wp of rData.waypoints) {
            const cpDist = haversineNm(cp.lat, cp.lng, wp[0], wp[1]);
            if (cpDist < 150) waypointHits += 2; // Chokepoint alignment is strong signal
          }
        }
      }
    }
    if (waypointHits > bestHeadingScore) {
      bestHeadingScore = waypointHits;
      bestHeadingRoute = rName;
    }
  }

  if (bestHeadingRoute && bestHeadingScore >= 2) {
    routeName = bestHeadingRoute;
    confidence = 0.60 + Math.min(0.20, bestHeadingScore * 0.03);
    signals.push(`heading projection (${bestHeadingScore} waypoint hits)`);
  }

  // ── SIGNAL 2: Chokepoints already passed this voyage ──
  if (chokepointsPassed && chokepointsPassed.length > 0) {
    for (const cp of chokepointsPassed) {
      if (cp === "Strait of Hormuz") {
        // Came from Persian Gulf — heading somewhere
        if (heading > 200 && heading < 320) {
          // Heading west/northwest = Suez or Cape
          routeName = "Persian Gulf → Europe via Suez";
          confidence = Math.max(confidence, 0.75);
          signals.push("passed Hormuz + westward heading");
        } else if (heading > 50 && heading < 150) {
          // Heading east = India, Malacca, China
          routeName = "Persian Gulf → China via Malacca";
          confidence = Math.max(confidence, 0.72);
          signals.push("passed Hormuz + eastward heading");
        }
      }
      if (cp === "Suez Canal") {
        routeName = "Persian Gulf → Europe via Suez";
        confidence = Math.max(confidence, 0.88);
        signals.push("confirmed Suez transit");
      }
      if (cp === "Strait of Malacca") {
        if (heading > 0 && heading < 100) {
          routeName = "Persian Gulf → China via Malacca";
          confidence = Math.max(confidence, 0.85);
          signals.push("confirmed Malacca + eastward");
        } else {
          routeName = "Persian Gulf → Japan/Korea via Malacca";
          confidence = Math.max(confidence, 0.80);
          signals.push("confirmed Malacca transit");
        }
      }
      if (cp === "Cape of Good Hope") {
        if (heading > 0 && heading < 120) {
          routeName = "West Africa → China via Cape";
          confidence = Math.max(confidence, 0.82);
          signals.push("confirmed Cape + eastward");
        } else {
          routeName = "Persian Gulf → Europe via Cape";
          confidence = Math.max(confidence, 0.82);
          signals.push("confirmed Cape + westward");
        }
      }
      if (cp === "Bosphorus") {
        routeName = "Black Sea → Mediterranean via Bosphorus";
        confidence = Math.max(confidence, 0.90);
        signals.push("confirmed Bosphorus transit");
      }
      if (cp === "Oresund Strait") {
        routeName = "Russia Baltic → Europe via Oresund";
        confidence = Math.max(confidence, 0.90);
        signals.push("confirmed Oresund transit");
      }
      if (cp === "Panama Canal") {
        routeName = "USA Gulf → Asia via Panama";
        confidence = Math.max(confidence, 0.88);
        signals.push("confirmed Panama transit");
      }
    }
  }

  // ── SIGNAL 3: Load status context ──
  if (loadStatus === 'loaded' && region === 'Persian Gulf') {
    confidence = Math.max(confidence, 0.65);
    signals.push("loaded vessel departing Persian Gulf");
  }
  if (loadStatus === 'ballast') {
    // Ballast vessel heading toward producer region = returning to load
    if (region === 'Persian Gulf' || region === 'West Africa') {
      confidence = Math.min(confidence, 0.50); // Lower confidence — not delivering
      signals.push("ballast vessel near producer");
    }
  }

  // ── SIGNAL 4: Declared destination keyword match ──
  const destUpper = (destination || "").toUpperCase().trim();
  if (destUpper.length > 2) {
    for (const [rName, keywords] of Object.entries(DEST_KEYWORDS)) {
      if (keywords.some(kw => destUpper.includes(kw))) {
        if (!routeName) routeName = rName;
        confidence = Math.max(confidence, 0.78);
        signals.push(`declared destination: ${destination}`);
        break;
      }
    }
  }

  // ── SIGNAL 5: Vessel history typical routes ──
  if (!routeName && typicalRoutes && typicalRoutes.length > 0) {
    const histRoute = typicalRoutes[0];
    if (ROUTES[histRoute]) {
      routeName = histRoute;
      confidence = Math.max(confidence, 0.65);
      signals.push("vessel history match");
    }
  }

  // ── SIGNAL 6: Region fallback ──
  if (!routeName) {
    const regionFallback = {
      "Persian Gulf":        "Persian Gulf → China via Malacca",
      "Red Sea":             "Persian Gulf → Europe via Suez",
      "Gulf of Aden":        "Persian Gulf → Europe via Suez",
      "Arabian Sea":         "Persian Gulf → India",
      "Indian Ocean":        "Persian Gulf → China via Malacca",
      "Strait of Malacca":   "Persian Gulf → China via Malacca",
      "South China Sea":     "Persian Gulf → China via Malacca",
      "Japan/Korea Waters":  "Persian Gulf → Japan/Korea via Malacca",
      "West Africa":         "West Africa → Europe via Atlantic",
      "European Atlantic":   "West Africa → Europe via Atlantic",
      "Mediterranean":       "Libya/Algeria → Europe via Mediterranean",
      "Black Sea":           "Black Sea → Mediterranean via Bosphorus",
      "Baltic Sea":          "Russia Baltic → Europe via Oresund",
      "Cape of Good Hope":   "West Africa → China via Cape",
      "Gulf of Mexico":      "USA Gulf → Europe via Atlantic",
      "US East Coast":       "USA Gulf → Europe via Atlantic",
      "US West Coast":       "Asia → USA West Coast via Pacific",
      "South America Atlantic": "Brazil → Europe via Atlantic",
      "Open Ocean":          "West Africa → Europe via Atlantic",
    };
    routeName = regionFallback[region] || "West Africa → Europe via Atlantic";
    signals.push(`region fallback: ${region}`);
  }

  const route = ROUTES[routeName] || ROUTES["West Africa → Europe via Atlantic"];
  console.log(`  [PREDICT] ${routeName} | confidence: ${(Math.min(confidence,0.95)*100).toFixed(0)}% | signals: ${signals.join(', ')}`);

  return {
    routeName,
    confidence: Math.min(confidence, 0.95),
    predictedDest: route.destName,
    etaDays: route.avgDays,
    signals,
  };
}

// ══════════════════════════════════════════════════════════════════
// COLLECT VESSELS FROM AISSTREAM
// Collects position, heading, speed AND draught
// ══════════════════════════════════════════════════════════════════
async function collectVessels() {
  return new Promise((resolve) => {
    const positions = {};
    const staticInfo = {};
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      try { ws.terminate(); } catch (_) {}
      const result = Object.values(positions).map(v => ({
        ...v,
        name: (staticInfo[v.mmsi]?.name || v.name || "UNKNOWN").trim(),
        destination: (staticInfo[v.mmsi]?.destination || "").trim(),
        draught: staticInfo[v.mmsi]?.draught || null,
        vessel_class: detectVesselClass(
          staticInfo[v.mmsi]?.name || v.name || "",
          staticInfo[v.mmsi]?.shipType || 80,
          staticInfo[v.mmsi]?.draught || null
        ),
      }));
      console.log(`Finishing collection with ${result.length} vessels`);
      resolve(result.slice(0, TARGET));
    };

    const timer = setTimeout(() => {
      console.log(`Timeout — collected ${Object.keys(positions).length} vessels`);
      finish();
    }, COLLECT_MS);

    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

    ws.on('open', () => {
      console.log("✅ Connected to AISstream WebSocket");
      ws.send(JSON.stringify({
        APIKey: AISSTREAM_KEY,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
        ShipTypes: [80,81,82,83,84,85,86,87,88,89],
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const meta = msg.MetaData || {};
        const mmsi = String(meta.MMSI || "");
        if (!mmsi || mmsi === "0") return;

        if (msg.MessageType === "PositionReport") {
          const pos = msg.Message?.PositionReport || {};
          const lat = parseFloat(String(meta.latitude ?? pos.Latitude ?? "0"));
          const lng = parseFloat(String(meta.longitude ?? pos.Longitude ?? "0"));
          if (!lat || !lng || (lat === 0 && lng === 0)) return;
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
          positions[mmsi] = {
            mmsi,
            name: (meta.ShipName || "").trim(),
            lat, lng,
            heading: Number(pos.TrueHeading ?? pos.Cog ?? 0),
            speed: Number(pos.Sog ?? 0),
            destination: "",
            draught: null,
            vessel_class: "Tanker",
            last_updated: new Date().toISOString(),
          };
          const count = Object.keys(positions).length;
          if (count % 10 === 0) console.log(`  Collected ${count} vessels...`);
          if (count >= TARGET) { clearTimeout(timer); finish(); }
        }

        if (msg.MessageType === "ShipStaticData") {
          const sd = msg.Message?.ShipStaticData || {};
          staticInfo[mmsi] = {
            name: (sd.Name || meta.ShipName || "").trim(),
            destination: (sd.Destination || "").trim(),
            draught: sd.MaximumStaticDraught ? parseFloat(sd.MaximumStaticDraught) : null,
            shipType: Number(sd.Type ?? 80),
          };
        }
      } catch (_) {}
    });

    ws.on('error', (err) => {
      console.error("WebSocket error:", err.message);
      clearTimeout(timer);
      finish();
    });

    ws.on('close', () => {
      clearTimeout(timer);
      finish();
    });
  });
}

// Detect vessel class from name, ship type, and draught
function detectVesselClass(name, shipType, draught) {
  const n = (name || "").toUpperCase();
  if (n.includes("VLCC") || n.includes("SUPERTANKER")) return "VLCC";
  if (n.includes("SUEZMAX")) return "Suezmax";
  if (n.includes("AFRAMAX")) return "Aframax";
  // Use draught to estimate class
  if (draught) {
    if (draught >= 18) return "VLCC";
    if (draught >= 14) return "Suezmax";
    if (draught >= 11) return "Aframax";
  }
  return "Tanker";
}

// ══════════════════════════════════════════════════════════════════
// VOYAGE DETECTION
// Compares current position against last known position
// to detect voyage start and end events
// ══════════════════════════════════════════════════════════════════
async function detectVoyageEvents(vessels, headers) {
  console.log("\nDetecting voyage events...");

  // Fetch existing vessel profiles (has last known state)
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles?select=*`, { headers });
  const profiles = profRes.ok ? await profRes.json() : [];
  const profileMap = {};
  for (const p of profiles) profileMap[p.mmsi] = p;

  // Fetch active voyages
  const voyRes = await fetch(`${SUPABASE_URL}/rest/v1/voyages?status=eq.active&select=*`, { headers });
  const activeVoyages = voyRes.ok ? await voyRes.json() : [];
  const activeVoyageMap = {};
  for (const v of activeVoyages) activeVoyageMap[v.mmsi] = v;

  const voyageUpdates = [];
  const newVoyages = [];

  for (const vessel of vessels) {
    const profile = profileMap[vessel.mmsi];
    const activeVoyage = activeVoyageMap[vessel.mmsi];
    const region = detectRegion(vessel.lat, vessel.lng);
    const nearPort = matchPort(vessel.lat, vessel.lng);
    const { loadStatus, estimatedCargo } = calculateLoadStatus(vessel.draught, vessel.vessel_class);
    const chokepointsNow = detectChokepoints(vessel.lat, vessel.lng);

    const isStationary = vessel.speed < 1.0;
    const wasMoving = profile ? (parseFloat(profile.last_speed || 0) >= 1.0) : false;
    const isMoving = vessel.speed >= 1.0;
    const wasStationary = profile ? (parseFloat(profile.last_speed || 0) < 1.0) : false;

    // ── VOYAGE END: Was moving, now stationary near a port ──
    if (activeVoyage && isStationary && nearPort) {
      console.log(`  VOYAGE END detected: ${vessel.name} arrived at ${nearPort.name}`);

      // Calculate actual route from chokepoints passed
      const allChokepoints = [...new Set([
        ...(activeVoyage.chokepoints_passed || []),
        ...chokepointsNow,
      ])];

      voyageUpdates.push({
        id: activeVoyage.id,
        status: 'completed',
        arrival_timestamp: vessel.last_updated,
        arrival_lat: vessel.lat,
        arrival_lng: vessel.lng,
        arrival_port: nearPort.name,
        arrival_region: region,
        arrival_draught: vessel.draught,
        chokepoints_passed: allChokepoints,
        total_voyage_days: activeVoyage.departure_timestamp
          ? (Date.now() - new Date(activeVoyage.departure_timestamp).getTime()) / 86400000
          : null,
        prediction_correct: activeVoyage.predicted_destination
          ? nearPort.name.toLowerCase().includes(activeVoyage.predicted_destination.toLowerCase()) ||
            activeVoyage.predicted_destination.toLowerCase().includes(nearPort.region?.toLowerCase() || '')
          : null,
      });
    }

    // ── VOYAGE START: Was stationary, now moving, loaded ──
    if (!activeVoyage && isMoving && wasStationary && loadStatus === 'loaded') {
      const typicalRoutes = profile?.typical_routes || [];
      const chokepointsPassed = [];
      const pred = predictRoute(
        vessel.lat, vessel.lng, vessel.heading,
        vessel.destination, region, loadStatus,
        vessel.vessel_class, typicalRoutes, chokepointsPassed
      );

      console.log(`  VOYAGE START detected: ${vessel.name} departing ${nearPort?.name || region}`);

      newVoyages.push({
        mmsi: vessel.mmsi,
        vessel_name: vessel.name,
        vessel_class: vessel.vessel_class,
        departure_timestamp: vessel.last_updated,
        departure_lat: vessel.lat,
        departure_lng: vessel.lng,
        departure_port: nearPort?.name || null,
        departure_region: region,
        departure_draught: vessel.draught,
        departure_load_status: loadStatus,
        estimated_cargo_tonnes: estimatedCargo,
        declared_destination: vessel.destination || null,
        predicted_destination: pred.predictedDest,
        predicted_route: pred.routeName,
        confidence_at_departure: pred.confidence,
        chokepoints_passed: [],
        status: 'active',
      });
    }

    // ── UPDATE CHOKEPOINTS on active voyage ──
    if (activeVoyage && chokepointsNow.length > 0) {
      const existing = activeVoyage.chokepoints_passed || [];
      const updated = [...new Set([...existing, ...chokepointsNow])];
      if (updated.length > existing.length) {
        voyageUpdates.push({
          id: activeVoyage.id,
          chokepoints_passed: updated,
        });
        console.log(`  Chokepoints updated for ${vessel.name}: ${updated.join(', ')}`);
      }
    }
  }

  return { voyageUpdates, newVoyages };
}

// ══════════════════════════════════════════════════════════════════
// SAVE TO SUPABASE
// ══════════════════════════════════════════════════════════════════
async function saveToSupabase(vessels) {
  const headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
  };

  // ── 1. Detect voyage events BEFORE clearing vessels ──
  const { voyageUpdates, newVoyages } = await detectVoyageEvents(vessels, headers);

  // ── 2. Clear old vessel data ──
  console.log("\nClearing old vessel data...");
  await fetch(`${SUPABASE_URL}/rest/v1/vessels?id=gte.0`, { method: "DELETE", headers });
  await fetch(`${SUPABASE_URL}/rest/v1/predictions?id=gte.0`, { method: "DELETE", headers });

  // ── 3. Insert fresh vessels with draught and load status ──
  const vesselRows = vessels.map(v => {
    const { loadStatus, estimatedCargo } = calculateLoadStatus(v.draught, v.vessel_class);
    return {
      mmsi: v.mmsi,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      heading: v.heading,
      speed: v.speed,
      destination: v.destination,
      vessel_class: v.vessel_class,
      draught: v.draught,
      load_status: loadStatus,
      estimated_cargo_tonnes: estimatedCargo,
      last_updated: v.last_updated,
    };
  });

  const vRes = await fetch(`${SUPABASE_URL}/rest/v1/vessels`, {
    method: "POST", headers, body: JSON.stringify(vesselRows),
  });
  console.log(`Vessels insert: HTTP ${vRes.status}`);

  // ── 4. Insert vessel history with draught ──
  const historyRows = vessels.map(v => {
    const { loadStatus } = calculateLoadStatus(v.draught, v.vessel_class);
    return {
      mmsi: v.mmsi,
      lat: v.lat,
      lng: v.lng,
      heading: v.heading,
      speed: v.speed,
      draught: v.draught,
      load_status: loadStatus,
      recorded_at: v.last_updated,
    };
  });

  const hRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_history`, {
    method: "POST", headers, body: JSON.stringify(historyRows),
  });
  console.log(`History insert: HTTP ${hRes.status}`);

  // ── 5. Insert predictions with heading-first signals ──
  const predRows = vessels.map(v => {
    const region = detectRegion(v.lat, v.lng);
    const { loadStatus } = calculateLoadStatus(v.draught, v.vessel_class);
    const pred = predictRoute(
      v.lat, v.lng, v.heading,
      v.destination, region, loadStatus,
      v.vessel_class, [], []
    );
    return {
      mmsi: v.mmsi,
      predicted_destination: pred.predictedDest,
      route_name: pred.routeName,
      confidence: pred.confidence,
      predicted_eta: new Date(Date.now() + pred.etaDays * 86400000).toISOString(),
      created_at: v.last_updated,
    };
  });

  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/predictions`, {
    method: "POST", headers, body: JSON.stringify(predRows),
  });
  console.log(`Predictions insert: HTTP ${pRes.status}`);

  // ── 6. Upsert vessel profiles ──
  const profileRows = vessels.map(v => {
    const region = detectRegion(v.lat, v.lng);
    const { loadStatus } = calculateLoadStatus(v.draught, v.vessel_class);
    const pred = predictRoute(
      v.lat, v.lng, v.heading,
      v.destination, region, loadStatus,
      v.vessel_class, [], []
    );
    return {
      mmsi: v.mmsi,
      name: v.name,
      vessel_class: v.vessel_class,
      last_seen_region: region,
      last_speed: v.speed,
      last_heading: v.heading,
      last_draught: v.draught,
      last_load_status: loadStatus,
      typical_routes: [pred.routeName],
      can_use_suez: v.vessel_class !== 'VLCC',
      updated_at: v.last_updated,
    };
  });

  // Upsert profiles (merge by mmsi)
  const prRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles`, {
    method: "POST",
    headers: { ...headers, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify(profileRows),
  });
  console.log(`Profiles upsert: HTTP ${prRes.status}`);
  if (!prRes.ok) {
    const errText = await prRes.text();
    console.error(`Profiles upsert error: ${errText}`);
  }

  // ── 7. Save new voyages ──
  if (newVoyages.length > 0) {
    const nvRes = await fetch(`${SUPABASE_URL}/rest/v1/voyages`, {
      method: "POST", headers, body: JSON.stringify(newVoyages),
    });
    console.log(`New voyages recorded: ${newVoyages.length} | HTTP ${nvRes.status}`);
  }

  // ── 8. Update completed/modified voyages ──
  for (const update of voyageUpdates) {
    const { id, ...updateData } = update;
    const uvRes = await fetch(`${SUPABASE_URL}/rest/v1/voyages?id=eq.${id}`, {
      method: "PATCH", headers, body: JSON.stringify(updateData),
    });
    console.log(`Voyage ${id} updated: HTTP ${uvRes.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
(async () => {
  console.log("🛢️  UFS Vessel Collector v2.0 starting...");
  console.log(`Target: ${TARGET} vessels | Timeout: ${COLLECT_MS / 1000}s`);
  console.log(`Time: ${new Date().toUTCString()}\n`);

  const vessels = await collectVessels();

  if (vessels.length === 0) {
    console.error("❌ No vessels collected. Check AISstream API key.");
    process.exit(1);
  }

  console.log(`\n✅ Collected ${vessels.length} vessels`);

  // Log sample of what we got
  const sample = vessels.slice(0, 3);
  for (const v of sample) {
    const { loadStatus, estimatedCargo } = calculateLoadStatus(v.draught, v.vessel_class);
    console.log(`  ${v.name} | ${v.vessel_class} | speed: ${v.speed}kts | heading: ${v.heading}° | draught: ${v.draught || 'N/A'}m | load: ${loadStatus} | ~${estimatedCargo || 'N/A'}t`);
  }

  console.log("\nSaving to Supabase...");
  await saveToSupabase(vessels);

  console.log("\n🎉 Done.");
})();
