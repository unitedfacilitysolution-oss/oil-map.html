// ══════════════════════════════════════════════════════════════════
// UFS DRAUGHT COLLECTOR v1.0
// United Facility Solution — Market Intelligence Platform
//
// Runs every 24 hours via GitHub Actions
// Purpose: Collect draught (cargo weight) data for all active vessels
//
// What this does:
// 1. Fetches all 100 active vessels from Supabase
// 2. Checks which vessels are near known crude oil ports (within 50nm)
// 3. Connects to AISstream filtered to ONLY those vessel MMSIs
// 4. Waits up to 6 minutes for static data broadcasts
// 5. Detects cargo events (loaded / unloaded) by comparing to last known draught
// 6. Updates vessel profiles with new draught and load status
// 7. Opens or closes voyage records based on cargo events
// 8. Records everything for the learning system
// ══════════════════════════════════════════════════════════════════

const WebSocket = require('ws');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const AISSTREAM_KEY = process.env.AISSTREAM_KEY;

const PORT_RADIUS_NM = 50;
const STATIC_WAIT_MS = 360000; // 6 minutes max wait for static data
const DRAUGHT_CHANGE_THRESHOLD = 1.5; // metres — meaningful cargo event

// ══════════════════════════════════════════════════════════════════
// KNOWN CRUDE OIL PORTS
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
// VESSEL CLASS DATA FOR CARGO CALCULATION
// ══════════════════════════════════════════════════════════════════
const VESSEL_CLASS_DATA = {
  'VLCC':    { maxDraught: 22.0, maxCargo: 300000, minDraught: 8.0  },
  'Suezmax': { maxDraught: 17.0, maxCargo: 150000, minDraught: 6.0  },
  'Aframax': { maxDraught: 14.5, maxCargo: 100000, minDraught: 5.5  },
  'Tanker':  { maxDraught: 14.0, maxCargo: 80000,  minDraught: 5.0  },
};

// ══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════

function haversineNm(lat1, lng1, lat2, lng2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function matchPort(lat, lng) {
  let nearest = null;
  let minDist = PORT_RADIUS_NM;
  for (const port of KNOWN_PORTS) {
    const dist = haversineNm(lat, lng, port.lat, port.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...port, distNm: Math.round(dist) };
    }
  }
  return nearest;
}

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

function detectCargoEvent(newDraught, lastDraught) {
  if (!newDraught || !lastDraught) return null;
  const diff = newDraught - lastDraught;
  if (diff >= DRAUGHT_CHANGE_THRESHOLD)  return 'loaded';    // Draught went up = cargo loaded
  if (diff <= -DRAUGHT_CHANGE_THRESHOLD) return 'unloaded';  // Draught went down = cargo delivered
  return null; // No significant change
}

// ══════════════════════════════════════════════════════════════════
// STEP 1 — FETCH ACTIVE VESSELS AND PROFILES FROM SUPABASE
// ══════════════════════════════════════════════════════════════════
async function fetchVesselsAndProfiles(headers) {
  console.log('Fetching vessels from Supabase...');
  const vRes = await fetch(`${SUPABASE_URL}/rest/v1/vessels?select=*`, { headers });
  const vessels = vRes.ok ? await vRes.json() : [];
  console.log(`  Found ${vessels.length} vessels`);

  console.log('Fetching vessel profiles...');
  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles?select=*`, { headers });
  const profiles = pRes.ok ? await pRes.json() : [];

  // Map profiles by mmsi for quick lookup
  const profileMap = {};
  for (const p of profiles) profileMap[p.mmsi] = p;

  return { vessels, profileMap };
}

// ══════════════════════════════════════════════════════════════════
// STEP 2 — IDENTIFY VESSELS NEAR PORTS
// ══════════════════════════════════════════════════════════════════
function findVesselsNearPorts(vessels) {
  const nearPort = [];
  const midOcean = [];

  for (const vessel of vessels) {
    if (!vessel.lat || !vessel.lng) continue;
    const port = matchPort(vessel.lat, vessel.lng);
    if (port) {
      nearPort.push({ vessel, port });
      console.log(`  Near port: ${vessel.name} → ${port.name} (${port.distNm}nm)`);
    } else {
      midOcean.push(vessel);
    }
  }

  console.log(`\n  ${nearPort.length} vessels near ports`);
  console.log(`  ${midOcean.length} vessels mid-ocean (skipping draught)\n`);
  return { nearPort, midOcean };
}

// ══════════════════════════════════════════════════════════════════
// STEP 3 — COLLECT STATIC DATA FROM AISSTREAM
// Filtered to ONLY our port vessels' MMSIs
// Waits up to 6 minutes for all static broadcasts
// ══════════════════════════════════════════════════════════════════
async function collectDraughtData(targetMMSIs) {
  if (targetMMSIs.length === 0) {
    console.log('No vessels near ports — skipping AISstream connection');
    return {};
  }

  console.log(`Connecting to AISstream for ${targetMMSIs.length} vessel MMSIs...`);
  console.log(`Waiting up to ${STATIC_WAIT_MS / 60000} minutes for static data broadcasts...\n`);

  return new Promise((resolve) => {
    const collected = {};
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      try { ws.terminate(); } catch (_) {}
      console.log(`\nStatic data collection complete — got draught for ${Object.keys(collected).length}/${targetMMSIs.length} vessels`);
      resolve(collected);
    };

    const timer = setTimeout(() => {
      console.log('\nTimeout reached — finishing with what we have');
      finish();
    }, STATIC_WAIT_MS);

    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

    ws.on('open', () => {
      console.log('✅ Connected to AISstream');
      ws.send(JSON.stringify({
        APIKey: AISSTREAM_KEY,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ['ShipStaticData'],
        MMSIs: targetMMSIs, // Only listen for our specific vessels
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const meta = msg.MetaData || {};
        const mmsi = String(meta.MMSI || '');

        if (!mmsi || !targetMMSIs.includes(mmsi)) return;
        if (msg.MessageType !== 'ShipStaticData') return;

        const sd = msg.Message?.ShipStaticData || {};
        const draught = sd.MaximumStaticDraught ? parseFloat(sd.MaximumStaticDraught) : null;

        if (draught && draught > 0) {
          collected[mmsi] = {
            draught,
            name: (sd.Name || '').trim(),
            destination: (sd.Destination || '').trim(),
          };
          console.log(`  ✓ ${collected[mmsi].name || mmsi} | draught: ${draught}m | destination: ${collected[mmsi].destination || 'not declared'}`);

          // Finish early if we have all vessels
          if (Object.keys(collected).length >= targetMMSIs.length) {
            console.log('\n  Got draught for all target vessels — finishing early');
            clearTimeout(timer);
            finish();
          }
        }
      } catch (_) {}
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      clearTimeout(timer);
      finish();
    });

    ws.on('close', () => {
      clearTimeout(timer);
      finish();
    });
  });
}

// ══════════════════════════════════════════════════════════════════
// STEP 4 — PROCESS DRAUGHT READINGS AND DETECT CARGO EVENTS
// ══════════════════════════════════════════════════════════════════
function processDraughtReadings(nearPortVessels, draughtData, profileMap) {
  const updates = [];

  for (const { vessel, port } of nearPortVessels) {
    const mmsi = vessel.mmsi;
    const profile = profileMap[mmsi] || {};
    const newData = draughtData[mmsi];
    const lastDraught = profile.last_draught || null;
    const lastLoadStatus = profile.last_load_status || 'unknown';

    if (!newData) {
      console.log(`  No static data received for ${vessel.name} — skipping`);
      continue;
    }

    const newDraught = newData.draught;
    const { loadStatus, estimatedCargo } = calculateLoadStatus(newDraught, vessel.vessel_class);
    const cargoEvent = detectCargoEvent(newDraught, lastDraught);

    console.log(`\n  Processing: ${vessel.name}`);
    console.log(`    Port: ${port.name}`);
    console.log(`    Last draught: ${lastDraught || 'unknown'}m → New draught: ${newDraught}m`);
    console.log(`    Load status: ${lastLoadStatus} → ${loadStatus}`);
    console.log(`    Estimated cargo: ${estimatedCargo || 'N/A'} tonnes`);
    if (cargoEvent) console.log(`    ⚡ CARGO EVENT DETECTED: ${cargoEvent.toUpperCase()}`);

    updates.push({
      mmsi,
      vesselName: vessel.name,
      vesselClass: vessel.vessel_class,
      port,
      newDraught,
      lastDraught,
      loadStatus,
      lastLoadStatus,
      estimatedCargo,
      cargoEvent,
      destination: newData.destination,
      timestamp: new Date().toISOString(),
    });
  }

  return updates;
}

// ══════════════════════════════════════════════════════════════════
// STEP 5 — SAVE ALL UPDATES TO SUPABASE
// ══════════════════════════════════════════════════════════════════
async function saveUpdates(updates, headers) {
  if (updates.length === 0) {
    console.log('\nNo updates to save');
    return;
  }

  console.log(`\nSaving ${updates.length} draught updates to Supabase...`);

  for (const u of updates) {
    // ── Update vessel profile with new draught ──
    const profileUpdate = {
      last_draught: u.newDraught,
      last_load_status: u.loadStatus,
      updated_at: u.timestamp,
    };

    const prRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles?mmsi=eq.${u.mmsi}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(profileUpdate),
    });
    console.log(`  Profile update ${u.vesselName}: HTTP ${prRes.status}`);

    // ── Update vessels table with new draught ──
    const vesselUpdate = {
      draught: u.newDraught,
      load_status: u.loadStatus,
      estimated_cargo_tonnes: u.estimatedCargo,
    };

    const vRes = await fetch(`${SUPABASE_URL}/rest/v1/vessels?mmsi=eq.${u.mmsi}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(vesselUpdate),
    });
    console.log(`  Vessel update ${u.vesselName}: HTTP ${vRes.status}`);

    // ── Insert draught snapshot into vessel_history ──
    const historyRow = {
      mmsi: u.mmsi,
      lat: null, // Position already recorded by main collector
      lng: null,
      heading: null,
      speed: null,
      draught: u.newDraught,
      load_status: u.loadStatus,
      recorded_at: u.timestamp,
    };

    const hRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_history`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify(historyRow),
    });
    console.log(`  History insert ${u.vesselName}: HTTP ${hRes.status}`);

    // ── Handle cargo events — open or close voyages ──
    if (u.cargoEvent === 'loaded') {
      // New voyage starting — vessel just loaded at this port
      console.log(`  🚢 Opening new voyage for ${u.vesselName} from ${u.port.name}`);
      const voyageRow = {
        mmsi: u.mmsi,
        vessel_name: u.vesselName,
        vessel_class: u.vesselClass,
        departure_timestamp: u.timestamp,
        departure_port: u.port.name,
        departure_region: u.port.region,
        departure_draught: u.newDraught,
        departure_load_status: u.loadStatus,
        estimated_cargo_tonnes: u.estimatedCargo,
        declared_destination: u.destination || null,
        status: 'active',
      };

      // First close any existing active voyage for this vessel
      await fetch(`${SUPABASE_URL}/rest/v1/voyages?mmsi=eq.${u.mmsi}&status=eq.active`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'abandoned', arrival_port: u.port.name }),
      });

      const nvRes = await fetch(`${SUPABASE_URL}/rest/v1/voyages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(voyageRow),
      });
      console.log(`  New voyage opened: HTTP ${nvRes.status}`);
    }

    if (u.cargoEvent === 'unloaded') {
      // Voyage ending — vessel just unloaded at this port
      console.log(`  🏁 Closing voyage for ${u.vesselName} at ${u.port.name}`);

      // Fetch the active voyage to check prediction
      const avRes = await fetch(`${SUPABASE_URL}/rest/v1/voyages?mmsi=eq.${u.mmsi}&status=eq.active&select=*`, { headers });
      const activeVoyages = avRes.ok ? await avRes.json() : [];
      const activeVoyage = activeVoyages[0] || null;

      let predictionCorrect = null;
      if (activeVoyage && activeVoyage.predicted_destination) {
        // Check if predicted destination matches actual arrival port or region
        const pred = activeVoyage.predicted_destination.toLowerCase();
        const actualPort = u.port.name.toLowerCase();
        const actualRegion = u.port.region.toLowerCase();
        predictionCorrect = actualPort.includes(pred) ||
                           pred.includes(actualPort) ||
                           actualRegion.includes(pred) ||
                           pred.includes(actualRegion);
        console.log(`  Prediction was: ${activeVoyage.predicted_destination} | Actual: ${u.port.name} | Correct: ${predictionCorrect}`);
      }

      const voyageClose = {
        status: 'completed',
        arrival_timestamp: u.timestamp,
        arrival_port: u.port.name,
        arrival_region: u.port.region,
        arrival_draught: u.newDraught,
        total_voyage_days: activeVoyage?.departure_timestamp
          ? (Date.now() - new Date(activeVoyage.departure_timestamp).getTime()) / 86400000
          : null,
        prediction_correct: predictionCorrect,
      };

      const cvRes = await fetch(`${SUPABASE_URL}/rest/v1/voyages?mmsi=eq.${u.mmsi}&status=eq.active`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(voyageClose),
      });
      console.log(`  Voyage closed: HTTP ${cvRes.status}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
(async () => {
  console.log('⚓ UFS Draught Collector v1.0 starting...');
  console.log(`Time: ${new Date().toUTCString()}\n`);

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  // Step 1 — Fetch vessels and profiles
  const { vessels, profileMap } = await fetchVesselsAndProfiles(headers);
  if (vessels.length === 0) {
    console.log('No vessels found in database. Exiting.');
    process.exit(0);
  }

  // Step 2 — Find vessels near ports
  console.log('\nChecking vessel positions against known ports...');
  const { nearPort, midOcean } = findVesselsNearPorts(vessels);

  if (nearPort.length === 0) {
    console.log('No vessels near ports right now — nothing to collect. Exiting.');
    process.exit(0);
  }

  // Step 3 — Collect draught from AISstream
  const targetMMSIs = nearPort.map(({ vessel }) => vessel.mmsi);
  const draughtData = await collectDraughtData(targetMMSIs);

  // Step 4 — Process readings and detect cargo events
  console.log('\nProcessing draught readings...');
  const updates = processDraughtReadings(nearPort, draughtData, profileMap);

  // Step 5 — Save to Supabase
  await saveUpdates(updates, headers);

  console.log('\n✅ Draught collection complete.');
  console.log(`  Vessels near ports: ${nearPort.length}`);
  console.log(`  Draught readings collected: ${Object.keys(draughtData).length}`);
  console.log(`  Updates saved: ${updates.length}`);
})();
