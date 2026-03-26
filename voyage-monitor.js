// ══════════════════════════════════════════════════════════════════════════
// UFS VOYAGE MONITOR v1.0
// United Facility Solution — Market Intelligence Platform
//
// Runs every 48 hours via GitHub Actions
//
// What this does:
// 1. Fetches all active voyages from Supabase
// 2. Gathers position history, draught, chokepoints for each voyage
// 3. Looks up vessel in known vessel database
// 4. Reasons about route using knowledge base signals
// 5. Detects re-predictions when vessel deviates
// 6. Estimates cargo grade, volume, buyer, trade value
// 7. Classifies the trade type
// 8. Saves full intelligence record to voyage_intelligence table
// 9. Updates voyage record with latest prediction
// ══════════════════════════════════════════════════════════════════════════

const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ══════════════════════════════════════════════════════════════════════════
// INLINE KNOWLEDGE BASE
// Key data from ufs-knowledge-base.js and ufs-vessel-database.js
// Inlined here so the script is self-contained in GitHub Actions
// ══════════════════════════════════════════════════════════════════════════

// Vessel class specifications
const VESSEL_CLASS_DATA = {
  'VLCC':          { maxDraught: 22.5, minDraught: 8.0,  maxCargo: 300000, bblPerTonne: 7.1, typicalSpeed: 15 },
  'Suezmax':       { maxDraught: 20.1, minDraught: 6.0,  maxCargo: 160000, bblPerTonne: 7.2, typicalSpeed: 14 },
  'Aframax':       { maxDraught: 14.5, minDraught: 5.5,  maxCargo: 120000, bblPerTonne: 7.3, typicalSpeed: 14 },
  'Tanker':        { maxDraught: 12.0, minDraught: 4.0,  maxCargo: 60000,  bblPerTonne: 7.3, typicalSpeed: 13 },
  'CoastalTanker': { maxDraught: 8.0,  minDraught: 2.0,  maxCargo: 25000,  bblPerTonne: 7.3, typicalSpeed: 11 },
};

// Crude grades by origin port region
const PORT_TO_GRADE = {
  'Persian Gulf':       { grade: 'Arab Light',    apiGravity: 33.4, sulfur: 1.77, priceVsBrent: -0.5 },
  'Red Sea':            { grade: 'Arab Light',    apiGravity: 33.4, sulfur: 1.77, priceVsBrent: -0.5 },
  'West Africa':        { grade: 'Bonny Light',   apiGravity: 35.4, sulfur: 0.13, priceVsBrent: +1.5 },
  'Baltic Sea':         { grade: 'Urals',         apiGravity: 31.7, sulfur: 1.35, priceVsBrent: -15.0, sanctioned: true },
  'Black Sea':          { grade: 'Urals/CPC',     apiGravity: 32.0, sulfur: 1.20, priceVsBrent: -12.0 },
  'Mediterranean':      { grade: 'Es Sider',      apiGravity: 36.8, sulfur: 0.44, priceVsBrent: +0.5 },
  'Gulf of Mexico':     { grade: 'WTI',           apiGravity: 39.6, sulfur: 0.24, priceVsBrent: -1.0 },
  'South America Atlantic': { grade: 'Tupi',      apiGravity: 28.3, sulfur: 0.40, priceVsBrent: -2.0 },
  'US East Coast':      { grade: 'WTI',           apiGravity: 39.6, sulfur: 0.24, priceVsBrent: -1.0 },
  'Arabian Sea':        { grade: 'Oman Blend',    apiGravity: 33.0, sulfur: 0.99, priceVsBrent: -1.0 },
  'Indian Ocean':       { grade: 'Mixed',         apiGravity: 33.0, sulfur: 1.0,  priceVsBrent: -1.0 },
};

// Destination region to likely buyer
const DEST_TO_BUYER = {
  'China':              { buyer: 'Chinese NOCs (Sinopec/CNOOC/PetroChina)', refineryType: 'Complex', notes: 'Largest crude importer. Buys all grades including sanctioned.' },
  'Japan/Korea':        { buyer: 'Japanese/Korean refiners (ENEOS, SK Innovation, S-Oil, GS Caltex)', refineryType: 'Complex', notes: 'Long-term contracts with Middle East producers.' },
  'India':              { buyer: 'Indian refiners (Reliance, IOC, HPCL, BPCL)', refineryType: 'Complex', notes: 'Increasingly buying discounted Russian crude.' },
  'Rotterdam':          { buyer: 'European refiners (Shell Pernis, BP, ExxonMobil)', refineryType: 'Simple/Complex', notes: 'Northwest Europe hub. Post-sanctions shifted to US and West African crude.' },
  'Rotterdam (Cape)':   { buyer: 'European refiners', refineryType: 'Complex', notes: 'Cape route = either Houthi avoidance or VLCC too large for Suez.' },
  'Rotterdam (Houthi)': { buyer: 'European refiners', refineryType: 'Complex', notes: 'Definitive Houthi/Red Sea avoidance route.' },
  'US Gulf Coast':      { buyer: 'US Gulf refiners (Valero, Marathon, ExxonMobil Beaumont)', refineryType: 'Complex', notes: 'Processes heavy sour and light sweet crude.' },
  'New York':           { buyer: 'US East Coast refiners', refineryType: 'Simple', notes: 'Light sweet crude preferred.' },
  'Singapore':          { buyer: 'Singapore refiners (ExxonMobil, Shell, SRC)', refineryType: 'Complex', notes: 'Regional hub. Often trans-shipment point.' },
  'Australia':          { buyer: 'Australian refiners', refineryType: 'Simple', notes: 'Small volume, niche market.' },
  'Los Angeles':        { buyer: 'US West Coast refiners (Chevron, Phillips 66)', refineryType: 'Complex', notes: 'Receives Canadian and Middle East crude.' },
  'Korea/Japan':        { buyer: 'Korean/Japanese refiners', refineryType: 'Complex', notes: 'ESPO route from Russia Pacific.' },
  'Europe':             { buyer: 'European refiners', refineryType: 'Various', notes: 'Mediterranean or Northwest Europe.' },
  'Mumbai':             { buyer: 'Indian refiners', refineryType: 'Complex', notes: 'Jamnagar, Vadinar are primary Indian crude ports.' },
};

// Trade classification rules
const TRADE_CLASSIFICATIONS = {
  NORMAL_TRADE:        'Standard commercial crude trade along expected route.',
  SANCTIONS_BYPASS:    'Route or vessel suggests sanctioned crude movement.',
  HOUTHI_DIVERSION:    'Cape of Good Hope routing instead of Suez — Houthi Red Sea avoidance.',
  HORMUZ_DIVERSION:    'Vessel bypassed Strait of Hormuz closure (March 2026).',
  SHIP_TO_SHIP:        'Vessel stopped mid-ocean — possible ship-to-ship transfer.',
  SPOT_CARGO:          'Unusual route for this vessel — possible spot market cargo.',
  STRATEGIC_RESERVE:   'Destination consistent with strategic petroleum reserve terminal.',
  DARK_VOYAGE:         'AIS gaps detected — possible dark voyage for sanctioned crude.',
};

// Known vessel database (key vessels)
const VESSEL_DB = {
  // DHT Holdings
  '538011588': { name: 'DHT TIGER',    operator: 'DHT Holdings', vesselClass: 'VLCC', dwt: 319430, typicalRoutes: ['Persian Gulf → China via Malacca'], sanctioned: false },
  '538011659': { name: 'DHT CHINA',    operator: 'DHT Holdings', vesselClass: 'VLCC', dwt: 299999, typicalRoutes: ['Persian Gulf → China via Malacca', 'West Africa → China via Cape'], sanctioned: false },
  '477538500': { name: 'DHT EUROPE',   operator: 'DHT Holdings', vesselClass: 'VLCC', dwt: 299999, typicalRoutes: ['Persian Gulf → Europe via Cape', 'West Africa → Europe via Atlantic'], sanctioned: false },
  // Bahri
  '403517000': { name: 'ABQAIQ',       operator: 'Bahri',        vesselClass: 'VLCC', dwt: 319262, typicalRoutes: ['Persian Gulf → China via Malacca', 'Persian Gulf → Japan/Korea via Malacca'], sanctioned: false },
  '403513000': { name: 'SIRIUS STAR',  operator: 'Bahri',        vesselClass: 'VLCC', dwt: 318000, typicalRoutes: ['Persian Gulf → USA via Cape', 'Persian Gulf → China via Malacca'], sanctioned: false },
  // Ocean Raider / Ocean Comeau
  '563751000': { name: 'OCEAN RAIDER', operator: 'Various',      vesselClass: 'VLCC', dwt: 300000, typicalRoutes: ['Persian Gulf → China via Malacca'], sanctioned: false },
  '316001103': { name: 'OCEAN COMEAU', operator: 'Various',      vesselClass: 'Suezmax', dwt: 157000, typicalRoutes: ['USA Gulf → Europe via Atlantic'], sanctioned: false },
  '477996613': { name: 'PACIFIC HARMONY', operator: 'Various',   vesselClass: 'Aframax', dwt: 115000, typicalRoutes: ['Russia ESPO → China/Japan', 'Persian Gulf → China via Malacca'], sanctioned: false },
};

// Name pattern matching
const NAME_PATTERNS = [
  { pattern: /^DHT\s/i,        operator: 'DHT Holdings',           vesselClass: 'VLCC',    confidence: 0.95, sanctioned: false },
  { pattern: /^NORDIC\s/i,     operator: 'Nordic American Tankers',vesselClass: 'Suezmax', confidence: 0.75, sanctioned: false },
  { pattern: /^FRONT\s/i,      operator: 'Frontline',              vesselClass: 'VLCC',    confidence: 0.85, sanctioned: false },
  { pattern: /^FRONTLINE\s/i,  operator: 'Frontline',              vesselClass: 'VLCC',    confidence: 0.95, sanctioned: false },
  { pattern: /^MARAN\s/i,      operator: 'Maran Tankers',          vesselClass: 'VLCC',    confidence: 0.95, sanctioned: false },
  { pattern: /^MAERSK\s/i,     operator: 'Maersk Tankers',         vesselClass: 'Suezmax', confidence: 0.90, sanctioned: false },
  { pattern: /^STENA\s/i,      operator: 'Stena Tankers',          vesselClass: 'Aframax', confidence: 0.90, sanctioned: false },
  { pattern: /^MINERVA\s/i,    operator: 'Minerva Marine',         vesselClass: 'Aframax', confidence: 0.90, sanctioned: false },
  { pattern: /^BW\s/i,         operator: 'BW Group',               vesselClass: 'VLCC',    confidence: 0.85, sanctioned: false },
  { pattern: /^NS\s/i,         operator: 'Sovcomflot (SCF)',        vesselClass: 'Aframax', confidence: 0.75, sanctioned: true },
  { pattern: /^DESH\s/i,       operator: 'Shipping Corp of India', vesselClass: 'VLCC',    confidence: 0.95, sanctioned: false },
  { pattern: /^CHEM\s/i,       operator: 'China Merchants',        vesselClass: 'VLCC',    confidence: 0.85, sanctioned: false },
  { pattern: /^SKS\s/i,        operator: 'SK Shipping',            vesselClass: 'VLCC',    confidence: 0.90, sanctioned: false },
  { pattern: /VLCC/i,          operator: 'Various',                vesselClass: 'VLCC',    confidence: 0.90, sanctioned: false },
  { pattern: /SUEZMAX/i,       operator: 'Various',                vesselClass: 'Suezmax', confidence: 0.90, sanctioned: false },
  { pattern: /AFRAMAX/i,       operator: 'Various',                vesselClass: 'Aframax', confidence: 0.90, sanctioned: false },
];

// ══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════

function haversineNm(lat1, lng1, lat2, lng2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function detectRegion(lat, lng) {
  if (lng > 47 && lng < 60 && lat > 22 && lat < 30) return 'Persian Gulf';
  if (lng > 32 && lng < 44 && lat > 12 && lat < 30) return 'Red Sea';
  if (lng > 44 && lng < 60 && lat > 10 && lat < 16) return 'Gulf of Aden';
  if (lng > 55 && lng < 78 && lat > 5  && lat < 25) return 'Arabian Sea';
  if (lng > 60 && lng < 100 && lat > -20 && lat < 5) return 'Indian Ocean';
  if (lng > 100 && lng < 112 && lat > -6 && lat < 6) return 'Strait of Malacca';
  if (lng > 110 && lng < 125 && lat > 0  && lat < 25) return 'South China Sea';
  if (lng > 120 && lng < 150 && lat > 25 && lat < 45) return 'Japan/Korea Waters';
  if (lng > -20 && lng < 20  && lat > -5 && lat < 15) return 'West Africa';
  if (lng > -15 && lng < 10  && lat > 35 && lat < 60) return 'European Atlantic';
  if (lng > -6  && lng < 42  && lat > 30 && lat < 46) return 'Mediterranean';
  if (lng > 27  && lng < 42  && lat > 40 && lat < 47) return 'Black Sea';
  if (lng > 9   && lng < 30  && lat > 54 && lat < 66) return 'Baltic Sea';
  if (lng > 10  && lng < 40  && lat > -40 && lat < -25) return 'Cape of Good Hope';
  if (lng > -100 && lng < -80 && lat > 18 && lat < 31) return 'Gulf of Mexico';
  if (lng > -82  && lng < -60 && lat > 25 && lat < 45) return 'US East Coast';
  if (lng > -130 && lng < -115 && lat > 30 && lat < 50) return 'US West Coast';
  if (lng > -55  && lng < -30 && lat > -35 && lat < 5) return 'South America Atlantic';
  return 'Open Ocean';
}

function getVesselIntelligence(mmsi, name) {
  // Check MMSI database first
  if (mmsi && VESSEL_DB[String(mmsi)]) {
    return { ...VESSEL_DB[String(mmsi)], matchType: 'mmsi', matchConfidence: 1.0, known: true };
  }
  // Try name patterns
  if (name) {
    for (const p of NAME_PATTERNS) {
      if (p.pattern.test(name)) {
        return { name, operator: p.operator, vesselClass: p.vesselClass, sanctioned: p.sanctioned, matchType: 'pattern', matchConfidence: p.confidence, known: false };
      }
    }
  }
  return null;
}

function calculateLoadStatus(draught, vesselClass) {
  const cls = VESSEL_CLASS_DATA[vesselClass] || VESSEL_CLASS_DATA['Tanker'];
  if (!draught || draught <= 0) return { loadStatus: 'unknown', estimatedTonnes: null, estimatedBarrels: null };
  const range = cls.maxDraught - cls.minDraught;
  const fraction = Math.max(0, Math.min(1, (draught - cls.minDraught) / range));
  const tonnes = Math.round(fraction * cls.maxCargo);
  const barrels = Math.round(tonnes * cls.bblPerTonne);
  let loadStatus = fraction > 0.80 ? 'loaded' : fraction > 0.35 ? 'partial' : 'ballast';
  return { loadStatus, estimatedTonnes: tonnes, estimatedBarrels: barrels };
}

function estimateCargoValue(barrels, gradeInfo, brentPrice) {
  if (!barrels || !brentPrice) return null;
  const pricePerBarrel = brentPrice + (gradeInfo?.priceVsBrent || 0);
  return Math.round(barrels * pricePerBarrel);
}

function projectHeading(lat, lng, headingDeg, distanceNm) {
  const R = 3440.065;
  const d = distanceNm / R;
  const h = headingDeg * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1)*Math.cos(d) + Math.cos(lat1)*Math.sin(d)*Math.cos(h));
  const lng2 = lng1 + Math.atan2(Math.sin(h)*Math.sin(d)*Math.cos(lat1), Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
  return { lat: lat2 * 180/Math.PI, lng: lng2 * 180/Math.PI };
}

// ══════════════════════════════════════════════════════════════════════════
// ROUTE WAYPOINTS — for proximity checking
// ══════════════════════════════════════════════════════════════════════════
const ROUTE_WAYPOINTS = {
  'Persian Gulf → China via Malacca':       [[26.5,50.5],[23.5,59.5],[1.3,103.8],[10.0,111.0],[30.0,122.0]],
  'Persian Gulf → Japan/Korea via Malacca': [[26.5,50.5],[23.5,59.5],[1.3,103.8],[18.0,118.0],[35.0,136.0]],
  'Persian Gulf → India':                   [[26.5,50.5],[23.5,59.5],[22.0,63.0],[19.1,72.8]],
  'Persian Gulf → Europe via Suez':         [[26.5,50.5],[12.5,43.5],[30.7,32.5],[35.9,-5.7],[51.9,4.1]],
  'Persian Gulf → Europe via Cape':         [[26.5,50.5],[23.5,59.5],[-34.5,26.0],[35.9,-5.7],[51.9,4.1]],
  'Persian Gulf → USA via Cape':            [[26.5,50.5],[23.5,59.5],[-34.5,26.0],[25.0,-65.0],[29.7,-93.9]],
  'West Africa → China via Cape':           [[4.5,5.0],[-34.5,26.0],[1.3,103.8],[30.0,122.0]],
  'West Africa → Europe via Atlantic':      [[4.5,5.0],[35.9,-5.7],[51.9,4.1]],
  'West Africa → USA East Coast':           [[4.5,5.0],[17.0,-30.0],[40.7,-74.0]],
  'Black Sea → Mediterranean via Bosphorus':[[44.7,37.8],[41.5,29.5],[35.9,-5.7],[51.9,4.1]],
  'Russia Baltic → Europe via Oresund':     [[60.4,28.6],[56.0,12.6],[51.9,4.1]],
  'Russia ESPO → China/Japan':              [[42.7,133.1],[35.0,129.0]],
  'USA Gulf → Europe via Atlantic':         [[29.7,-93.9],[25.5,-80.0],[35.0,-70.0],[51.9,4.1]],
  'Brazil → China via Cape':                [[-23.9,-46.3],[-34.5,26.0],[1.3,103.8],[30.0,122.0]],
  'Brazil → Europe via Atlantic':           [[-23.9,-46.3],[35.9,-5.7],[51.9,4.1]],
  'Middle East → Europe via Cape (Suez bypass)': [[26.5,50.5],[-34.5,26.0],[35.9,-5.7],[51.9,4.1]],
};

const ROUTE_DEST = {
  'Persian Gulf → China via Malacca':       'China',
  'Persian Gulf → Japan/Korea via Malacca': 'Japan/Korea',
  'Persian Gulf → India':                   'India',
  'Persian Gulf → Europe via Suez':         'Rotterdam',
  'Persian Gulf → Europe via Cape':         'Rotterdam (Cape)',
  'Persian Gulf → USA via Cape':            'US Gulf Coast',
  'West Africa → China via Cape':           'China',
  'West Africa → Europe via Atlantic':      'Rotterdam',
  'West Africa → USA East Coast':           'New York',
  'Black Sea → Mediterranean via Bosphorus':'Rotterdam',
  'Russia Baltic → Europe via Oresund':     'Rotterdam',
  'Russia ESPO → China/Japan':              'Korea/Japan',
  'USA Gulf → Europe via Atlantic':         'Rotterdam',
  'Brazil → China via Cape':                'China',
  'Brazil → Europe via Atlantic':           'Rotterdam',
  'Middle East → Europe via Cape (Suez bypass)': 'Rotterdam (Houthi)',
};

const ROUTE_DAYS = {
  'Persian Gulf → China via Malacca': 18, 'Persian Gulf → Japan/Korea via Malacca': 20,
  'Persian Gulf → India': 7, 'Persian Gulf → Europe via Suez': 16,
  'Persian Gulf → Europe via Cape': 31, 'Persian Gulf → USA via Cape': 38,
  'West Africa → China via Cape': 28, 'West Africa → Europe via Atlantic': 14,
  'West Africa → USA East Coast': 16, 'Black Sea → Mediterranean via Bosphorus': 12,
  'Russia Baltic → Europe via Oresund': 5, 'Russia ESPO → China/Japan': 4,
  'USA Gulf → Europe via Atlantic': 14, 'Brazil → China via Cape': 32,
  'Brazil → Europe via Atlantic': 18, 'Middle East → Europe via Cape (Suez bypass)': 31,
};

// ══════════════════════════════════════════════════════════════════════════
// CORE REASONING ENGINE
// Takes all available data and produces an intelligence assessment
// ══════════════════════════════════════════════════════════════════════════

function reasonAboutVoyage(voyage, history, vesselInfo) {
  const reasoning = [];
  let routeName = voyage.predicted_route;
  let confidence = voyage.confidence_at_departure || 0.40;
  let tradeClassification = 'NORMAL_TRADE';
  let rePredictionNeeded = false;
  let rePredictionReason = null;

  // ── Get latest position ──────────────────────────────────────────────
  const latest = history.length > 0 ? history[0] : null;
  const currentLat = latest?.lat || null;
  const currentLng = latest?.lng || null;
  const currentSpeed = latest?.speed || 0;
  const currentHeading = latest?.heading || null;
  const currentDraught = latest?.draught || null;
  const currentRegion = currentLat ? detectRegion(currentLat, currentLng) : 'Unknown';

  // ── Hours into voyage ─────────────────────────────────────────────────
  const hoursElapsed = voyage.departure_timestamp
    ? (Date.now() - new Date(voyage.departure_timestamp).getTime()) / 3600000
    : 0;

  reasoning.push(`Voyage started ${hoursElapsed.toFixed(0)} hours ago from ${voyage.departure_region || 'unknown region'}.`);
  reasoning.push(`Current position: ${currentRegion}. Speed: ${currentSpeed?.toFixed(1) || 'N/A'} kts. Heading: ${currentHeading || 'N/A'}°.`);

  // ── SIGNAL 1: Known vessel intelligence ──────────────────────────────
  if (vesselInfo?.known) {
    reasoning.push(`Vessel confirmed: ${vesselInfo.name} operated by ${vesselInfo.operator} (${vesselInfo.vesselClass}).`);
    if (vesselInfo.typicalRoutes?.length > 0) {
      reasoning.push(`Typical routes for this vessel: ${vesselInfo.typicalRoutes.join(', ')}.`);
      // Check if current prediction matches typical routes
      if (!vesselInfo.typicalRoutes.includes(routeName)) {
        reasoning.push(`Current prediction (${routeName}) differs from vessel's typical routes. Reviewing signals.`);
        confidence = Math.max(confidence - 0.05, 0.30);
      } else {
        confidence = Math.min(confidence + 0.10, 0.95);
        reasoning.push(`Prediction consistent with vessel's historical routes. Confidence boosted.`);
      }
    }
    if (vesselInfo.sanctioned) {
      tradeClassification = 'SANCTIONS_BYPASS';
      reasoning.push(`⚠ SANCTIONS FLAG: ${vesselInfo.operator} is a sanctioned operator. This cargo is likely sanctioned crude moving via shadow fleet.`);
      confidence = Math.min(confidence + 0.15, 0.95);
    }
  } else if (vesselInfo) {
    reasoning.push(`Vessel operator inferred from name pattern: ${vesselInfo.operator} (${vesselInfo.vesselClass}). Match confidence: ${(vesselInfo.matchConfidence*100).toFixed(0)}%.`);
    if (vesselInfo.sanctioned) {
      tradeClassification = 'SANCTIONS_BYPASS';
      reasoning.push(`⚠ SANCTIONS FLAG: Name pattern suggests sanctioned operator.`);
    }
  }

  // ── SIGNAL 2: Chokepoints passed ─────────────────────────────────────
  const chokepoints = voyage.chokepoints_passed || [];
  if (chokepoints.length > 0) {
    reasoning.push(`Chokepoints confirmed passed: ${chokepoints.join(', ')}.`);

    if (chokepoints.includes('Suez Canal')) {
      routeName = 'Persian Gulf → Europe via Suez';
      confidence = Math.min(confidence + 0.35, 0.95);
      reasoning.push(`✓ Suez Canal transit confirmed → destination is Europe via Suez. High confidence.`);
      rePredictionNeeded = voyage.predicted_route !== routeName;
      if (rePredictionNeeded) rePredictionReason = 'Suez Canal transit confirmed — overrides previous prediction';
    }
    if (chokepoints.includes('Strait of Malacca')) {
      if (currentHeading && currentHeading > 0 && currentHeading < 120) {
        routeName = 'Persian Gulf → China via Malacca';
        confidence = Math.min(confidence + 0.30, 0.95);
        reasoning.push(`✓ Malacca transit + eastward heading → China destination confirmed.`);
      } else {
        routeName = 'Persian Gulf → Japan/Korea via Malacca';
        confidence = Math.min(confidence + 0.25, 0.90);
        reasoning.push(`✓ Malacca transit → Japan/Korea/China destination. Heading will confirm exact port.`);
      }
      rePredictionNeeded = voyage.predicted_route !== routeName;
      if (rePredictionNeeded) rePredictionReason = 'Malacca Strait transit confirmed';
    }
    if (chokepoints.includes('Strait of Hormuz')) {
      reasoning.push(`✓ Hormuz transit confirmed — vessel originated from Persian Gulf. NOTE: Hormuz closed to Western shipping since March 2026. This vessel transited before closure or is Iranian.`);
      confidence = Math.min(confidence + 0.10, 0.90);
    }
    if (chokepoints.includes('Bosphorus')) {
      routeName = 'Black Sea → Mediterranean via Bosphorus';
      confidence = Math.min(confidence + 0.40, 0.95);
      reasoning.push(`✓ Bosphorus transit confirmed → Black Sea origin vessel heading to Mediterranean/Atlantic.`);
      rePredictionNeeded = voyage.predicted_route !== routeName;
      if (rePredictionNeeded) rePredictionReason = 'Bosphorus transit confirmed';
    }
    if (chokepoints.includes('Oresund Strait')) {
      routeName = 'Russia Baltic → Europe via Oresund';
      confidence = Math.min(confidence + 0.40, 0.95);
      reasoning.push(`✓ Oresund transit confirmed → Baltic origin vessel. Likely Russian Urals.`);
      rePredictionNeeded = voyage.predicted_route !== routeName;
      if (rePredictionNeeded) rePredictionReason = 'Oresund Strait transit confirmed';
    }
    if (chokepoints.includes('Cape of Good Hope')) {
      // Cape routing = either Houthi diversion or normal Cape route
      const wasExpectedSuez = voyage.predicted_route?.includes('via Suez');
      if (wasExpectedSuez) {
        tradeClassification = 'HOUTHI_DIVERSION';
        reasoning.push(`⚡ DIVERSION DETECTED: Vessel took Cape of Good Hope instead of Suez Canal. Classifying as Houthi Red Sea avoidance diversion.`);
        routeName = voyage.predicted_route?.replace('via Suez', 'via Cape') || 'Middle East → Europe via Cape (Suez bypass)';
        rePredictionNeeded = true;
        rePredictionReason = 'Cape routing instead of Suez — Houthi diversion detected';
        confidence = Math.min(confidence + 0.20, 0.90);
      } else {
        confidence = Math.min(confidence + 0.15, 0.85);
        reasoning.push(`✓ Cape of Good Hope transit confirmed.`);
      }
    }
  }

  // ── SIGNAL 3: Heading projection ─────────────────────────────────────
  if (currentHeading !== null && currentHeading >= 0 && currentHeading <= 360 && currentLat && currentLng) {
    const projections = [500, 1000, 2000].map(d => projectHeading(currentLat, currentLng, currentHeading, d));
    let bestRoute = null;
    let bestHits = 0;

    for (const [rName, waypoints] of Object.entries(ROUTE_WAYPOINTS)) {
      let hits = 0;
      for (const proj of projections) {
        for (const wp of waypoints) {
          if (haversineNm(proj.lat, proj.lng, wp[0], wp[1]) < 300) hits++;
        }
      }
      if (hits > bestHits) { bestHits = hits; bestRoute = rName; }
    }

    if (bestRoute && bestHits >= 2) {
      reasoning.push(`Heading projection (${currentHeading}°) aligns with ${bestHits} waypoints on route: ${bestRoute}.`);
      if (bestRoute !== routeName) {
        // Heading disagrees with current prediction
        reasoning.push(`Heading disagrees with current prediction (${routeName}). Reviewing...`);
        if (bestHits >= 4 && confidence < 0.75) {
          // Strong heading signal overrides weak prediction
          routeName = bestRoute;
          confidence = Math.min(0.60 + bestHits * 0.03, 0.85);
          rePredictionNeeded = true;
          rePredictionReason = `Strong heading projection (${bestHits} hits) overrides low-confidence prediction`;
          reasoning.push(`Heading signal strong enough to override. New prediction: ${routeName}.`);
        }
      } else {
        confidence = Math.min(confidence + 0.05 * bestHits, 0.92);
        reasoning.push(`Heading confirms current prediction. Confidence boosted to ${(confidence*100).toFixed(0)}%.`);
      }
    }
  }

  // ── SIGNAL 4: Region progression check ───────────────────────────────
  // Is the vessel in a region consistent with the predicted route?
  const routeWaypoints = ROUTE_WAYPOINTS[routeName] || [];
  if (routeWaypoints.length > 0 && currentLat && currentLng) {
    let minDistToRoute = Infinity;
    for (const wp of routeWaypoints) {
      const d = haversineNm(currentLat, currentLng, wp[0], wp[1]);
      if (d < minDistToRoute) minDistToRoute = d;
    }
    if (minDistToRoute > 1500) {
      reasoning.push(`⚠ Vessel is ${Math.round(minDistToRoute)}nm from nearest waypoint on predicted route ${routeName}. This is a significant deviation.`);
      confidence = Math.max(confidence - 0.15, 0.25);
      if (minDistToRoute > 3000) {
        rePredictionNeeded = true;
        rePredictionReason = `Vessel ${Math.round(minDistToRoute)}nm off predicted route — major deviation`;
        reasoning.push(`Major deviation detected. Re-prediction required.`);
      }
    } else {
      reasoning.push(`Vessel is ${Math.round(minDistToRoute)}nm from route waypoints — tracking well.`);
    }
  }

  // ── SIGNAL 5: Load status / draught ──────────────────────────────────
  const vesselClass = vesselInfo?.vesselClass || 'Tanker';
  const { loadStatus, estimatedTonnes, estimatedBarrels } = calculateLoadStatus(currentDraught, vesselClass);
  if (currentDraught) {
    reasoning.push(`Draught: ${currentDraught}m → Load status: ${loadStatus}. Estimated cargo: ${estimatedTonnes?.toLocaleString() || 'N/A'} tonnes / ${estimatedBarrels?.toLocaleString() || 'N/A'} barrels.`);
    if (loadStatus === 'ballast') {
      reasoning.push(`Vessel in ballast — returning to load. This is a repositioning voyage, not a delivery.`);
      confidence = Math.max(confidence * 0.7, 0.30);
    }
  }

  // ── SIGNAL 6: Speed check ─────────────────────────────────────────────
  if (currentSpeed < 2 && hoursElapsed > 24) {
    reasoning.push(`⚠ Vessel stationary (${currentSpeed} kts) for extended period. Possible port arrival, anchorage, or ship-to-ship transfer.`);
    tradeClassification = currentRegion.includes('Ocean') ? 'SHIP_TO_SHIP' : tradeClassification;
  }

  // ── SIGNAL 7: Geopolitical context ───────────────────────────────────
  // Hormuz closure March 2026
  if (voyage.departure_region === 'Persian Gulf' && new Date(voyage.departure_timestamp) > new Date('2026-02-28')) {
    reasoning.push(`⚠ GEOPOLITICAL: Departure from Persian Gulf after Hormuz closure (Feb 28, 2026). If this vessel transited Hormuz it did so during active US-Israeli-Iranian conflict. May be Iranian vessel or bypass route used.`);
    if (tradeClassification === 'NORMAL_TRADE') tradeClassification = 'HORMUZ_DIVERSION';
  }

  // ── Cargo grade estimation ────────────────────────────────────────────
  const gradeInfo = PORT_TO_GRADE[voyage.departure_region] || PORT_TO_GRADE['Persian Gulf'];
  const destInfo = DEST_TO_BUYER[ROUTE_DEST[routeName]] || null;
  const brentPrice = 75; // Approximate Brent price — TODO: fetch from OilPriceAPI
  const cargoValue = estimateCargoValue(estimatedBarrels, gradeInfo, brentPrice);

  if (gradeInfo) {
    reasoning.push(`Cargo estimate: ${gradeInfo.grade} (API ${gradeInfo.apiGravity}°, sulfur ${gradeInfo.sulfur}%). ${gradeInfo.sanctioned ? '⚠ SANCTIONED CRUDE' : 'Compliant crude.'}`);
    if (cargoValue) reasoning.push(`Estimated cargo value: ~$${(cargoValue/1000000).toFixed(1)}M USD at current Brent pricing.`);
  }

  if (destInfo) {
    reasoning.push(`Likely buyer: ${destInfo.buyer}. Refinery type: ${destInfo.refineryType}.`);
  }

  // ── Final prediction ──────────────────────────────────────────────────
  const predDest = ROUTE_DEST[routeName] || 'Unknown';
  const etaDays = ROUTE_DAYS[routeName] || 14;
  const etaDate = new Date(Date.now() + etaDays * 86400000).toISOString();

  return {
    routeName,
    predictedDestination: predDest,
    confidence: Math.min(Math.max(confidence, 0.20), 0.97),
    reasoning: reasoning.join(' '),
    cargoGrade: gradeInfo?.grade || 'Unknown',
    cargoTonnes: estimatedTonnes,
    cargoBarrels: estimatedBarrels,
    cargoValueUsd: cargoValue,
    likelySeller: voyage.departure_region ? `${voyage.departure_region} producer` : 'Unknown',
    likelyBuyer: destInfo?.buyer || 'Unknown',
    tradeClassification,
    rePredictionNeeded,
    rePredictionReason,
    etaDate,
    currentRegion,
    hoursElapsed,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════

(async () => {
  console.log('🔍 UFS Voyage Monitor v1.0 starting...');
  console.log(`Time: ${new Date().toUTCString()}\n`);

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  // ── Step 1: Fetch all active voyages ─────────────────────────────────
  console.log('Fetching active voyages...');
  const vRes = await fetch(`${SUPABASE_URL}/rest/v1/voyages?status=eq.active&select=*`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  const voyages = vRes.ok ? await vRes.json() : [];
  console.log(`Found ${voyages.length} active voyages\n`);

  if (voyages.length === 0) {
    console.log('No active voyages to monitor. Exiting.');
    process.exit(0);
  }

  let processed = 0;
  let rePredictions = 0;
  let errors = 0;

  for (const voyage of voyages) {
    try {
      // ── Step 2: Fetch position history (last 8 snapshots = 48hrs) ────
      const hRes = await fetch(
        `${SUPABASE_URL}/rest/v1/vessel_history?mmsi=eq.${voyage.mmsi}&order=recorded_at.desc&limit=8&select=*`,
        { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      const history = hRes.ok ? await hRes.json() : [];

      // ── Step 3: Look up vessel intelligence ──────────────────────────
      const vesselInfo = getVesselIntelligence(voyage.mmsi, voyage.vessel_name);

      // ── Step 4: Run reasoning engine ─────────────────────────────────
      const assessment = reasonAboutVoyage(voyage, history, vesselInfo);

      // ── Step 5: Save to voyage_intelligence ──────────────────────────
      const intelligenceRecord = {
        voyage_id: voyage.id,
        mmsi: voyage.mmsi,
        vessel_name: voyage.vessel_name,
        hours_into_voyage: assessment.hoursElapsed,
        system_prediction: assessment.predictedDestination,
        system_confidence: assessment.confidence,
        system_route: assessment.routeName,
        vessel_class_confirmed: vesselInfo?.vesselClass || voyage.vessel_class,
        vessel_operator: vesselInfo?.operator || null,
        vessel_known: vesselInfo?.known || false,
        cargo_grade_estimated: assessment.cargoGrade,
        cargo_tonnes_estimated: assessment.cargoTonnes,
        cargo_barrels_estimated: assessment.cargoBarrels,
        cargo_value_usd_estimated: assessment.cargoValueUsd,
        likely_seller: assessment.likelySeller,
        likely_buyer: assessment.likelyBuyer,
        trade_classification: assessment.tradeClassification,
        reasoning: assessment.reasoning,
        chokepoints_at_check: voyage.chokepoints_passed || [],
        heading_at_check: history[0]?.heading || null,
        speed_at_check: history[0]?.speed || null,
        reprediction_triggered: assessment.rePredictionNeeded,
        reprediction_reason: assessment.rePredictionReason,
        previous_prediction: voyage.predicted_route,
        data_snapshot: {
          historyCount: history.length,
          currentRegion: assessment.currentRegion,
          vesselMatch: vesselInfo?.matchType || 'none',
        },
      };

      const iRes = await fetch(`${SUPABASE_URL}/rest/v1/voyage_intelligence`, {
        method: 'POST',
        headers,
        body: JSON.stringify(intelligenceRecord),
      });

      if (!iRes.ok) {
        const err = await iRes.text();
        console.error(`  Error saving intelligence for ${voyage.vessel_name}: ${err}`);
        errors++;
        continue;
      }

      // ── Step 6: Update voyage record with latest prediction ───────────
      if (assessment.rePredictionNeeded || assessment.confidence !== voyage.confidence_at_departure) {
        const voyageUpdate = {
          predicted_route: assessment.routeName,
          predicted_destination: assessment.predictedDestination,
          predicted_eta: assessment.etaDate,
        };
        await fetch(`${SUPABASE_URL}/rest/v1/voyages?id=eq.${voyage.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(voyageUpdate),
        });

        if (assessment.rePredictionNeeded) {
          rePredictions++;
          console.log(`  ⚡ RE-PREDICTION: ${voyage.vessel_name} | ${voyage.predicted_route} → ${assessment.routeName} | Reason: ${assessment.rePredictionReason}`);
        }
      }

      processed++;
      if (processed % 10 === 0) console.log(`  Processed ${processed}/${voyages.length} voyages...`);

    } catch (e) {
      console.error(`  Error processing voyage ${voyage.id} (${voyage.vessel_name}): ${e.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Voyage Monitor complete.`);
  console.log(`  Voyages processed: ${processed}/${voyages.length}`);
  console.log(`  Re-predictions triggered: ${rePredictions}`);
  console.log(`  Errors: ${errors}`);
})();
