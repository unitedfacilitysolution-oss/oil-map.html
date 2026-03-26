// ══════════════════════════════════════════════════════════════════════════
// UFS MARKET INTELLIGENCE — CRUDE OIL KNOWLEDGE BASE
// Version 1.0 — March 2026
// United Facility Solution
//
// This is the complete knowledge base for the UFS AI reasoning engine.
// It contains everything the AI needs to understand crude oil trade:
// - Vessel classes, draught specifications, cargo capacities
// - Crude oil grades by region with API gravity and sulfur content
// - Global producers and their production volumes
// - Major trading companies and their market roles
// - All 25 maritime routes with waypoints and trade flow data
// - Chokepoints with current volumes and geopolitical context
// - Sanctions regimes and shadow fleet intelligence
// - Refinery locations and crude grade preferences
// - Historical trade flow patterns and buyer/seller relationships
// - Seasonal patterns in crude trade
// - Route classification logic
// ══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════
// SECTION 1: VESSEL CLASSES
// Physical specifications used to identify and classify tankers
// ══════════════════════════════════════════════════════════════════════════

const VESSEL_CLASSES = {

  VLCC: {
    name: "Very Large Crude Carrier",
    dwtRange: [200000, 320000],
    cargoBarrels: [1900000, 2200000],
    cargoTonnes: [250000, 300000],
    draughtLoaded: [20.0, 22.5],
    draughtBallast: [8.0, 10.0],
    lengthMetres: [330, 380],
    beamMetres: [58, 68],
    speedKnots: [14, 17],
    crewSize: [25, 35],
    typicalRoutes: [
      "Persian Gulf → China via Malacca",
      "Persian Gulf → Japan/Korea via Malacca",
      "Persian Gulf → Europe via Cape",
      "West Africa → China via Cape",
      "Persian Gulf → USA via Cape",
    ],
    // VLCCs cannot transit Suez Canal fully loaded
    // Minimum port depth required: 22+ metres
    // Dominate Middle East to Asia crude trade
    canTransitSuez: false,
    canTransitPanama: false,
    canTransitMalacca: true, // Malaccamax design
    notes: "Dominates long-haul crude trade. Saudi, Iraqi, UAE exports to Asia are almost exclusively VLCC. When a vessel departing Persian Gulf is heading east, assume VLCC."
  },

  Suezmax: {
    name: "Suezmax Tanker",
    dwtRange: [120000, 200000],
    cargoBarrels: [800000, 1100000],
    cargoTonnes: [120000, 170000],
    draughtLoaded: [15.5, 20.1], // 20.1m is Suez Canal max draft
    draughtBallast: [6.0, 8.5],
    lengthMetres: [245, 285],
    beamMetres: [42, 50],
    speedKnots: [13, 16],
    crewSize: [25, 30],
    typicalRoutes: [
      "Persian Gulf → Europe via Suez",
      "West Africa → Europe via Atlantic",
      "West Africa → USA East Coast",
      "Black Sea → Mediterranean via Bosphorus",
      "Russia Baltic → Europe via Oresund",
      "West Africa → India via Cape",
    ],
    canTransitSuez: true,   // This is the defining feature
    canTransitPanama: false,
    canTransitMalacca: true,
    notes: "The workhorse of Atlantic Basin crude trade. West Africa to Europe, Black Sea to Med, Russian Baltic exports — all typically Suezmax. Can transit Suez Canal fully loaded, making it ideal for Persian Gulf to Europe."
  },

  Aframax: {
    name: "Aframax Tanker",
    dwtRange: [80000, 120000],
    cargoBarrels: [500000, 800000],
    cargoTonnes: [80000, 120000],
    draughtLoaded: [12.0, 14.5],
    draughtBallast: [5.5, 7.5],
    lengthMetres: [230, 250],
    beamMetres: [32, 44],
    speedKnots: [13, 15],
    crewSize: [20, 28],
    typicalRoutes: [
      "Russia Baltic → Europe via Oresund",
      "Black Sea → Mediterranean via Bosphorus",
      "Caspian → Mediterranean via Ceyhan",
      "Libya/Algeria → Europe via Mediterranean",
      "North Sea → Global via English Channel",
      "Russia ESPO → China/Japan",
      "USA Gulf → Europe via Atlantic",
    ],
    canTransitSuez: true,
    canTransitPanama: true, // Original Panamax size
    canTransitMalacca: true,
    canTransitBosphorus: true,
    notes: "Most flexible tanker class. Can access almost all ports. Dominates regional crude trade: North Sea, Baltic, Black Sea, Mediterranean. Russia's Baltic and Black Sea exports are primarily Aframax."
  },

  Panamax: {
    name: "Panamax Tanker",
    dwtRange: [60000, 80000],
    cargoBarrels: [350000, 500000],
    cargoTonnes: [60000, 80000],
    draughtLoaded: [11.0, 13.0],
    draughtBallast: [5.0, 6.5],
    speedKnots: [13, 15],
    typicalRoutes: [
      "USA Gulf → Asia via Panama",
      "Canada Pacific → Asia",
    ],
    canTransitSuez: true,
    canTransitPanama: true,
    canTransitMalacca: true,
    notes: "Sized to fit Panama Canal locks. Common for US Gulf to Asia crude and product movements."
  },

  Tanker: {
    name: "Medium Range Tanker",
    dwtRange: [25000, 60000],
    cargoBarrels: [150000, 350000],
    cargoTonnes: [25000, 60000],
    draughtLoaded: [8.0, 12.0],
    draughtBallast: [4.0, 6.0],
    speedKnots: [12, 15],
    notes: "General ocean-going tanker. Regional crude and product trades. Can access most ports globally."
  },

  CoastalTanker: {
    name: "Coastal/Inland Tanker",
    dwtRange: [1000, 25000],
    cargoBarrels: [5000, 150000],
    cargoTonnes: [1000, 25000],
    draughtLoaded: [3.0, 8.0],
    draughtBallast: [2.0, 4.5],
    speedKnots: [8, 13],
    notes: "Short-haul coastal and inland waterway tankers. River barges, coastal feeders. Not involved in intercontinental crude trade."
  }
};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 2: CRUDE OIL GRADES BY ORIGIN
// API gravity, sulfur content, typical buyers, and price benchmarks
// ══════════════════════════════════════════════════════════════════════════

const CRUDE_GRADES = {

  // ── MIDDLE EAST ──────────────────────────────────────────────────────
  "Arab Light": {
    origin: "Saudi Arabia",
    api: 33.4,
    sulfur: 1.77,
    classification: "medium sour",
    benchmark: "Arab Light Official Selling Price (OSP)",
    typicalBuyers: ["China", "Japan", "South Korea", "India", "USA"],
    exportPorts: ["Ras Tanura", "Ju'aymah"],
    volumeMbpd: 4.5,
    notes: "Saudi Arabia's flagship export grade. Most traded crude in the world by volume."
  },

  "Arab Medium": {
    origin: "Saudi Arabia",
    api: 29.0,
    sulfur: 2.59,
    classification: "medium sour",
    benchmark: "Arab Medium OSP",
    typicalBuyers: ["China", "India", "South Korea"],
    exportPorts: ["Ras Tanura", "Ju'aymah"],
    volumeMbpd: 2.0,
  },

  "Arab Heavy": {
    origin: "Saudi Arabia",
    api: 27.4,
    sulfur: 2.80,
    classification: "heavy sour",
    benchmark: "Arab Heavy OSP",
    typicalBuyers: ["China", "India"],
    exportPorts: ["Ras Tanura"],
    volumeMbpd: 1.5,
    notes: "Requires complex refineries with coking/hydrocracking capability."
  },

  "Murban": {
    origin: "UAE (ADNOC)",
    api: 40.5,
    sulfur: 0.79,
    classification: "light sweet",
    benchmark: "Murban Futures (ICE)",
    typicalBuyers: ["Japan", "South Korea", "China", "India"],
    exportPorts: ["Ruwais", "Fujairah"],
    volumeMbpd: 1.5,
    notes: "ADNOC's flagship light crude. High-value, low sulfur. Premium pricing."
  },

  "Upper Zakum": {
    origin: "UAE (ADNOC)",
    api: 34.0,
    sulfur: 1.82,
    classification: "medium sour",
    typicalBuyers: ["Japan", "South Korea", "China"],
    exportPorts: ["Ruwais"],
    volumeMbpd: 0.75,
  },

  "Basrah Light": {
    origin: "Iraq",
    api: 33.7,
    sulfur: 1.97,
    classification: "medium sour",
    benchmark: "Basrah Light OSP",
    typicalBuyers: ["China", "India", "South Korea", "USA"],
    exportPorts: ["Basra Oil Terminal", "Khor al-Amaya"],
    volumeMbpd: 2.8,
    notes: "Iraq's primary export. Massive volumes via southern terminals."
  },

  "Basrah Medium": {
    origin: "Iraq",
    api: 29.0,
    sulfur: 3.0,
    classification: "heavy sour",
    typicalBuyers: ["China", "India"],
    exportPorts: ["Basra Oil Terminal"],
    volumeMbpd: 0.8,
  },

  "Kuwait Export Blend": {
    origin: "Kuwait",
    api: 31.4,
    sulfur: 2.52,
    classification: "medium sour",
    typicalBuyers: ["Japan", "South Korea", "China", "India"],
    exportPorts: ["Mina Al Ahmadi"],
    volumeMbpd: 1.8,
  },

  "Iran Light": {
    origin: "Iran (NIOC) — SANCTIONED",
    api: 33.8,
    sulfur: 1.35,
    classification: "medium sour",
    typicalBuyers: ["China (primary)", "Syria"],
    exportPorts: ["Kharg Island"],
    volumeMbpd: 1.5,
    sanctioned: true,
    sanctionRegimes: ["USA", "EU", "UK"],
    shadowFleet: true,
    notes: "Heavily sanctioned. Moves primarily to China via shadow fleet. AIS spoofing common. Ship-to-ship transfers in Strait of Malacca and off Oman coast. ~86% of Iranian oil tankers are sanctioned vessels."
  },

  "Iran Heavy": {
    origin: "Iran (NIOC) — SANCTIONED",
    api: 30.9,
    sulfur: 1.73,
    classification: "medium sour",
    typicalBuyers: ["China"],
    exportPorts: ["Kharg Island", "Lavan Island"],
    volumeMbpd: 1.0,
    sanctioned: true,
    shadowFleet: true,
  },

  "Oman Blend": {
    origin: "Oman (PDO)",
    api: 33.0,
    sulfur: 0.99,
    classification: "medium sweet",
    benchmark: "DME Oman Futures",
    typicalBuyers: ["China", "Japan", "India"],
    exportPorts: ["Mina al-Fahal", "Sohar"],
    volumeMbpd: 1.0,
  },

  // ── RUSSIA ────────────────────────────────────────────────────────────
  "Urals": {
    origin: "Russia — SANCTIONED (G7 price cap $60/bbl)",
    api: 31.7,
    sulfur: 1.35,
    classification: "medium sour",
    benchmark: "Urals (discount to Brent)",
    typicalBuyers: ["China", "India", "Turkey"],
    exportPorts: ["Primorsk", "Ust-Luga", "Novorossiysk"],
    volumeMbpd: 3.5,
    sanctioned: true,
    sanctionRegimes: ["EU", "G7", "USA"],
    priceCap: 60, // USD per barrel
    shadowFleet: true,
    notes: "Russia's primary export grade. EU sanctions in 2022 redirected flow from Europe to Asia. Trades at significant discount to Brent. Shadow fleet of ~1,400 vessels transports sanctioned Russian crude. Major destinations: China, India, Turkey."
  },

  "ESPO": {
    origin: "Russia (Eastern Siberia) — SANCTIONED",
    api: 34.8,
    sulfur: 0.62,
    classification: "light sweet",
    benchmark: "ESPO (premium to Urals)",
    typicalBuyers: ["China (dominant)", "Japan", "South Korea"],
    exportPorts: ["Kozmino (Pacific)"],
    volumeMbpd: 1.2,
    sanctioned: true,
    shadowFleet: false, // Often on legitimate vessels to China
    notes: "Eastern Siberia route. Light sweet quality. Short voyage to China/Japan. Often on legitimate vessels unlike Urals."
  },

  "Sokol": {
    origin: "Russia (Sakhalin) — SANCTIONED",
    api: 38.0,
    sulfur: 0.14,
    classification: "light sweet",
    typicalBuyers: ["India", "China"],
    exportPorts: ["De-Kastri"],
    volumeMbpd: 0.1,
    sanctioned: true,
  },

  // ── WEST AFRICA ───────────────────────────────────────────────────────
  "Bonny Light": {
    origin: "Nigeria (NNPC/Shell JV)",
    api: 35.4,
    sulfur: 0.13,
    classification: "light sweet",
    benchmark: "Bonny Light (Brent + premium)",
    typicalBuyers: ["India", "USA", "Europe", "China"],
    exportPorts: ["Bonny Terminal", "Brass Terminal"],
    volumeMbpd: 0.6,
    notes: "Nigeria's flagship export. Very low sulfur makes it premium priced. High-quality refinery feedstock."
  },

  "Qua Iboe": {
    origin: "Nigeria (ExxonMobil)",
    api: 35.8,
    sulfur: 0.06,
    classification: "light sweet",
    typicalBuyers: ["USA", "Europe", "India"],
    exportPorts: ["Qua Iboe Terminal"],
    volumeMbpd: 0.2,
  },

  "Forcados": {
    origin: "Nigeria (Shell)",
    api: 29.7,
    sulfur: 0.17,
    classification: "medium sweet",
    typicalBuyers: ["India", "Europe"],
    exportPorts: ["Forcados Terminal"],
    volumeMbpd: 0.15,
  },

  "Cabinda": {
    origin: "Angola (Chevron/Sonangol)",
    api: 31.7,
    sulfur: 0.17,
    classification: "medium sweet",
    typicalBuyers: ["China", "India", "USA"],
    exportPorts: ["Cabinda", "Malongo"],
    volumeMbpd: 0.3,
  },

  "Girassol": {
    origin: "Angola (TotalEnergies/Sonangol)",
    api: 31.3,
    sulfur: 0.35,
    classification: "medium sweet",
    typicalBuyers: ["China", "India", "USA"],
    exportPorts: ["Luanda", "SBM deepwater"],
    volumeMbpd: 0.25,
    notes: "Angola's main deepwater grade. China is dominant buyer."
  },

  "Es Sider": {
    origin: "Libya (NOC)",
    api: 36.8,
    sulfur: 0.44,
    classification: "light sweet",
    benchmark: "Es Sider (Brent differential)",
    typicalBuyers: ["Italy", "Spain", "Germany", "China"],
    exportPorts: ["Es Sider Terminal"],
    volumeMbpd: 0.35,
    notes: "Libya's largest export terminal. Frequently disrupted by civil conflict. European refiners prefer for low sulfur."
  },

  "Saharan Blend": {
    origin: "Algeria (Sonatrach)",
    api: 44.5,
    sulfur: 0.09,
    classification: "light sweet",
    benchmark: "Saharan Blend (Brent + premium)",
    typicalBuyers: ["Spain", "Italy", "France", "USA"],
    exportPorts: ["Arzew", "Skikda"],
    volumeMbpd: 0.6,
    notes: "Very high API, very low sulfur. Premium quality. Mainly goes to Mediterranean European refineries."
  },

  // ── NORTH SEA / EUROPE ────────────────────────────────────────────────
  "Brent": {
    origin: "UK/Norway North Sea",
    api: 38.3,
    sulfur: 0.37,
    classification: "light sweet",
    benchmark: "Dated Brent (global benchmark — prices ~60% of world oil)",
    typicalBuyers: ["UK", "Northwest Europe", "USA", "Asia"],
    exportPorts: ["Sullom Voe (Shetland)", "various North Sea loading points"],
    volumeMbpd: 0.8,
    notes: "The world's primary oil price benchmark. BFOET blend (Brent, Forties, Oseberg, Ekofisk, Troll). Declining production but retains benchmark status. North Sea loading primarily into Northwest European refineries."
  },

  "Johan Sverdrup": {
    origin: "Norway (Equinor)",
    api: 28.0,
    sulfur: 0.55,
    classification: "medium sour",
    typicalBuyers: ["Europe", "Asia"],
    exportPorts: ["Mongstad", "Sture"],
    volumeMbpd: 0.72,
    notes: "Europe's largest oil field. Norway's dominant export. Medium sour makes it complement to light sweet North Sea grades."
  },

  // ── AMERICAS ──────────────────────────────────────────────────────────
  "WTI": {
    origin: "USA (Permian Basin, Eagle Ford, Bakken)",
    api: 39.6,
    sulfur: 0.24,
    classification: "light sweet",
    benchmark: "West Texas Intermediate (NYMEX) — US benchmark",
    typicalBuyers: ["South Korea", "Japan", "Netherlands", "UK", "China"],
    exportPorts: ["Houston", "Corpus Christi", "Port Arthur"],
    volumeMbpd: 4.5,
    notes: "USA is world's largest crude producer at 13.58 Mbpd (2025). WTI dominates US exports. Major Asian buyers. EU increasingly importing US crude after Russia sanctions."
  },

  "Mars Blend": {
    origin: "USA (Gulf of Mexico)",
    api: 29.3,
    sulfur: 2.00,
    classification: "medium sour",
    typicalBuyers: ["US Gulf refineries"],
    exportPorts: ["Louisiana Offshore Oil Port (LOOP)"],
    volumeMbpd: 0.5,
  },

  "Western Canadian Select (WCS)": {
    origin: "Canada (Alberta oil sands)",
    api: 20.5,
    sulfur: 3.5,
    classification: "heavy sour",
    benchmark: "WCS (heavy discount to WTI)",
    typicalBuyers: ["USA (90%)", "China", "India"],
    exportPorts: ["Vancouver (Trans Mountain)", "Alberta pipeline to US refineries"],
    volumeMbpd: 2.0,
    notes: "Heavily discounted vs WTI due to heavy sour quality. Trans Mountain Pipeline expansion (2024) opened Asian export options. Requires coking refineries."
  },

  "Vasconia": {
    origin: "Colombia (Ecopetrol)",
    api: 24.0,
    sulfur: 0.72,
    classification: "heavy sour",
    typicalBuyers: ["USA", "Europe", "China"],
    exportPorts: ["Covenas"],
    volumeMbpd: 0.6,
  },

  "Merey 16": {
    origin: "Venezuela (PDVSA) — SANCTIONED",
    api: 16.0,
    sulfur: 2.4,
    classification: "heavy sour",
    typicalBuyers: ["China (primary)", "Cuba"],
    exportPorts: ["Jose Terminal", "Puerto La Cruz"],
    volumeMbpd: 0.4,
    sanctioned: true,
    sanctionRegimes: ["USA"],
    shadowFleet: true,
    notes: "Heavily sanctioned. Requires upgrading or blending. China's Teapot refineries primary buyer. US blockade of Venezuelan oil intensified in 2025-2026. Shadow fleet increasingly interdicted."
  },

  "Tupi (Pre-salt)": {
    origin: "Brazil (Petrobras)",
    api: 28.3,
    sulfur: 0.40,
    classification: "medium sweet",
    benchmark: "Tupi (Brent differential)",
    typicalBuyers: ["China (dominant)", "India", "Europe"],
    exportPorts: ["Santos", "Angra dos Reis"],
    volumeMbpd: 1.2,
    notes: "Brazil's deepwater pre-salt production. Growing rapidly. China is largest buyer via Cape route."
  },

  // ── CASPIAN / RUSSIA ALTERNATIVES ────────────────────────────────────
  "Azeri Light (BTC)": {
    origin: "Azerbaijan (SOCAR/BP consortium)",
    api: 35.0,
    sulfur: 0.14,
    classification: "light sweet",
    typicalBuyers: ["Italy", "Israel", "India", "USA"],
    exportPorts: ["Ceyhan (Turkey) — via BTC pipeline"],
    volumeMbpd: 0.75,
    notes: "BTC pipeline from Baku to Ceyhan. Turkey's Ceyhan port is loading point. Travels via Mediterranean to European refineries."
  },

  "CPC Blend (Kazakhstan)": {
    origin: "Kazakhstan (Tengiz, Kashagan)",
    api: 45.0,
    sulfur: 0.57,
    classification: "light sweet",
    typicalBuyers: ["Italy", "Netherlands", "Spain", "China"],
    exportPorts: ["Novorossiysk — via CPC pipeline"],
    volumeMbpd: 1.4,
    notes: "Via CPC pipeline to Novorossiysk. Historically via Black Sea/Bosphorus/Med to Europe. Increasing diversification post-2022."
  },

  // ── ASIA PACIFIC ──────────────────────────────────────────────────────
  "Minas": {
    origin: "Indonesia (Pertamina)",
    api: 34.5,
    sulfur: 0.08,
    classification: "light sweet",
    typicalBuyers: ["Japan", "South Korea", "Australia"],
    exportPorts: ["Dumai"],
    volumeMbpd: 0.1,
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 3: GLOBAL PRODUCERS
// Production volumes, NOCs, and export patterns (2025 data)
// ══════════════════════════════════════════════════════════════════════════

const PRODUCERS = {

  "USA": {
    production_mbpd: 13.58,
    share_pct: 16,
    noc: null, // Private companies dominate
    majorCompanies: ["ExxonMobil", "Chevron", "ConocoPhillips", "Pioneer (ExxonMobil)", "Devon Energy"],
    mainGrades: ["WTI", "Mars Blend", "Louisiana Light"],
    mainExportRegions: ["Asia (South Korea, Japan, Netherlands)", "Europe"],
    keyFields: ["Permian Basin", "Eagle Ford", "Bakken", "Gulf of Mexico"],
    notes: "World's largest producer since 2023. Shale revolution. Net petroleum exporter since 2020."
  },

  "Russia": {
    production_mbpd: 9.87,
    share_pct: 11.7,
    noc: "Rosneft (state-controlled)",
    majorCompanies: ["Rosneft", "Lukoil", "Gazprom Neft", "Surgutneftegas"],
    mainGrades: ["Urals", "ESPO", "Sokol"],
    mainExportRegions: ["China (primary)", "India", "Turkey"],
    sanctioned: true,
    sanctions: "G7, EU, USA price cap $60/bbl",
    shadowFleet: true,
    keyFields: ["West Siberia", "East Siberia", "Arctic", "Sakhalin"],
    notes: "EU sanctions 2022 redirected exports from Europe to Asia. Shadow fleet of ~1,400 vessels. India and China primary buyers at discount. US blockade operations ongoing."
  },

  "Saudi Arabia": {
    production_mbpd: 9.51,
    share_pct: 11.3,
    noc: "Saudi Aramco (state-owned)",
    majorCompanies: ["Saudi Aramco"],
    mainGrades: ["Arab Light", "Arab Medium", "Arab Heavy", "Arab Extra Light"],
    mainExportRegions: ["China", "Japan", "South Korea", "India", "USA"],
    opecMember: true,
    opecLeader: true,
    keyFields: ["Ghawar (world's largest)", "Safaniya (world's largest offshore)", "Shaybah", "Abqaiq"],
    exportPorts: ["Ras Tanura", "Ju'aymah", "Yanbu (via East-West pipeline)"],
    notes: "OPEC leader. Swing producer. Can bypass Hormuz via 5 Mbpd East-West pipeline to Yanbu on Red Sea. 38% of Hormuz crude flows. Primary long-term contracts with Asian NOCs."
  },

  "Canada": {
    production_mbpd: 4.94,
    share_pct: 5.8,
    noc: null,
    majorCompanies: ["Canadian Natural Resources", "Suncor", "Cenovus", "Imperial Oil"],
    mainGrades: ["Western Canadian Select", "Syncrude Sweet Premium"],
    mainExportRegions: ["USA (90%)", "Asia via Trans Mountain (post-2024)"],
    keyFields: ["Athabasca Oil Sands", "Cold Lake", "Hibernia (offshore Newfoundland)"],
    notes: "Mostly oil sands. Trans Mountain expansion 2024 opened Pacific coast exports to Asia."
  },

  "Iraq": {
    production_mbpd: 4.39,
    share_pct: 5.2,
    noc: "Iraq National Oil Company (INOC)",
    majorCompanies: ["INOC", "Basra Oil Company", "Lukoil (West Qurna-2)", "BP (Rumaila)"],
    mainGrades: ["Basrah Light", "Basrah Medium", "Kirkuk"],
    mainExportRegions: ["China", "India", "South Korea", "USA"],
    opecMember: true,
    exportPorts: ["Basra Oil Terminal", "Khor al-Amaya"],
    keyFields: ["Rumaila (world's 2nd largest)", "West Qurna", "Majnoon", "Halfaya"],
    notes: "Frequently exceeds OPEC quota. Chronic overproducer in OPEC compliance context."
  },

  "China": {
    production_mbpd: 4.34,
    share_pct: 5.1,
    noc: "CNPC/PetroChina, Sinopec, CNOOC",
    mainGrades: ["Daqing (light sweet)", "Shengli (medium sour)"],
    mainExportRegions: null, // Net importer
    netImporter: true,
    importsMbpd: 11.0,
    mainImportSources: ["Russia (largest)", "Saudi Arabia", "Iraq", "UAE", "Oman", "Kuwait", "Iran (shadow)", "Brazil", "Angola"],
    notes: "World's largest crude importer at ~11 Mbpd. Buys discounted sanctioned crude (Russia, Iran, Venezuela). Strategic petroleum reserve significant. Teapot refineries buy sanction-evading cargoes."
  },

  "UAE": {
    production_mbpd: 3.82,
    share_pct: 4.5,
    noc: "ADNOC",
    mainGrades: ["Murban", "Upper Zakum", "Das Blend"],
    mainExportRegions: ["Japan", "South Korea", "China", "India"],
    opecMember: true,
    exportPorts: ["Ruwais", "Fujairah (offshore bypass Hormuz)"],
    notes: "ADCOP pipeline bypasses Hormuz to Fujairah. Can export ~1 Mbpd without transiting Hormuz."
  },

  "Iran": {
    production_mbpd: 4.19,
    share_pct: 5.0,
    noc: "NIOC",
    mainGrades: ["Iran Light", "Iran Heavy", "Foroozan"],
    mainExportRegions: ["China (90%)", "Syria"],
    sanctioned: true,
    opecMember: true,
    shadowFleet: true,
    exportPorts: ["Kharg Island (90% of exports)", "Lavan Island", "Sirri Island"],
    notes: "Heavily sanctioned by USA, EU, UK. Shadow fleet primary export mechanism. AIS spoofing, ship-to-ship transfers common. China buys at steep discount. ~251 vessels loaded Iranian oil in 2025, 86% sanctioned."
  },

  "Brazil": {
    production_mbpd: 3.74,
    share_pct: 4.4,
    noc: "Petrobras (state-controlled)",
    mainGrades: ["Tupi", "Buzios", "Marlim"],
    mainExportRegions: ["China (dominant)", "USA", "Europe", "India"],
    opecPlus: true,
    keyFields: ["Santos Basin pre-salt", "Campos Basin"],
    exportPorts: ["Santos", "Angra dos Reis"],
    notes: "Deepwater pre-salt production growing rapidly. Most exports go Cape route to China."
  },

  "Kuwait": {
    production_mbpd: 2.58,
    share_pct: 3.0,
    noc: "Kuwait Petroleum Corporation (KPC)",
    mainGrades: ["Kuwait Export Blend"],
    mainExportRegions: ["Japan", "South Korea", "China", "India"],
    opecMember: true,
    exportPorts: ["Mina Al Ahmadi"],
  },

  "Kazakhstan": {
    production_mbpd: 1.9,
    share_pct: 2.3,
    noc: "KazMunayGas",
    mainGrades: ["CPC Blend", "KEBCO"],
    mainExportRegions: ["Italy", "Netherlands", "China"],
    opecPlus: true,
    keyFields: ["Tengiz (Chevron)", "Kashagan (international consortium)", "Karachaganak"],
    exportRoutes: ["CPC Pipeline → Novorossiysk → Black Sea/Med", "BTC Pipeline → Ceyhan"],
  },

  "Nigeria": {
    production_mbpd: 1.5,
    share_pct: 1.8,
    noc: "NNPC",
    mainGrades: ["Bonny Light", "Qua Iboe", "Forcados", "Brass River"],
    mainExportRegions: ["India", "USA", "Europe", "China"],
    opecMember: true,
    exportPorts: ["Bonny Terminal", "Forcados", "Brass Terminal", "Qua Iboe"],
    notes: "Light sweet grades command premium. Production volatile due to pipeline theft and sabotage. Chronic OPEC underproducer vs quota."
  },

  "Libya": {
    production_mbpd: 1.2,
    share_pct: 1.4,
    noc: "NOC Libya",
    mainGrades: ["Es Sider", "Sharara", "El Feel"],
    mainExportRegions: ["Italy", "Spain", "Germany", "France", "China"],
    opecMember: true,
    exportPorts: ["Es Sider", "Ras Lanuf", "Zawiya", "Mellitah"],
    notes: "Production highly volatile due to civil conflict. Frequent force majeure declarations. European refineries heavily reliant on Libyan light sweet grades."
  },

  "Algeria": {
    production_mbpd: 1.2,
    share_pct: 1.4,
    noc: "Sonatrach",
    mainGrades: ["Saharan Blend", "Zarzaitine"],
    mainExportRegions: ["Spain", "Italy", "France", "USA"],
    opecMember: true,
    exportPorts: ["Arzew", "Skikda", "Bejaia"],
  },

  "Venezuela": {
    production_mbpd: 0.8,
    share_pct: 0.9,
    noc: "PDVSA",
    mainGrades: ["Merey 16", "Tia Juana Light"],
    mainExportRegions: ["China", "Cuba"],
    sanctioned: true,
    shadowFleet: true,
    opecMember: true,
    notes: "US blockade 2025-2026. Shadow fleet seizures ongoing. China primary buyer. Production severely impaired by sanctions and mismanagement."
  },

  "Angola": {
    production_mbpd: 1.1,
    share_pct: 1.3,
    noc: "Sonangol",
    mainGrades: ["Cabinda", "Girassol", "Dalia", "Nemba"],
    mainExportRegions: ["China (60%+)", "India", "USA"],
    opecMember: true,
    exportPorts: ["Malongo", "Cabinda", "Luanda"],
    notes: "China dominant buyer. Deepwater fields operated by TotalEnergies, Chevron, BP (Azule Energy), ExxonMobil."
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 4: MAJOR TRADING COMPANIES
// Who moves the oil and how
// ══════════════════════════════════════════════════════════════════════════

const TRADING_COMPANIES = {

  "Vitol": {
    hq: "Rotterdam/Geneva",
    type: "Independent commodity trader",
    volumeMbpd: 7.0,
    annualRevenue_bn: 331,
    profit2024_bn: 8.0,
    equity_bn: 30.7,
    focus: ["Crude oil", "Refined products", "LNG", "Metals (expanding)"],
    keyRegions: ["Middle East", "West Africa", "North Sea", "Americas"],
    assets: ["Saras refinery (Italy)", "Adriatic LNG (Italy)", "Engen (South Africa)"],
    notes: "World's largest independent oil trader. ~1,800 staff but enormous efficiency. Centralized financing model. Active in all major crude export regions."
  },

  "Trafigura": {
    hq: "Singapore/Geneva",
    type: "Independent commodity trader",
    volumeMbpd: 6.0,
    annualRevenue_bn: 270,
    profit2024_bn: 2.8,
    equity_bn: 16.3,
    focus: ["Crude oil", "Refined products", "Metals", "Minerals"],
    keyRegions: ["West Africa", "Americas", "Middle East", "Russia (reduced post-sanctions)"],
    notes: "Major pre-payment deals with emerging market producers. Extensive physical infrastructure. Over 150 countries. Second largest independent trader."
  },

  "Glencore": {
    hq: "Baar, Switzerland",
    type: "Diversified miner and trader",
    volumeMbpd: 3.7,
    focus: ["Crude oil", "Coal", "Metals", "Agricultural"],
    notes: "Integrated mining and trading. Strong in copper, coal alongside oil. Declining share of oil trading volume."
  },

  "Gunvor": {
    hq: "Geneva/Cyprus",
    type: "Independent commodity trader",
    volumeMbpd: 2.5,
    annualRevenue_bn: 136,
    profit2024_bn: 0.73,
    focus: ["Crude oil", "LNG (44% of volumes)", "Refined products"],
    keyRegions: ["Americas (primarily now)", "Africa", "Asia"],
    notes: "Originally focused on Russian exports. Divested Russian assets after 2022 invasion. Now primarily sources from Americas. Fourth largest crude trader. Management buyout December 2025."
  },

  "Mercuria": {
    hq: "Geneva",
    type: "Independent commodity trader",
    volumeMbpd: 2.0,
    focus: ["Energy", "Metals", "Agricultural"],
    notes: "Expanding aggressively into metals. Record profits in metals 2025. Strong in energy transition commodities."
  },

  "Saudi Aramco Trading": {
    hq: "Dhahran, Saudi Arabia",
    type: "NOC trading arm",
    notes: "Trades Aramco equity crude plus third-party volumes. Long-term contracts with Asian refineries dominate."
  },

  "CNOOC Trading": {
    hq: "Beijing",
    type: "NOC trading arm",
    notes: "China's offshore crude trading arm. Buys significant African and Middle East crude."
  },

  "Sinopec International": {
    hq: "Beijing",
    type: "NOC trading arm",
    notes: "Trades for Sinopec refineries. Major buyer of Russian, Iranian, Saudi, and West African crude."
  },

  "TOTSA (TotalEnergies)": {
    hq: "Paris/Geneva",
    type: "IOC trading arm",
    notes: "Trades equity crude from TotalEnergies upstream assets (West Africa, North Sea, Middle East) plus third-party."
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 5: MARITIME CHOKEPOINTS
// Current volumes, geopolitical risks, alternative routes
// ══════════════════════════════════════════════════════════════════════════

const CHOKEPOINTS_DETAIL = {

  "Strait of Hormuz": {
    location: "Between Iran and Oman",
    coordinates: [26.57, 56.50],
    volumeMbpd_2025: 20.9,
    pctGlobalSeaborneTrade: 25,
    pctGlobalConsumption: 20,
    primaryFlows: ["Persian Gulf crude → Asia (84%)", "Persian Gulf crude → Europe", "LNG from Qatar"],
    topExporters: ["Saudi Arabia (38% of flows)", "Iraq", "UAE", "Kuwait", "Iran"],
    topImporters: ["China", "India", "Japan", "South Korea"],
    alternativeRoutes: ["Saudi East-West Pipeline to Yanbu (5 Mbpd capacity)", "UAE ADCOP to Fujairah (1 Mbpd)"],
    currentRisk: "CRITICAL — Strait closed by Iran following US-Israeli strikes March 2026. ~8 Mbpd supply disrupted. Largest disruption in oil market history.",
    riskLevel: "EXTREME",
  },

  "Strait of Malacca": {
    location: "Between Malaysia, Singapore, Indonesia",
    coordinates: [1.30, 103.80],
    volumeMbpd_2025: 23.2,
    pctGlobalSeaborneTrade: 29,
    topFlows: ["Middle East crude → China (48% of transits)", "Middle East crude → Japan/Korea", "ESPO → China"],
    alternativeRoutes: ["Lombok Strait (Indonesia)", "Sunda Strait (Indonesia)", "Maluku Strait"],
    currentRisk: "Moderate — Piracy incidents increasing since 2023. Traffic congestion near Singapore. Shadow fleet vessels clustering offshore.",
    riskLevel: "MODERATE",
  },

  "Suez Canal": {
    location: "Egypt — connecting Red Sea to Mediterranean",
    coordinates: [30.70, 32.50],
    volumeMbpd_2025: 4.9,
    pctGlobalSeaborneTrade: 6,
    topFlows: ["Persian Gulf → Europe (Suezmax, smaller)", "Russia → Asia (southbound)", "Mediterranean products → Asia"],
    maxDraft: 20.1,
    vesselRestrictions: "VLCCs cannot transit fully loaded",
    currentRisk: "HIGH — Houthi attacks on Red Sea shipping since late 2023. ~45% increase in Cape of Good Hope routing. Many operators avoiding Suez/Bab-el-Mandeb corridor.",
    riskLevel: "HIGH",
  },

  "Bab el-Mandeb": {
    location: "Between Yemen and Djibouti/Eritrea",
    coordinates: [12.50, 43.50],
    volumeMbpd_2025: 4.2,
    pctGlobalSeaborneTrade: 5,
    topFlows: ["Persian Gulf → Europe via Suez", "Asia → Europe"],
    currentRisk: "HIGH — Houthi missile and drone attacks on commercial vessels since November 2023. Forces ships to Cape of Good Hope diversion adding 10-14 days. US/UK military operations ongoing.",
    riskLevel: "HIGH",
  },

  "Cape of Good Hope": {
    location: "Southern tip of South Africa",
    coordinates: [-34.50, 26.00],
    volumeMbpd_2025: 9.1, // Up 45% from 2022 due to Red Sea diversion
    notes: "Alternative to Suez/Bab-el-Mandeb. Not a chokepoint but critical route. Volume surged 45% due to Houthi attacks. Adds 10-14 days and significant fuel cost vs Suez route.",
  },

  "Turkish Straits (Bosphorus/Dardanelles)": {
    location: "Turkey — connecting Black Sea to Mediterranean",
    coordinates: [41.10, 29.00],
    volumeMbpd_2025: 3.7,
    pctGlobalSeaborneTrade: 5,
    topFlows: ["Russian Urals (Novorossiysk) → Mediterranean/World", "Kazakh CPC blend → Mediterranean"],
    vesselRestrictions: "One of world's most challenging waterways. Narrow, high traffic, restricted hours for large tankers.",
    currentRisk: "MODERATE — Russian shadow fleet using Bosphorus. Turkey applies environmental rules selectively. EU sanctions create insurance complications. Ukrainian drone strikes on Black Sea vessels 2025.",
    riskLevel: "MODERATE",
  },

  "Danish Straits (Oresund/Great Belt)": {
    location: "Between Denmark and Sweden/Germany",
    coordinates: [56.00, 12.60],
    volumeMbpd_2025: 4.9,
    topFlows: ["Russian Primorsk/Ust-Luga → World (historically Europe, now Asia via Cape diversion)"],
    currentRisk: "ELEVATED — EU/NATO countries conducting insurance checks on Russian shadow fleet tankers. Several vessels seized 2025. Shadow fleet vessels avoiding or attempting passage.",
    riskLevel: "ELEVATED",
  },

  "Panama Canal": {
    location: "Panama",
    coordinates: [9.20, -79.90],
    volumeMbpd_2025: 2.3,
    pctGlobalSeaborneTrade: 3,
    topFlows: ["US Gulf crude/products → Asia", "US LNG → Asia (declining)", "Refined products"],
    vesselRestrictions: "VLCCs cannot transit. Aframax and smaller. Water level restrictions.",
    currentRisk: "LOW-MODERATE — Water level restrictions from 2023-2024 have improved. China tariffs on US propane reduced some LNG/HGL volumes.",
    riskLevel: "LOW-MODERATE",
  },

  "Strait of Hormuz (CLOSED - March 2026)": {
    currentStatus: "CLOSED to Western-allied shipping following US-Israeli strikes on Iran. Iran IRGC blockade. Zero tanker transits on March 7, 2026. Historical average 138 vessels/day. ~8 Mbpd crude disrupted. Largest supply disruption in oil market history.",
    priceImpact: "Brent crude surged significantly. IEA emergency strategic reserve releases activated.",
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 6: TRADE FLOW PATTERNS
// Who sends what to whom — the global crude trade map
// Data: 2025 baseline patterns
// ══════════════════════════════════════════════════════════════════════════

const TRADE_FLOWS = {

  // From Persian Gulf
  "Persian Gulf → China": {
    volumeMbpd: 4.5,
    primaryGrades: ["Arab Light", "Basrah Light", "Kuwait Export", "Murban"],
    primaryVesselClass: "VLCC",
    typicalRoute: "Persian Gulf → China via Malacca",
    daysAtSea: 18,
    notes: "China receives ~48% of Malacca crude transits. Saudi, Iraqi, UAE, Kuwaiti crude primarily via VLCC through Hormuz and Malacca."
  },

  "Persian Gulf → India": {
    volumeMbpd: 3.5,
    primaryGrades: ["Arab Light", "Basrah Light", "Kuwait Export", "Murban"],
    primaryVesselClass: "Suezmax/VLCC",
    typicalRoute: "Persian Gulf → India",
    daysAtSea: 7,
    notes: "Short voyage. India's western coast refineries at Jamnagar (Reliance), Vadinar, Mumbai. India increasingly buying discounted Russian crude reducing Middle East share."
  },

  "Persian Gulf → Japan/Korea": {
    volumeMbpd: 2.5,
    primaryGrades: ["Arab Light", "Kuwait Export", "Murban"],
    primaryVesselClass: "VLCC",
    typicalRoute: "Persian Gulf → Japan/Korea via Malacca",
    daysAtSea: 20,
    notes: "Japan and Korea have long-term contracts with Saudi Aramco and ADNOC. VLCCs dominate."
  },

  "Persian Gulf → Europe (via Suez)": {
    volumeMbpd: 1.5,
    primaryGrades: ["Arab Light", "Basrah Light"],
    primaryVesselClass: "Suezmax",
    typicalRoute: "Persian Gulf → Europe via Suez",
    daysAtSea: 16,
    notes: "Suezmax dominate due to canal restrictions. Houthi attacks have severely disrupted this route since 2023-2024. Many redirected via Cape."
  },

  "Persian Gulf → Europe (via Cape)": {
    volumeMbpd: 0.8, // Increased due to Houthi disruption
    primaryVesselClass: "VLCC/Suezmax",
    typicalRoute: "Persian Gulf → Europe via Cape",
    daysAtSea: 31,
    notes: "Houthi bypass. Significantly longer and more expensive. Adds ~2 weeks transit time."
  },

  // From Russia
  "Russia (Baltic) → China/India/Asia": {
    volumeMbpd: 2.0,
    primaryGrades: ["Urals — SANCTIONED"],
    primaryVesselClass: "Aframax/Suezmax",
    typicalRoute: "Russia Baltic → Europe via Oresund (then onward)",
    notes: "Post-EU sanctions pivot to Asia. Via Cape of Good Hope or Suez to India/China. Trades at significant discount. Shadow fleet."
  },

  "Russia (Black Sea) → Turkey/India": {
    volumeMbpd: 0.8,
    primaryGrades: ["Urals — SANCTIONED", "CPC Blend (Kazakhstan)"],
    primaryVesselClass: "Aframax",
    typicalRoute: "Black Sea → Mediterranean via Bosphorus",
    notes: "Turkey largest remaining European buyer. India via Med/Suez. Shadow fleet concerns at Bosphorus."
  },

  "Russia (ESPO) → China": {
    volumeMbpd: 1.2,
    primaryGrades: ["ESPO — SANCTIONED but often on legitimate vessels"],
    primaryVesselClass: "Aframax",
    typicalRoute: "Russia ESPO → China/Japan",
    daysAtSea: 4,
    notes: "Short Pacific route. Chinese ports accept ESPO openly. Less shadow fleet dependency than Atlantic routes."
  },

  // From West Africa
  "West Africa → China": {
    volumeMbpd: 1.5,
    primaryGrades: ["Angolan grades (Girassol, Cabinda, Dalia)", "Nigerian grades"],
    primaryVesselClass: "VLCC/Suezmax",
    typicalRoute: "West Africa → China via Cape",
    daysAtSea: 28,
    notes: "Long-haul Cape route. China dominant buyer of West African crude. VLCCs preferred for economics."
  },

  "West Africa → Europe": {
    volumeMbpd: 1.2,
    primaryGrades: ["Nigerian (Bonny Light, Qua Iboe)", "Libyan", "Algerian Saharan Blend"],
    primaryVesselClass: "Suezmax/Aframax",
    typicalRoute: "West Africa → Europe via Atlantic",
    daysAtSea: 14,
    notes: "European refiners prize West African light sweet grades. Mediterranean refineries particularly reliant on Libyan crude."
  },

  "West Africa → India": {
    volumeMbpd: 0.5,
    primaryGrades: ["Nigerian light grades"],
    primaryVesselClass: "Suezmax",
    typicalRoute: "West Africa → India via Cape",
    daysAtSea: 20,
  },

  // From Americas
  "USA → Asia": {
    volumeMbpd: 1.5,
    primaryGrades: ["WTI", "Eagle Ford Light"],
    primaryVesselClass: "VLCC/Suezmax",
    typicalRoute: "USA Gulf → Asia via Panama",
    daysAtSea: 26,
    notes: "US crude export boom post-2020. South Korea, Japan primary buyers. Via Panama Canal or Cape."
  },

  "USA → Europe": {
    volumeMbpd: 1.2,
    primaryGrades: ["WTI", "Mars Blend"],
    primaryVesselClass: "Suezmax/Aframax",
    typicalRoute: "USA Gulf → Europe via Atlantic",
    daysAtSea: 14,
    notes: "EU importing more US crude to replace Russian supplies post-sanctions."
  },

  "Brazil → China": {
    volumeMbpd: 0.8,
    primaryGrades: ["Tupi", "Buzios"],
    primaryVesselClass: "VLCC/Suezmax",
    typicalRoute: "Brazil → China via Cape",
    daysAtSea: 32,
    notes: "China dominant buyer of Brazilian pre-salt crude."
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 7: ROUTE CLASSIFICATION INTELLIGENCE
// How the AI determines what route a vessel is on and why
// ══════════════════════════════════════════════════════════════════════════

const ROUTE_INTELLIGENCE = {

  // ── SIGNAL WEIGHTS FOR ROUTE PREDICTION ──────────────────────────────

  signalWeights: {
    chokepointConfirmed: 0.90,    // Vessel confirmed through specific chokepoint
    draughtConfirmed: 0.85,       // Draught at departure confirms load status
    headingProjection: 0.70,      // Nose pointing toward route waypoints
    declaredDestination: 0.78,    // AIS declared destination (often wrong/blank)
    vesselHistory: 0.75,          // This vessel's previous confirmed routes
    regionFallback: 0.45,         // Just the ocean region with no other signals
  },

  // ── CHOKEPOINT → ROUTE DEDUCTION ─────────────────────────────────────
  // If a vessel passes through a chokepoint, we can narrow routes dramatically

  chokepointDeductions: {
    "Strait of Hormuz OUTBOUND": {
      // Vessel exiting Persian Gulf heading east
      possibleRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca", "Persian Gulf → India", "Persian Gulf → Singapore", "Persian Gulf → Australia"],
      // Heading east (060-120°) → China/Japan/Korea/Australia
      // Heading southwest (180-240°) → India or turning for Europe/Cape
      confidence: 0.80,
    },
    "Strait of Malacca OUTBOUND (heading east)": {
      possibleRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"],
      confidence: 0.88,
    },
    "Suez Canal NORTHBOUND": {
      // Coming from Red Sea heading north into Mediterranean
      possibleRoutes: ["Persian Gulf → Europe via Suez"],
      confidence: 0.92,
    },
    "Suez Canal SOUTHBOUND": {
      // Heading from Med into Red Sea
      possibleRoutes: ["Heading to Persian Gulf or Asia from Europe"],
      confidence: 0.88,
    },
    "Bab el-Mandeb NORTHBOUND": {
      possibleRoutes: ["Persian Gulf → Europe via Suez"],
      confidence: 0.85,
    },
    "Cape of Good Hope EASTBOUND": {
      possibleRoutes: ["West Africa → China via Cape", "Brazil → China via Cape", "Persian Gulf → Europe via Cape (reversed)"],
      confidence: 0.82,
    },
    "Cape of Good Hope WESTBOUND": {
      possibleRoutes: ["Persian Gulf → Europe via Cape", "Middle East → Europe via Cape (Suez bypass)"],
      confidence: 0.82,
    },
    "Bosphorus SOUTHBOUND": {
      possibleRoutes: ["Black Sea → Mediterranean via Bosphorus"],
      confidence: 0.95,
    },
    "Oresund SOUTHBOUND": {
      possibleRoutes: ["Russia Baltic → Europe via Oresund"],
      confidence: 0.95,
    },
    "Panama Canal WESTBOUND": {
      possibleRoutes: ["USA Gulf → Asia via Panama"],
      confidence: 0.92,
    },
  },

  // ── ROUTE CLASSIFICATION ──────────────────────────────────────────────
  // After voyage completion, classify the type of trade

  routeClassifications: {
    "NORMAL_TRADE": "Standard commercial crude trade along expected route. No anomalies.",
    "SANCTIONS_BYPASS": "Route deviates from expected path. Origin or destination involves sanctioned country. Shadow fleet vessel suspected.",
    "HOUTHI_DIVERSION": "Vessel avoided Bab el-Mandeb/Suez. Took Cape of Good Hope route instead. Common since late 2023.",
    "HORMUZ_DIVERSION": "Vessel bypassed Strait of Hormuz via Saudi East-West pipeline or UAE ADCOP.",
    "SHIP_TO_SHIP_TRANSFER": "Vessel stopped in open ocean (Strait of Malacca approach, off Oman, off Malaysia) suggesting STS transfer. Common for sanctioned crude.",
    "SEASONAL_ROUTING": "Route choice influenced by seasonal weather (monsoon season in Arabian Sea, North Sea storms, etc.)",
    "SPOT_CARGO": "Unusual buyer/seller combination. Opportunistic cargo. Not on vessel's typical route.",
    "STRATEGIC_RESERVE_FILL": "Vessel delivering to known strategic petroleum reserve terminal.",
    "DARK_VOYAGE": "AIS transponder turned off for significant period. High suspicion of sanctioned cargo.",
  },

  // ── CARGO ESTIMATION BY ORIGIN + VESSEL CLASS ─────────────────────────

  cargoEstimation: {
    // Given origin port + vessel class → most likely crude grade + estimated value
    methodology: "Use origin port to identify crude grade. Use draught to estimate volume in tonnes. Convert to barrels using grade-specific conversion factor. Apply current benchmark price.",

    conversionFactors: {
      // Barrels per metric tonne by API gravity
      "light_sweet_40api": 7.6,    // WTI, Saharan Blend
      "light_35api": 7.3,           // Bonny Light, Brent
      "medium_33api": 7.1,          // Arab Light, Basrah Light
      "medium_30api": 6.9,          // Arab Medium, Urals
      "heavy_27api": 6.7,           // Arab Heavy, Basrah Medium
      "very_heavy_20api": 6.4,      // WCS, Venezuelan Merey
    },

    // Estimated cargo value calculation:
    // Value = Barrels × Current Brent Price × (1 ± grade differential)
    // Arab Light differential: ~-$0.5 to +$0.5 vs Brent
    // Bonny Light differential: ~+$1 to +$2 vs Brent
    // Urals differential: ~-$15 to -$20 vs Brent (sanctioned discount)
    // Iranian crude: ~-$20 to -$25 vs Brent
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 8: SANCTIONS AND SHADOW FLEET INTELLIGENCE
// Current as of March 2026
// ══════════════════════════════════════════════════════════════════════════

const SANCTIONS_INTELLIGENCE = {

  activeRegimes: {
    "Russia": {
      sanctioningParties: ["USA", "EU", "UK", "G7", "Australia"],
      priceCap: 60, // USD per barrel
      shadowFleetSize: 1400,
      typicalBehaviors: [
        "AIS transponder turned off or spoofed",
        "Flag-hopping (70%+ changed flags in 2025)",
        "Ship-to-ship transfers to obscure origin",
        "Clustering near Malaysia Strait (Riau Archipelago)",
        "False destination declarations",
        "Sailing to non-Western ports only",
      ],
      primaryBuyers: ["China", "India", "Turkey"],
      enforcementActions: "900+ sanctions on vessels in 2025. EU/US vessel seizures. Ukrainian drone strikes on Black Sea tankers. Baltic Sea detentions.",
    },

    "Iran": {
      sanctioningParties: ["USA", "EU", "UK"],
      shadowFleetSize: 251, // vessels that loaded Iranian oil in 2025
      pctSanctionedVessels: 86,
      typicalBehaviors: [
        "AIS spoofing (common — broadcasts false location)",
        "Ship-to-ship transfers near Oman/Malaysia",
        "Fuel transfers at Fujairah",
        "False flag registration",
        "Destination spoofing",
      ],
      primaryBuyers: ["China (90% of exports)", "Syria"],
      discount: "~$20-25/bbl below Brent",
    },

    "Venezuela": {
      sanctioningParties: ["USA"],
      usBlockade: true, // US naval blockade 2025-2026
      typicalBehaviors: [
        "Shadow fleet vessels",
        "Ship-to-ship transfers in Caribbean",
        "False flagging",
        "AIS turned off",
      ],
      primaryBuyers: ["China"],
      notes: "US actively seizing tankers since December 2025. ~50 tankers loaded with Venezuelan oil at sea during blockade.",
    },
  },

  // ── HOW TO IDENTIFY SHADOW FLEET VESSELS ─────────────────────────────
  shadowFleetIndicators: [
    "AIS signal goes dark for extended periods",
    "Sudden flag change mid-voyage",
    "Operating without P&I insurance",
    "Age >15 years (shadow fleet typically older vessels)",
    "Unknown or offshore-registered ownership",
    "Routes that pass through known STS transfer zones without declared port calls",
    "Destination declared as anchor area (STS zone) rather than actual port",
    "Vessel previously sanctioned or on OFAC/EU/UK lists",
  ],

  // ── KNOWN STS TRANSFER ZONES ──────────────────────────────────────────
  shipToShipZones: [
    { name: "Riau Archipelago (Malaysia/Indonesia)", lat: 1.0, lng: 104.5, notes: "Russian crude transfer hub. 130+ shadow fleet vessels clustered December 2025." },
    { name: "Lakshadweep Sea (India)", lat: 11.0, lng: 73.0, notes: "Iranian crude transfers." },
    { name: "Omani Coast", lat: 22.0, lng: 60.0, notes: "Iranian crude transfers outside Hormuz." },
    { name: "Gulf of Mexico (international waters)", lat: 22.0, lng: -90.0, notes: "Venezuelan crude STS." },
    { name: "Greek Islands area", lat: 37.0, lng: 24.0, notes: "Russian crude re-labeling for European sale." },
  ],

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 9: MAJOR REFINERIES AND CRUDE PREFERENCES
// Where the oil goes and what it wants
// ══════════════════════════════════════════════════════════════════════════

const REFINERIES = {

  "Jamnagar (Reliance, India)": {
    capacity_mbpd: 1.24,
    location: [22.47, 69.07],
    crudePreferences: ["Arab Light", "Iraqi grades", "West African light grades"],
    notes: "World's largest single-location refinery. Processes wide range of grades."
  },

  "Zhoushan/Ningbo Cluster (China)": {
    capacity_mbpd: 1.5,
    location: [30.02, 122.10],
    crudePreferences: ["Iranian (teapot refineries)", "Russian Urals", "Saudi", "Angolan"],
    notes: "Teapot refineries buy discounted sanctioned crude. Major Chinese import hub."
  },

  "Rotterdam Cluster (Netherlands)": {
    capacity_mbpd: 1.2,
    location: [51.89, 4.10],
    crudePreferences: ["Brent", "North Sea grades", "US WTI (increasing)", "West African"],
    notes: "Europe's largest refining center. Post-Russia-sanctions major shift to US and West African crude."
  },

  "Ulsan Cluster (South Korea)": {
    capacity_mbpd: 1.1,
    location: [35.54, 129.32],
    crudePreferences: ["Arab Light", "UAE Murban", "Kuwait Export", "US WTI"],
    notes: "SK Innovation and S-Oil. Long-term Saudi/UAE contracts. Increasing US WTI imports."
  },

  "Ruwais (ADNOC, UAE)": {
    capacity_mbpd: 0.82,
    location: [24.11, 52.73],
    crudePreferences: ["Murban", "Upper Zakum", "Das Blend"],
    notes: "One of world's largest. Processes UAE equity crude."
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 10: SEASONAL PATTERNS
// How crude trade changes through the year
// ══════════════════════════════════════════════════════════════════════════

const SEASONAL_PATTERNS = {

  "Q1 (Jan-Mar)": {
    northernHemisphere: "Peak heating oil demand. Higher refinery runs in Europe/North America/Asia.",
    arabianSea: "NE monsoon — favorable sailing conditions. High traffic Persian Gulf routes.",
    atlantic: "Winter storms possible. North Sea loading sometimes disrupted.",
    caribbeanGulfMexico: "Calm conditions. High US export activity.",
  },

  "Q2 (Apr-Jun)": {
    arabianSea: "Pre-monsoon. Increasing temperatures but still good sailing.",
    chinaInventory: "China typically builds crude stocks Q2 in anticipation of summer demand.",
    refinerySwitching: "Spring maintenance (turnarounds) reduce refinery runs, lower crude demand temporarily.",
  },

  "Q3 (Jul-Sep)": {
    arabianSea: "SW monsoon. Rough conditions, some routing adjustments.",
    atlanticHurricane: "Hurricane season. US Gulf Coast loading sometimes disrupted.",
    china: "Peak cooling demand. High refinery runs.",
    opecReview: "OPEC+ typically reviews quotas for H2. Production adjustments common.",
  },

  "Q4 (Oct-Dec)": {
    arabianSea: "Monsoon ends. Conditions improve.",
    northernHemisphere: "Building winter heating oil stocks. Higher crude demand.",
    yearEndContracts: "Annual crude supply contracts renegotiated for following year.",
    opecAnnualMeeting: "OPEC+ Annual Meeting typically in December. Production decisions for next year.",
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 11: GEOPOLITICAL CONTEXT (March 2026)
// Current events affecting crude trade routing
// ══════════════════════════════════════════════════════════════════════════

const GEOPOLITICAL_CONTEXT = {

  "Strait of Hormuz Closure": {
    status: "ACTIVE — March 2026",
    cause: "US-Israeli military strikes on Iran killed Supreme Leader Khamenei. IRGC closed strait to Western-allied shipping.",
    impact: "~8 Mbpd crude supply disrupted. ~20 Mbpd normally transits Hormuz. Largest supply disruption in history. Gulf producers (Saudi, Kuwait, UAE, Iraq) unable to export via Hormuz.",
    alternatives: "Saudi East-West pipeline to Yanbu (5 Mbpd). UAE ADCOP to Fujairah (1 Mbpd). Neither sufficient to replace full Hormuz volume.",
    priceImpact: "Brent surged above $119/bbl before settling back. IEA strategic reserve releases activated.",
    tankerImplication: "Any VLCC or Suezmax that was loading in Persian Gulf before March 2026 would divert. Vessels heading to Persian Gulf from Asia would reverse course.",
  },

  "Russia-Ukraine War": {
    status: "Ongoing — negotiations in progress (2026)",
    tradeImpact: "EU ban on Russian crude imports. Russia redirected ~3 Mbpd from Europe to Asia. Shadow fleet created to circumvent sanctions. Price cap enforcement intensifying.",
    tankerImplication: "Russian Aframax in Baltic/Black Sea → most likely heading to India or China, not Europe. Any vessel avoiding Baltic/Black Sea routes likely sanctioned-cargo concern.",
  },

  "Houthi Red Sea Attacks": {
    status: "Ongoing since November 2023",
    tradeImpact: "~45% increase in Cape of Good Hope routing. Suez Canal traffic significantly reduced. Major shipping cost increases.",
    tankerImplication: "A vessel that should be on Persian Gulf → Europe via Suez route but is instead rounding Africa = Houthi diversion. Add 10-14 days to voyage time and significant fuel cost.",
  },

  "US-China Trade War": {
    status: "Active — tariffs ongoing",
    tradeImpact: "China reduced US propane imports. US-India trade deal may reduce Indian Russian crude purchases.",
    tankerImplication: "May reduce some US Gulf → Asia movements.",
  },

};

// ══════════════════════════════════════════════════════════════════════════
// SECTION 12: AI REASONING FRAMEWORK
// How the AI should think about each voyage
// ══════════════════════════════════════════════════════════════════════════

const AI_REASONING_FRAMEWORK = {

  // Step-by-step reasoning process for each voyage update
  reasoningSteps: [
    "1. IDENTIFY VESSEL: What class? What is likely cargo capacity based on draught?",
    "2. IDENTIFY ORIGIN: What port did it depart? What crude grade(s) are exported from there?",
    "3. ASSESS CARGO: Is vessel loaded (high draught) or ballast (low draught)? Estimate tonnes.",
    "4. REVIEW CHOKEPOINTS: Which chokepoints has it passed? What does each one confirm/exclude?",
    "5. ANALYZE HEADING: Where is the nose pointing? Project forward — what lies on that bearing?",
    "6. CHECK SANCTIONS: Is origin/vessel sanctioned? Shadow fleet indicators present?",
    "7. APPLY GEOPOLITICS: Does current situation (Hormuz closure, Houthi attacks, etc.) explain routing?",
    "8. REVIEW HISTORY: Has this vessel done this route before? What does its profile say?",
    "9. ESTIMATE DESTINATION: Based on all signals, what is the most likely destination?",
    "10. IDENTIFY BUYER: Given origin grade and destination refinery cluster, who is likely buying?",
    "11. ESTIMATE VALUE: Cargo tonnes × barrels per tonne × current benchmark price ± grade differential",
    "12. CLASSIFY TRADE: Normal trade? Sanctions bypass? Geopolitical diversion? STS transfer?",
    "13. STATE CONFIDENCE: How confident am I? What would change my prediction?",
  ],

  // Confidence thresholds
  confidenceThresholds: {
    "95-100%": "Multiple confirming signals. Chokepoint confirmed. Draught confirmed. History matches. Almost certain.",
    "80-94%": "Strong signals. Chokepoint confirmed or draught confirmed + heading aligned.",
    "65-79%": "Good signals. Heading projection hits multiple waypoints. Declared destination matches.",
    "50-64%": "Moderate. Region + some heading data. No contradicting signals.",
    "35-49%": "Weak. Region fallback only. No draught, no chokepoint, heading unreliable.",
    "below 35%": "Very low confidence. Missing key data. Multiple possible destinations.",
  },

  // When to flag for re-prediction
  rePredictionTriggers: [
    "Vessel passes chokepoint inconsistent with current prediction",
    "Vessel heading changes >45° sustained for >12 hours",
    "AIS goes dark for >24 hours (potential STS transfer or shadow fleet behavior)",
    "Vessel speed drops to <2 knots in open ocean (possible STS transfer)",
    "Vessel appears in known STS transfer zone",
    "Declared destination changes significantly",
    "Confidence drops >20% from previous check",
    "Geopolitical event occurs that would logically redirect vessels on this route",
  ],

};

// ══════════════════════════════════════════════════════════════════════════
// EXPORTS — Everything available to the reasoning engine
// ══════════════════════════════════════════════════════════════════════════

module.exports = {
  VESSEL_CLASSES,
  CRUDE_GRADES,
  PRODUCERS,
  TRADING_COMPANIES,
  CHOKEPOINTS_DETAIL,
  TRADE_FLOWS,
  ROUTE_INTELLIGENCE,
  SANCTIONS_INTELLIGENCE,
  REFINERIES,
  SEASONAL_PATTERNS,
  GEOPOLITICAL_CONTEXT,
  AI_REASONING_FRAMEWORK,
};
