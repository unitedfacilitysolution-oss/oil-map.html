// UFS Vessel Collector — vessel-collector.js
// Runs via GitHub Actions every 6 hours
// Collects 100 crude tankers from AISstream, saves to Supabase

const WebSocket = require('ws');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const AISSTREAM_KEY = process.env.AISSTREAM_KEY;

const TARGET = 100;
const COLLECT_MS = 55000;

// ── REGION DETECTION ────────────────────────────────────
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

// ── ROUTE PREDICTION ────────────────────────────────────
const REGION_TO_ROUTE = {
  "Persian Gulf":           "Persian Gulf → China via Malacca",
  "Red Sea":                "Persian Gulf → Europe via Suez",
  "Gulf of Aden":           "Persian Gulf → Europe via Suez",
  "Arabian Sea":            "Persian Gulf → India",
  "Indian Ocean":           "Persian Gulf → China via Malacca",
  "Strait of Malacca":      "Persian Gulf → China via Malacca",
  "South China Sea":        "Persian Gulf → China via Malacca",
  "Japan/Korea Waters":     "Persian Gulf → Japan/Korea via Malacca",
  "West Africa":            "West Africa → Europe via Atlantic",
  "European Atlantic":      "West Africa → Europe via Atlantic",
  "Mediterranean":          "Libya/Algeria → Europe via Mediterranean",
  "Black Sea":              "Black Sea → Mediterranean via Bosphorus",
  "Baltic Sea":             "Russia Baltic → Europe via Oresund",
  "Cape of Good Hope":      "West Africa → China via Cape",
  "Gulf of Mexico":         "USA Gulf → Europe via Atlantic",
  "US East Coast":          "USA Gulf → Europe via Atlantic",
  "US West Coast":          "Asia → USA West Coast via Pacific",
  "South America Atlantic": "Brazil → Europe via Atlantic",
  "Open Ocean":             "West Africa → Europe via Atlantic",
};

const ROUTE_META = {
  "Persian Gulf → China via Malacca":            { destName: "China",               avgDays: 18 },
  "Persian Gulf → Japan/Korea via Malacca":      { destName: "Japan/Korea",         avgDays: 20 },
  "Persian Gulf → India":                        { destName: "India",               avgDays: 7  },
  "Persian Gulf → Europe via Suez":              { destName: "Rotterdam",           avgDays: 16 },
  "Persian Gulf → Europe via Cape":              { destName: "Rotterdam (Cape)",    avgDays: 31 },
  "Persian Gulf → USA via Cape":                 { destName: "US Gulf Coast",       avgDays: 38 },
  "Persian Gulf → Singapore":                    { destName: "Singapore",           avgDays: 12 },
  "West Africa → China via Cape":                { destName: "China",               avgDays: 28 },
  "West Africa → Europe via Atlantic":           { destName: "Rotterdam",           avgDays: 14 },
  "West Africa → USA East Coast":                { destName: "New York",            avgDays: 16 },
  "West Africa → India via Cape":                { destName: "Mumbai",              avgDays: 20 },
  "Black Sea → Mediterranean via Bosphorus":     { destName: "Rotterdam",           avgDays: 12 },
  "Russia Baltic → Europe via Oresund":          { destName: "Rotterdam",           avgDays: 5  },
  "Russia ESPO → China/Japan":                   { destName: "Korea/Japan",         avgDays: 4  },
  "USA Gulf → Europe via Atlantic":              { destName: "Rotterdam",           avgDays: 14 },
  "USA Gulf → Asia via Panama":                  { destName: "Japan",               avgDays: 26 },
  "Brazil → China via Cape":                     { destName: "China",               avgDays: 32 },
  "Brazil → Europe via Atlantic":                { destName: "Rotterdam",           avgDays: 18 },
  "Libya/Algeria → Europe via Mediterranean":    { destName: "Rotterdam",           avgDays: 8  },
  "Caspian → Mediterranean via Ceyhan":          { destName: "Europe",              avgDays: 10 },
  "Middle East → Europe via Cape (Suez bypass)": { destName: "Rotterdam (Houthi)",  avgDays: 31 },
  "Asia → USA West Coast via Pacific":           { destName: "Los Angeles",         avgDays: 14 },
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

function predictRoute(lat, lng, destination, region) {
  let routeName = REGION_TO_ROUTE[region] || "Persian Gulf → China via Malacca";
  let confidence = 0.55;
  const destUpper = (destination || "").toUpperCase().trim();
  if (destUpper.length > 2) {
    for (const [rName, keywords] of Object.entries(DEST_KEYWORDS)) {
      if (keywords.some(kw => destUpper.includes(kw))) {
        routeName = rName;
        confidence = 0.82;
        break;
      }
    }
  }
  if (["Black Sea","Baltic Sea"].includes(region)) confidence = Math.max(confidence, 0.88);
  if (region === "Persian Gulf")      confidence = Math.max(confidence, 0.78);
  if (region === "Strait of Malacca") confidence = Math.max(confidence, 0.72);
  if (region === "Red Sea")           confidence = Math.max(confidence, 0.70);
  const meta = ROUTE_META[routeName] || { destName: "Unknown", avgDays: 14 };
  return {
    routeName,
    confidence: Math.min(confidence, 0.95),
    predictedDest: meta.destName,
    etaDays: meta.avgDays,
  };
}

// ── COLLECT FROM AISSTREAM ───────────────────────────────
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

// ── SAVE TO SUPABASE ────────────────────────────────────
async function saveToSupabase(vessels) {
  const headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
  };

  // ── 1. DELETE all existing vessels then INSERT fresh ──
  console.log("Clearing old vessel data...");
  const delV = await fetch(`${SUPABASE_URL}/rest/v1/vessels?id=gte.0`, {
    method: "DELETE",
    headers,
  });
  console.log(`Vessels delete: HTTP ${delV.status}`);

  const delP = await fetch(`${SUPABASE_URL}/rest/v1/predictions?id=gte.0`, {
    method: "DELETE",
    headers,
  });
  console.log(`Predictions delete: HTTP ${delP.status}`);

  const delPr = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles?id=gte.0`, {
    method: "DELETE",
    headers,
  });
  console.log(`Profiles delete: HTTP ${delPr.status}`);

  // ── 2. INSERT fresh vessels ───────────────────────────
  const vesselRows = vessels.map(v => ({
    mmsi: v.mmsi,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    heading: v.heading,
    speed: v.speed,
    destination: v.destination,
    vessel_class: v.vessel_class,
    last_updated: v.last_updated,
  }));

  const vRes = await fetch(`${SUPABASE_URL}/rest/v1/vessels`, {
    method: "POST",
    headers,
    body: JSON.stringify(vesselRows),
  });
  console.log(`Vessels insert: HTTP ${vRes.status}`);
  if (!vRes.ok) console.error(await vRes.text());

  // ── 3. INSERT vessel history (accumulates over time) ──
  const historyRows = vessels.map(v => ({
    mmsi: v.mmsi,
    lat: v.lat,
    lng: v.lng,
    heading: v.heading,
    speed: v.speed,
    recorded_at: v.last_updated,
  }));

  const hRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_history`, {
    method: "POST",
    headers,
    body: JSON.stringify(historyRows),
  });
  console.log(`History insert: HTTP ${hRes.status}`);

  // ── 4. INSERT fresh predictions ───────────────────────
  const predRows = vessels.map(v => {
    const region = detectRegion(v.lat, v.lng);
    const pred = predictRoute(v.lat, v.lng, v.destination, region);
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
    method: "POST",
    headers,
    body: JSON.stringify(predRows),
  });
  console.log(`Predictions insert: HTTP ${pRes.status}`);

  // ── 5. INSERT fresh vessel profiles ───────────────────
  const profileRows = vessels.map(v => {
    const region = detectRegion(v.lat, v.lng);
    const pred = predictRoute(v.lat, v.lng, v.destination, region);
    return {
      mmsi: v.mmsi,
      name: v.name,
      vessel_class: v.vessel_class,
      last_seen_region: region,
      typical_routes: [pred.routeName],
      can_use_suez: true,
      voyage_count: 1,
      updated_at: v.last_updated,
    };
  });

  const prRes = await fetch(`${SUPABASE_URL}/rest/v1/vessel_profiles`, {
    method: "POST",
    headers,
    body: JSON.stringify(profileRows),
  });
  console.log(`Profiles insert: HTTP ${prRes.status}`);
}

// ── MAIN ────────────────────────────────────────────────
(async () => {
  console.log("🛢️ UFS Vessel Tracker starting...");
  console.log(`Target: ${TARGET} vessels | Timeout: ${COLLECT_MS / 1000}s`);

  const vessels = await collectVessels();

  if (vessels.length === 0) {
    console.error("❌ No vessels collected. Check AISstream API key.");
    process.exit(1);
  }

  console.log(`\n✅ Collected ${vessels.length} vessels. Saving to Supabase...`);
  await saveToSupabase(vessels);
  console.log(`\n🎉 Done — ${vessels.length} vessels saved to Supabase.`);
})();
