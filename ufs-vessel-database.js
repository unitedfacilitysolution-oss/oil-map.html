// ══════════════════════════════════════════════════════════════════════════
// UFS KNOWN VESSEL DATABASE v1.0
// United Facility Solution — March 2026
//
// This database contains known crude oil tankers actively trading globally.
// Used by the voyage monitor to:
// 1. Instantly identify vessel class and capabilities without guessing
// 2. Apply known typical routes as strong prediction signals
// 3. Flag sanctioned/shadow fleet vessels automatically
// 4. Match vessel names from AISstream to known profiles
// 5. Feed the learning system with confirmed vessel intelligence
//
// IMPORTANT NOTES:
// - MMSI/IMO numbers populated from verified sources where available
// - Where MMSI is null — system fills in automatically when vessel seen in AISstream
// - Typical routes updated as voyages complete and learning system confirms/corrects
// - sanctioned: true = vessel on OFAC/EU/UK sanctions list
// - shadowFleet: true = vessel known to carry sanctioned crude
// ══════════════════════════════════════════════════════════════════════════

const KNOWN_VESSELS = [

  // ══════════════════════════════════════════════════════════════════════
  // DHT HOLDINGS — Pure VLCC operator, Marshall Islands/Liberia flagged
  // Trades globally, primarily Middle East → Asia and Atlantic Basin
  // Management: Monaco, Norway, Singapore, India
  // ══════════════════════════════════════════════════════════════════════
  { name: "DHT TIGER",        imo: "9733959", mmsi: "538011588", operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 319430, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2017, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Basrah Light"], sanctioned: false, shadowFleet: false, notes: "Eco VLCC. Primarily Middle East to Asia." },
  { name: "DHT CHINA",        imo: "9315161", mmsi: "538011659", operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 299999, draughtLoaded: 21.8, draughtBallast: 9.2, cargoBarrels: 2000000, yearBuilt: 2005, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Bonny Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT EUROPE",       imo: "9315159", mmsi: "477538500", operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 299999, draughtLoaded: 21.8, draughtBallast: 9.2, cargoBarrels: 2000000, yearBuilt: 2005, typicalRoutes: ["Persian Gulf → Europe via Cape", "West Africa → Europe via Atlantic"], typicalCargo: ["Arab Light", "Bonny Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT JAGUAR",       imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 319430, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2018, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT LION",         imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 319430, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2018, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Kuwait Export"], sanctioned: false, shadowFleet: false },
  { name: "DHT PANTHER",      imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 319430, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2018, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT PUMA",         imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 319430, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2018, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT HAWK",         imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.5, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2016, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Angolan grades"], sanctioned: false, shadowFleet: false },
  { name: "DHT FALCON",       imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.5, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2016, typicalRoutes: ["Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Kuwait Export"], sanctioned: false, shadowFleet: false },
  { name: "DHT EAGLE",        imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.5, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2016, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT CONDOR",       imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.5, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2015, typicalRoutes: ["West Africa → China via Cape", "Persian Gulf → China via Malacca"], typicalCargo: ["Bonny Light", "Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT OSPREY",       imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.5, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2015, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT STALLION",     imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 319430, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2019, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Murban"], sanctioned: false, shadowFleet: false },
  { name: "DHT BRONCO",       imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 319430, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2019, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT MUSTANG",      imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 319430, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2020, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "DHT ANTELOPE",     imo: null,      mmsi: null,        operator: "DHT Holdings", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 320000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2026, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false, notes: "New delivery March 2026. First of four newbuildings." },

  // ══════════════════════════════════════════════════════════════════════
  // BAHRI (National Shipping Company of Saudi Arabia)
  // ~40 VLCCs. Dedicated Saudi Aramco crude exports. Middle East → Asia primary
  // Saudi Aramco owns 20% of Bahri
  // ══════════════════════════════════════════════════════════════════════
  { name: "ABQAIQ",           imo: "9465255", mmsi: "403517000", operator: "Bahri", flag: "Saudi Arabia", vesselClass: "VLCC", dwt: 319262, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2200000, yearBuilt: 2011, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca", "Persian Gulf → USA via Cape"], typicalCargo: ["Arab Light", "Arab Medium", "Arab Heavy"], sanctioned: false, shadowFleet: false, notes: "Named after Abqaiq oil processing facility. Bahri dedicated Aramco carrier." },
  { name: "AHMED BIN SALMAN", imo: null,      mmsi: null,        operator: "Bahri", flag: "Saudi Arabia", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2014, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Arab Medium"], sanctioned: false, shadowFleet: false },
  { name: "AL QADSIAH",       imo: null,      mmsi: null,        operator: "Bahri", flag: "Saudi Arabia", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2014, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Europe via Cape"], typicalCargo: ["Arab Light", "Arab Medium"], sanctioned: false, shadowFleet: false },
  { name: "AL FARABI",        imo: null,      mmsi: null,        operator: "Bahri", flag: "Saudi Arabia", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2015, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light", "Arab Heavy"], sanctioned: false, shadowFleet: false },
  { name: "AL BEDAYER",       imo: null,      mmsi: null,        operator: "Bahri", flag: "Saudi Arabia", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2015, typicalRoutes: ["Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Kuwait Export"], sanctioned: false, shadowFleet: false },
  { name: "AL ORAIQ",         imo: null,      mmsi: null,        operator: "Bahri", flag: "Saudi Arabia", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2016, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → India"], typicalCargo: ["Arab Light", "Arab Medium"], sanctioned: false, shadowFleet: false },
  { name: "SIRIUS STAR",      imo: "9384767", mmsi: "403513000", operator: "Bahri", flag: "Saudi Arabia", vesselClass: "VLCC", dwt: 318000, draughtLoaded: 22.0, draughtBallast: 9.2, cargoBarrels: 2100000, yearBuilt: 2008, typicalRoutes: ["Persian Gulf → USA via Cape", "Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light", "Arab Medium"], sanctioned: false, shadowFleet: false, notes: "Famous for 2008 piracy incident off Somalia." },
  { name: "MARAN HECTOR",     imo: null,      mmsi: null,        operator: "Bahri/Maran Tankers", flag: "Greece", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2017, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // MARAN TANKERS (Angelicoussis Group, Greece)
  // ~30 VLCCs, high-spec fleet, long-term charters with oil majors
  // ══════════════════════════════════════════════════════════════════════
  { name: "MARAN CASSIOPEIA", imo: null,      mmsi: null,        operator: "Maran Tankers", flag: "Greece", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2018, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Murban"], sanctioned: false, shadowFleet: false },
  { name: "MARAN CENTAURUS",  imo: null,      mmsi: null,        operator: "Maran Tankers", flag: "Greece", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2019, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light", "Arab Medium"], sanctioned: false, shadowFleet: false },
  { name: "MARAN CANOPUS",    imo: null,      mmsi: null,        operator: "Maran Tankers", flag: "Greece", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2019, typicalRoutes: ["Persian Gulf → Japan/Korea via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Bonny Light"], sanctioned: false, shadowFleet: false },
  { name: "NEPTUNE",          imo: null,      mmsi: null,        operator: "Maran Tankers", flag: "Greece", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2009, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Europe via Cape"], typicalCargo: ["Arab Light", "Basrah Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // EURONAV / CMB (Belgium/Greece) — Major VLCC and Suezmax operator
  // Tankers International pool for VLCCs. Post-Frontline merger (2023)
  // ══════════════════════════════════════════════════════════════════════
  { name: "TI EUROPE",        imo: "9246031", mmsi: "205751000", operator: "Euronav/CMB", flag: "Belgium", vesselClass: "VLCC", dwt: 441561, draughtLoaded: 24.5, draughtBallast: 10.5, cargoBarrels: 3000000, yearBuilt: 2002, typicalRoutes: ["Persian Gulf → USA via Cape", "Persian Gulf → Europe via Cape"], typicalCargo: ["Arab Light", "Arab Medium", "Arab Heavy"], sanctioned: false, shadowFleet: false, notes: "ULCC class — one of world's largest tankers. V-Plus classification. Very limited port access." },
  { name: "TI OCEANIA",       imo: "9246043", mmsi: "205752000", operator: "Euronav/CMB", flag: "Belgium", vesselClass: "VLCC", dwt: 441561, draughtLoaded: 24.5, draughtBallast: 10.5, cargoBarrels: 3000000, yearBuilt: 2003, typicalRoutes: ["Persian Gulf → USA via Cape", "Persian Gulf → Europe via Cape"], typicalCargo: ["Arab Light", "Arab Heavy"], sanctioned: false, shadowFleet: false, notes: "V-Plus/ULCC sister of TI Europe." },
  { name: "GENMAR ZEUS",      imo: null,      mmsi: null,        operator: "Euronav/CMB", flag: "Belgium", vesselClass: "VLCC", dwt: 305000, draughtLoaded: 21.8, draughtBallast: 9.2, cargoBarrels: 2050000, yearBuilt: 2010, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Angolan grades"], sanctioned: false, shadowFleet: false },
  { name: "ANTIGONE",         imo: null,      mmsi: null,        operator: "Euronav/CMB", flag: "Belgium", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: 2016, typicalRoutes: ["Persian Gulf → Europe via Suez", "West Africa → Europe via Atlantic"], typicalCargo: ["Arab Light", "Bonny Light"], sanctioned: false, shadowFleet: false },
  { name: "ASTRID",           imo: null,      mmsi: null,        operator: "Euronav/CMB", flag: "Belgium", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: 2017, typicalRoutes: ["West Africa → Europe via Atlantic", "Persian Gulf → Europe via Suez"], typicalCargo: ["Bonny Light", "Arab Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // FRONTLINE (John Fredriksen / Hemen Holdings, Cyprus/Norway)
  // 41 VLCCs, 21 Suezmax, 18 LR2/Aframax. Aggressive spot market strategy.
  // ══════════════════════════════════════════════════════════════════════
  { name: "FRONTLINE ARIES",  imo: null,      mmsi: null,        operator: "Frontline", flag: "Bahamas", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2020, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Kuwait Export"], sanctioned: false, shadowFleet: false },
  { name: "FRONTLINE TAURUS", imo: null,      mmsi: null,        operator: "Frontline", flag: "Bahamas", vesselClass: "VLCC", dwt: 319000, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: 2020, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light", "Arab Medium"], sanctioned: false, shadowFleet: false },
  { name: "FRONT FORCE",      imo: null,      mmsi: null,        operator: "Frontline", flag: "Bahamas", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2013, typicalRoutes: ["West Africa → China via Cape", "Persian Gulf → China via Malacca"], typicalCargo: ["Bonny Light", "Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "FRONT CROWN",      imo: null,      mmsi: null,        operator: "Frontline", flag: "Bahamas", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2014, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Angolan grades"], sanctioned: false, shadowFleet: false },
  { name: "FRONT EAGLE",      imo: null,      mmsi: null,        operator: "Frontline", flag: "Bahamas", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2015, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "FRONT SUMMER",     imo: null,      mmsi: null,        operator: "Frontline", flag: "Bahamas", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: 2016, typicalRoutes: ["West Africa → Europe via Atlantic", "Persian Gulf → Europe via Suez"], typicalCargo: ["Bonny Light", "Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "FRONT SPRING",     imo: null,      mmsi: null,        operator: "Frontline", flag: "Bahamas", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: 2016, typicalRoutes: ["West Africa → Europe via Atlantic", "Black Sea → Mediterranean via Bosphorus"], typicalCargo: ["Bonny Light", "Urals"], sanctioned: false, shadowFleet: false },
  { name: "FRONT OCELOT",     imo: null,      mmsi: null,        operator: "Frontline", flag: "Bahamas", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2019, typicalRoutes: ["North Sea → Global via English Channel", "Russia Baltic → Europe via Oresund"], typicalCargo: ["Brent", "Urals"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // NORDIC AMERICAN TANKERS (NAT) — Pure Suezmax operator
  // ~24 Suezmax vessels. Atlantic Basin specialist. Norway-based.
  // ══════════════════════════════════════════════════════════════════════
  { name: "NORDIC LUNA",      imo: null,      mmsi: null,        operator: "Nordic American Tankers", flag: "Bermuda", vesselClass: "Suezmax", dwt: 160000, draughtLoaded: 17.5, draughtBallast: 7.2, cargoBarrels: 1100000, yearBuilt: 2012, typicalRoutes: ["West Africa → Europe via Atlantic", "West Africa → USA East Coast"], typicalCargo: ["Bonny Light", "Qua Iboe", "Es Sider"], sanctioned: false, shadowFleet: false },
  { name: "NORDIC APOLLO",    imo: null,      mmsi: null,        operator: "Nordic American Tankers", flag: "Bermuda", vesselClass: "Suezmax", dwt: 160000, draughtLoaded: 17.5, draughtBallast: 7.2, cargoBarrels: 1100000, yearBuilt: 2013, typicalRoutes: ["West Africa → Europe via Atlantic", "West Africa → USA East Coast"], typicalCargo: ["Bonny Light", "Cabinda"], sanctioned: false, shadowFleet: false },
  { name: "NORDIC SKY",       imo: null,      mmsi: null,        operator: "Nordic American Tankers", flag: "Bermuda", vesselClass: "Suezmax", dwt: 160000, draughtLoaded: 17.5, draughtBallast: 7.2, cargoBarrels: 1100000, yearBuilt: 2014, typicalRoutes: ["West Africa → Europe via Atlantic", "North Sea → Global via English Channel"], typicalCargo: ["Brent", "Bonny Light"], sanctioned: false, shadowFleet: false },
  { name: "NORDIC BREEZE",    imo: null,      mmsi: null,        operator: "Nordic American Tankers", flag: "Bermuda", vesselClass: "Suezmax", dwt: 160000, draughtLoaded: 17.5, draughtBallast: 7.2, cargoBarrels: 1100000, yearBuilt: 2015, typicalRoutes: ["West Africa → USA East Coast", "West Africa → Europe via Atlantic"], typicalCargo: ["Bonny Light", "Forcados"], sanctioned: false, shadowFleet: false },
  { name: "NORDIC FREEDOM",   imo: null,      mmsi: null,        operator: "Nordic American Tankers", flag: "Bermuda", vesselClass: "Suezmax", dwt: 160000, draughtLoaded: 17.5, draughtBallast: 7.2, cargoBarrels: 1100000, yearBuilt: 2010, typicalRoutes: ["West Africa → Europe via Atlantic"], typicalCargo: ["Bonny Light", "Qua Iboe"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // TEEKAY TANKERS — Suezmax and Aframax specialist
  // Atlantic Basin focus. Norwegian-managed. Strong safety record.
  // ══════════════════════════════════════════════════════════════════════
  { name: "NORDIC HAWK",      imo: null,      mmsi: null,        operator: "Teekay Tankers", flag: "Bahamas", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: 2011, typicalRoutes: ["West Africa → Europe via Atlantic", "Persian Gulf → Europe via Suez"], typicalCargo: ["Bonny Light", "Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "NORDIC JAGUAR",    imo: null,      mmsi: null,        operator: "Teekay Tankers", flag: "Bahamas", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: 2012, typicalRoutes: ["West Africa → USA East Coast", "West Africa → Europe via Atlantic"], typicalCargo: ["Bonny Light", "Forcados"], sanctioned: false, shadowFleet: false },
  { name: "TEEKAY EAGLE",     imo: null,      mmsi: null,        operator: "Teekay Tankers", flag: "Bahamas", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2010, typicalRoutes: ["Black Sea → Mediterranean via Bosphorus", "Russia Baltic → Europe via Oresund"], typicalCargo: ["Urals", "CPC Blend"], sanctioned: false, shadowFleet: false },
  { name: "NORDIC FALCON",    imo: null,      mmsi: null,        operator: "Teekay Tankers", flag: "Bahamas", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2011, typicalRoutes: ["North Sea → Global via English Channel", "Russia Baltic → Europe via Oresund"], typicalCargo: ["Brent", "Urals"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // COSCO SHIPPING ENERGY (China) — Major Chinese VLCC fleet
  // Primarily chartered by Sinopec, CNOOC, PetroChina
  // ══════════════════════════════════════════════════════════════════════
  { name: "PACIFIC BRAVO",    imo: null,      mmsi: null,        operator: "COSCO Shipping Energy", flag: "China", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2016, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Angolan grades"], sanctioned: false, shadowFleet: false },
  { name: "PACIFIC CRYSTAL",  imo: null,      mmsi: null,        operator: "COSCO Shipping Energy", flag: "China", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2016, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light", "Basrah Light"], sanctioned: false, shadowFleet: false },
  { name: "PACIFIC DIAMOND",  imo: null,      mmsi: null,        operator: "COSCO Shipping Energy", flag: "China", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2017, typicalRoutes: ["Persian Gulf → China via Malacca", "Brazil → China via Cape"], typicalCargo: ["Arab Light", "Tupi"], sanctioned: false, shadowFleet: false },
  { name: "PACIFIC EMERALD",  imo: null,      mmsi: null,        operator: "COSCO Shipping Energy", flag: "China", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2017, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light", "Kuwait Export"], sanctioned: false, shadowFleet: false },
  { name: "PACIFIC RUBY",     imo: null,      mmsi: null,        operator: "COSCO Shipping Energy", flag: "China", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2018, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Angolan grades"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // CHINA MERCHANTS ENERGY SHIPPING (CMES) — Chinese VLCC operator
  // ══════════════════════════════════════════════════════════════════════
  { name: "CHEM MARS",        imo: null,      mmsi: null,        operator: "China Merchants Energy Shipping", flag: "China", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2015, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light", "Basrah Light"], sanctioned: false, shadowFleet: false },
  { name: "CHEM VENUS",       imo: null,      mmsi: null,        operator: "China Merchants Energy Shipping", flag: "China", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2015, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Bonny Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // BW GROUP (Singapore) — Diversified tanker fleet
  // ══════════════════════════════════════════════════════════════════════
  { name: "BW ADONIS",        imo: null,      mmsi: null,        operator: "BW Group", flag: "Singapore", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2013, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Angolan grades"], sanctioned: false, shadowFleet: false },
  { name: "BW ZEUS",          imo: null,      mmsi: null,        operator: "BW Group", flag: "Singapore", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2014, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "BW LENA",          imo: null,      mmsi: null,        operator: "BW Group", flag: "Singapore", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: 2015, typicalRoutes: ["West Africa → Europe via Atlantic", "Russia Baltic → Europe via Oresund"], typicalCargo: ["Bonny Light", "Urals"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // OCEAN TANKERS / VARIOUS OCEAN-NAMED VESSELS
  // Common VLCC naming convention — many operators use "OCEAN" prefix
  // ══════════════════════════════════════════════════════════════════════
  { name: "OCEAN NEPTUNE",    imo: null,      mmsi: null,        operator: "Various/Unknown", flag: "Unknown", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: null, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false, notes: "Common naming pattern. Multiple vessels may share similar names." },
  { name: "OCEAN RAIDER",     imo: "9341009", mmsi: "563751000", operator: "Pacific Basin/Various", flag: "Singapore", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2007, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Arab Medium"], sanctioned: false, shadowFleet: false },
  { name: "OCEAN COMEAU",     imo: null,      mmsi: "316001103", operator: "Pacific Basin/Various", flag: "Canada", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: null, typicalRoutes: ["USA Gulf → Europe via Atlantic", "West Africa → Europe via Atlantic"], typicalCargo: ["WTI", "Bonny Light"], sanctioned: false, shadowFleet: false },
  { name: "OCEAN NAVIGATOR",  imo: null,      mmsi: null,        operator: "Various", flag: "Unknown", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: null, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // NORDIC-NAMED VESSELS — Norwegian/Scandinavian operators
  // Common in North Sea, Baltic, Atlantic Basin routes
  // ══════════════════════════════════════════════════════════════════════
  { name: "NORDIC CAPACITY",  imo: null,      mmsi: null,        operator: "Nordic Tankers/Various", flag: "Denmark", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: null, typicalRoutes: ["Russia Baltic → Europe via Oresund", "North Sea → Global via English Channel"], typicalCargo: ["Urals", "Brent"], sanctioned: false, shadowFleet: false },
  { name: "NORDIC GALAXY",    imo: null,      mmsi: null,        operator: "Nordic Tankers/Various", flag: "Denmark", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: null, typicalRoutes: ["West Africa → Europe via Atlantic", "North Sea → Global via English Channel"], typicalCargo: ["Bonny Light", "Brent"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // PACIFIC-NAMED VESSELS — Common naming for Asia-Pacific operators
  // ══════════════════════════════════════════════════════════════════════
  { name: "PACIFIC HARMONY",  imo: null,      mmsi: "477996613", operator: "Pacific Basin/Various", flag: "Hong Kong", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: null, typicalRoutes: ["Russia ESPO → China/Japan", "Persian Gulf → China via Malacca"], typicalCargo: ["ESPO", "Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "PACIFIC FORCE",    imo: null,      mmsi: null,        operator: "Pacific Basin/Various", flag: "Singapore", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: null, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light", "Basrah Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // ATLANTIC-NAMED VESSELS
  // ══════════════════════════════════════════════════════════════════════
  { name: "ATLANTIC GRACE",   imo: null,      mmsi: null,        operator: "Various", flag: "Unknown", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: null, typicalRoutes: ["West Africa → Europe via Atlantic", "West Africa → USA East Coast"], typicalCargo: ["Bonny Light", "Cabinda"], sanctioned: false, shadowFleet: false },
  { name: "ATLANTIC VOYAGER", imo: null,      mmsi: null,        operator: "Various", flag: "Unknown", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: null, typicalRoutes: ["USA Gulf → Europe via Atlantic", "West Africa → Europe via Atlantic"], typicalCargo: ["WTI", "Bonny Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // TSAKOS ENERGY NAVIGATION (TEN) — Greek operator
  // 64 vessels including VLCCs, Suezmax, Aframax
  // ══════════════════════════════════════════════════════════════════════
  { name: "ARIS",             imo: null,      mmsi: null,        operator: "Tsakos Energy Navigation", flag: "Greece", vesselClass: "VLCC", dwt: 305000, draughtLoaded: 22.0, draughtBallast: 9.2, cargoBarrels: 2050000, yearBuilt: 2014, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Bonny Light"], sanctioned: false, shadowFleet: false },
  { name: "ATHENS",           imo: null,      mmsi: null,        operator: "Tsakos Energy Navigation", flag: "Greece", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: 2012, typicalRoutes: ["West Africa → Europe via Atlantic", "Persian Gulf → Europe via Suez"], typicalCargo: ["Bonny Light", "Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "ANDROMEDA",        imo: null,      mmsi: null,        operator: "Tsakos Energy Navigation", flag: "Greece", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2009, typicalRoutes: ["Black Sea → Mediterranean via Bosphorus", "Libya/Algeria → Europe via Mediterranean"], typicalCargo: ["Urals", "Es Sider"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // SHIPPING CORPORATION OF INDIA (SCI) — Indian state operator
  // Desh-named VLCCs. Primary importer for Indian refineries.
  // ══════════════════════════════════════════════════════════════════════
  { name: "DESH VIBHOR",      imo: null,      mmsi: null,        operator: "Shipping Corporation of India", flag: "India", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2007, typicalRoutes: ["Persian Gulf → India", "West Africa → India via Cape"], typicalCargo: ["Arab Light", "Basrah Light", "Bonny Light"], sanctioned: false, shadowFleet: false, notes: "Indian state VLCC. Dedicated India imports." },
  { name: "DESH UJAALA",      imo: null,      mmsi: null,        operator: "Shipping Corporation of India", flag: "India", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2008, typicalRoutes: ["Persian Gulf → India", "West Africa → India via Cape"], typicalCargo: ["Arab Light", "Bonny Light"], sanctioned: false, shadowFleet: false },
  { name: "DESH VAIBHAV",     imo: null,      mmsi: null,        operator: "Shipping Corporation of India", flag: "India", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2009, typicalRoutes: ["Persian Gulf → India"], typicalCargo: ["Arab Light", "Kuwait Export"], sanctioned: false, shadowFleet: false },
  { name: "DESH VIRAAT",      imo: null,      mmsi: null,        operator: "Shipping Corporation of India", flag: "India", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2010, typicalRoutes: ["Persian Gulf → India"], typicalCargo: ["Arab Light", "Basrah Light"], sanctioned: false, shadowFleet: false },
  { name: "DESH VISHAL",      imo: null,      mmsi: null,        operator: "Shipping Corporation of India", flag: "India", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2011, typicalRoutes: ["Persian Gulf → India", "West Africa → India via Cape"], typicalCargo: ["Arab Light", "Bonny Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // NITC (National Iranian Tanker Company) — SANCTIONED
  // Iranian state tanker company. All vessels sanctioned.
  // Primary route: Kharg Island → China via Malacca (shadow fleet)
  // AIS often off or spoofed. Ship-to-ship transfers common.
  // ══════════════════════════════════════════════════════════════════════
  { name: "MOUNTAIN",         imo: null,      mmsi: null,        operator: "NITC (Iran)", flag: "Iran/Various (frequently changed)", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: null, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Iran Light", "Iran Heavy"], sanctioned: true, sanctionRegimes: ["USA", "EU", "UK"], shadowFleet: true, notes: "NITC VLCC. AIS spoofing common. China primary destination." },
  { name: "STREAM",           imo: null,      mmsi: null,        operator: "NITC (Iran)", flag: "Iran/Various", vesselClass: "VLCC", dwt: 317534, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: null, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Iran Light", "Iran Heavy"], sanctioned: true, sanctionRegimes: ["USA", "EU", "UK"], shadowFleet: true, notes: "NITC VLCC. Known to carry Iranian crude from Kharg Island to China." },
  { name: "SERENA",           imo: null,      mmsi: null,        operator: "NITC (Iran)", flag: "Iran/Various", vesselClass: "VLCC", dwt: 317536, draughtLoaded: 22.0, draughtBallast: 9.5, cargoBarrels: 2150000, yearBuilt: null, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Iran Light"], sanctioned: true, sanctionRegimes: ["USA", "EU", "UK"], shadowFleet: true, notes: "NITC VLCC. Kharg Island → Dongjiakou (China) confirmed route." },
  { name: "CUMA",             imo: null,      mmsi: null,        operator: "NITC/Iran-linked", flag: "Various", vesselClass: "VLCC", dwt: 296068, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: null, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Iran Light", "Iran Heavy"], sanctioned: true, sanctionRegimes: ["USA"], shadowFleet: true, notes: "Left Persian Gulf fully laden after March 2026 Hormuz closure. Destination China." },

  // ══════════════════════════════════════════════════════════════════════
  // SOVCOMFLOT / RUSSIAN STATE VESSELS — SANCTIONED
  // Russian state shipping company. All sanctioned since 2022.
  // Baltic and Black Sea loading. Redirected from Europe to India/China.
  // ══════════════════════════════════════════════════════════════════════
  { name: "NS ARCTIC",        imo: null,      mmsi: null,        operator: "Sovcomflot (SCF)", flag: "Russia/Various", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: null, typicalRoutes: ["Russia Baltic → Europe via Oresund"], typicalCargo: ["Urals"], sanctioned: true, sanctionRegimes: ["USA", "EU", "UK"], shadowFleet: true, notes: "SCF Aframax. Urals from Primorsk/Ust-Luga." },
  { name: "NS CAPTAIN",       imo: null,      mmsi: null,        operator: "Sovcomflot (SCF)", flag: "Russia/Various", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: null, typicalRoutes: ["Russia Baltic → Europe via Oresund", "Black Sea → Mediterranean via Bosphorus"], typicalCargo: ["Urals"], sanctioned: true, sanctionRegimes: ["USA", "EU", "UK"], shadowFleet: true },
  { name: "PRIMORSKY PROSPECT", imo: null,    mmsi: null,        operator: "Sovcomflot (SCF)", flag: "Russia", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: null, typicalRoutes: ["Russia Baltic → Europe via Oresund"], typicalCargo: ["Urals"], sanctioned: true, sanctionRegimes: ["USA", "EU", "UK"], shadowFleet: true },

  // ══════════════════════════════════════════════════════════════════════
  // LUKOIL / LITASCO VESSELS — SANCTIONED
  // Russian oil company owned tankers/long-term charters
  // ══════════════════════════════════════════════════════════════════════
  { name: "ARCTIC",           imo: null,      mmsi: null,        operator: "Lukoil/Litasco", flag: "Various", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: null, typicalRoutes: ["Russia Baltic → Europe via Oresund", "Black Sea → Mediterranean via Bosphorus"], typicalCargo: ["Urals"], sanctioned: true, sanctionRegimes: ["EU", "UK"], shadowFleet: true },

  // ══════════════════════════════════════════════════════════════════════
  // SUEZMAX SPECIALISTS — Various operators
  // West Africa → Europe and Atlantic Basin routes
  // ══════════════════════════════════════════════════════════════════════
  { name: "MAERSK MIYAJIMA",  imo: null,      mmsi: null,        operator: "Maersk Tankers", flag: "Denmark", vesselClass: "Suezmax", dwt: 160000, draughtLoaded: 17.5, draughtBallast: 7.2, cargoBarrels: 1100000, yearBuilt: 2018, typicalRoutes: ["West Africa → Europe via Atlantic", "Persian Gulf → Europe via Suez"], typicalCargo: ["Bonny Light", "Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "MAERSK TANGGUH",   imo: null,      mmsi: null,        operator: "Maersk Tankers", flag: "Denmark", vesselClass: "Suezmax", dwt: 160000, draughtLoaded: 17.5, draughtBallast: 7.2, cargoBarrels: 1100000, yearBuilt: 2019, typicalRoutes: ["West Africa → Europe via Atlantic"], typicalCargo: ["Bonny Light", "Es Sider"], sanctioned: false, shadowFleet: false },
  { name: "SEAWAYS LANSING",  imo: null,      mmsi: null,        operator: "International Seaways", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2009, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Angolan grades"], sanctioned: false, shadowFleet: false },
  { name: "SEAWAYS OHIO",     imo: null,      mmsi: null,        operator: "International Seaways", flag: "Marshall Islands", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2010, typicalRoutes: ["Persian Gulf → China via Malacca"], typicalCargo: ["Arab Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // CASPIAN AND BLACK SEA SPECIALISTS
  // Aframax vessels — Bosphorus/Bab el-Mandeb route specialists
  // ══════════════════════════════════════════════════════════════════════
  { name: "STENA IMPERIAL",   imo: null,      mmsi: null,        operator: "Stena Tankers", flag: "Sweden", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2010, typicalRoutes: ["Black Sea → Mediterranean via Bosphorus", "Caspian → Mediterranean via Ceyhan"], typicalCargo: ["Urals", "CPC Blend", "Azeri Light"], sanctioned: false, shadowFleet: false },
  { name: "STENA PROGRESS",   imo: null,      mmsi: null,        operator: "Stena Tankers", flag: "Sweden", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2011, typicalRoutes: ["Black Sea → Mediterranean via Bosphorus", "Russia Baltic → Europe via Oresund"], typicalCargo: ["Urals", "CPC Blend"], sanctioned: false, shadowFleet: false },
  { name: "MINERVA HELEN",    imo: null,      mmsi: null,        operator: "Minerva Marine", flag: "Greece", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2008, typicalRoutes: ["Black Sea → Mediterranean via Bosphorus", "Libya/Algeria → Europe via Mediterranean"], typicalCargo: ["Urals", "Es Sider", "CPC Blend"], sanctioned: false, shadowFleet: false },
  { name: "MINERVA ROXANNE",  imo: null,      mmsi: null,        operator: "Minerva Marine", flag: "Greece", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2009, typicalRoutes: ["Black Sea → Mediterranean via Bosphorus", "Caspian → Mediterranean via Ceyhan"], typicalCargo: ["Urals", "Azeri Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // US GULF SPECIALISTS
  // Aframax vessels operating US Gulf → Atlantic routes
  // ══════════════════════════════════════════════════════════════════════
  { name: "OVERSEAS HOUSTON", imo: null,      mmsi: null,        operator: "Overseas Shipholding Group (OSG)", flag: "USA", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2014, typicalRoutes: ["USA Gulf → Europe via Atlantic", "USA Gulf → Asia via Panama"], typicalCargo: ["WTI", "Mars Blend"], sanctioned: false, shadowFleet: false },
  { name: "OVERSEAS PORTLAND",imo: null,      mmsi: null,        operator: "Overseas Shipholding Group (OSG)", flag: "USA", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: 2015, typicalRoutes: ["USA Gulf → Europe via Atlantic"], typicalCargo: ["WTI", "Eagle Ford Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // GREEK INDEPENDENT OPERATORS
  // Multiple Greek family-owned fleets — significant global presence
  // ══════════════════════════════════════════════════════════════════════
  { name: "GEORGY",           imo: null,      mmsi: null,        operator: "Greek Independent", flag: "Greece", vesselClass: "VLCC", dwt: 298000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: null, typicalRoutes: ["Persian Gulf → China via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Angolan grades"], sanctioned: false, shadowFleet: false },
  { name: "ALEXANDROS",       imo: null,      mmsi: null,        operator: "Greek Independent", flag: "Greece", vesselClass: "Suezmax", dwt: 157000, draughtLoaded: 17.0, draughtBallast: 7.0, cargoBarrels: 1050000, yearBuilt: null, typicalRoutes: ["West Africa → Europe via Atlantic", "Persian Gulf → Europe via Suez"], typicalCargo: ["Bonny Light", "Arab Light"], sanctioned: false, shadowFleet: false },
  { name: "KONSTANTINOS",     imo: null,      mmsi: null,        operator: "Greek Independent", flag: "Greece", vesselClass: "Aframax", dwt: 115000, draughtLoaded: 14.5, draughtBallast: 6.5, cargoBarrels: 800000, yearBuilt: null, typicalRoutes: ["Libya/Algeria → Europe via Mediterranean", "Black Sea → Mediterranean via Bosphorus"], typicalCargo: ["Es Sider", "Urals"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // JAPANESE OPERATORS — MOL, NYK, K-Line, Idemitsu
  // Long-term charters for Japanese refineries (ENEOS, Cosmo, Idemitsu)
  // ══════════════════════════════════════════════════════════════════════
  { name: "GENKAI",           imo: null,      mmsi: null,        operator: "Mitsui OSK Lines (MOL)", flag: "Japan", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2010, typicalRoutes: ["Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Kuwait Export", "Murban"], sanctioned: false, shadowFleet: false, notes: "Long-term charter for Japanese refinery supply." },
  { name: "KURE",             imo: null,      mmsi: null,        operator: "Mitsui OSK Lines (MOL)", flag: "Japan", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2011, typicalRoutes: ["Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Basrah Light"], sanctioned: false, shadowFleet: false },
  { name: "OLYMPIC ZEUS",     imo: null,      mmsi: null,        operator: "NYK Line", flag: "Japan", vesselClass: "VLCC", dwt: 299000, draughtLoaded: 21.8, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2012, typicalRoutes: ["Persian Gulf → Japan/Korea via Malacca", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Kuwait Export"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // KOREAN OPERATORS — SK Shipping, HMM, Korea Line
  // Long-term charters for Korean refineries (SK Innovation, S-Oil, GS Caltex)
  // ══════════════════════════════════════════════════════════════════════
  { name: "SKS TRINITY",      imo: null,      mmsi: null,        operator: "SK Shipping", flag: "South Korea", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2013, typicalRoutes: ["Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Kuwait Export", "Murban"], sanctioned: false, shadowFleet: false },
  { name: "SKS MERSEY",       imo: null,      mmsi: null,        operator: "SK Shipping", flag: "South Korea", vesselClass: "VLCC", dwt: 300000, draughtLoaded: 22.0, draughtBallast: 9.0, cargoBarrels: 2000000, yearBuilt: 2014, typicalRoutes: ["Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Basrah Light"], sanctioned: false, shadowFleet: false },

  // ══════════════════════════════════════════════════════════════════════
  // SHELL TANKERS — TI Pool / Shell chartered VLCCs
  // Shell operates some of world's largest VLCCs through TI tankers pool
  // ══════════════════════════════════════════════════════════════════════
  { name: "TI AFRICA",        imo: "9246018", mmsi: null,        operator: "TI Tankers/Shell", flag: "Belgium", vesselClass: "VLCC", dwt: 441561, draughtLoaded: 24.5, draughtBallast: 10.5, cargoBarrels: 3000000, yearBuilt: 2002, typicalRoutes: ["Persian Gulf → USA via Cape", "West Africa → China via Cape"], typicalCargo: ["Arab Light", "Arab Heavy"], sanctioned: false, shadowFleet: false, notes: "V-Plus ULCC. Shell chartered. One of world's largest tankers." },
  { name: "TI ASIA",          imo: "9246006", mmsi: null,        operator: "TI Tankers/Shell", flag: "Belgium", vesselClass: "VLCC", dwt: 441561, draughtLoaded: 24.5, draughtBallast: 10.5, cargoBarrels: 3000000, yearBuilt: 2002, typicalRoutes: ["Persian Gulf → China via Malacca", "Persian Gulf → Japan/Korea via Malacca"], typicalCargo: ["Arab Light", "Arab Medium"], sanctioned: false, shadowFleet: false, notes: "V-Plus ULCC. Shell chartered." },

];

// ══════════════════════════════════════════════════════════════════════════
// OPERATOR PROFILES
// Used to understand fleet characteristics when matching vessel names
// ══════════════════════════════════════════════════════════════════════════

const OPERATOR_PROFILES = {
  "DHT Holdings": {
    hq: "Hamilton, Bermuda",
    management: "Monaco, Norway, Singapore, India",
    fleetSize: 24,
    vesselClasses: ["VLCC"],
    namingConvention: "DHT + animal name (Tiger, Lion, Jaguar, Puma, etc.)",
    typicalCharterers: ["Saudi Aramco", "BP", "Shell", "Vitol", "Trafigura"],
    primaryRoutes: ["Persian Gulf → Asia", "West Africa → Asia", "Atlantic Basin"],
    sanctioned: false,
  },
  "Bahri": {
    hq: "Riyadh, Saudi Arabia",
    management: "Saudi Arabia",
    fleetSize: 42,
    vesselClasses: ["VLCC"],
    namingConvention: "Arabic names, Saudi city/landmark names",
    typicalCharterers: ["Saudi Aramco (primary)", "Saudi Aramco Trading"],
    primaryRoutes: ["Persian Gulf → Asia", "Persian Gulf → USA via Cape"],
    sanctioned: false,
    notes: "Saudi Aramco owns 20%. Dedicated Aramco crude carrier.",
  },
  "NITC": {
    hq: "Tehran, Iran",
    management: "Iran",
    fleetSize: 50,
    vesselClasses: ["VLCC", "Suezmax"],
    namingConvention: "Persian/geographic names",
    typicalCharterers: ["NIOC (National Iranian Oil Company)"],
    primaryRoutes: ["Persian Gulf → China via Malacca (shadow)"],
    sanctioned: true,
    shadowFleet: true,
    notes: "All vessels sanctioned. AIS spoofing standard practice. China only real market.",
  },
  "Sovcomflot": {
    hq: "Moscow, Russia",
    management: "Russia",
    fleetSize: 60,
    vesselClasses: ["VLCC", "Suezmax", "Aframax"],
    namingConvention: "NS prefix + geographic/historic names",
    typicalCharterers: ["Rosneft", "Lukoil", "Gazprom Neft"],
    primaryRoutes: ["Russia Baltic → Asia (post-2022)", "Russia ESPO → China/Japan"],
    sanctioned: true,
    shadowFleet: true,
    notes: "All vessels sanctioned post-2022. Primary shadow fleet operator.",
  },
  "Nordic American Tankers": {
    hq: "Hamilton, Bermuda",
    management: "Norway",
    fleetSize: 24,
    vesselClasses: ["Suezmax"],
    namingConvention: "Nordic + noun (Nordic Luna, Nordic Apollo, Nordic Sky)",
    typicalCharterers: ["Vitol", "Trafigura", "Shell", "BP"],
    primaryRoutes: ["West Africa → Europe", "West Africa → USA East Coast"],
    sanctioned: false,
  },
};

// ══════════════════════════════════════════════════════════════════════════
// VESSEL NAME PATTERN MATCHING
// When a vessel name doesn't match exactly, use patterns to infer operator
// ══════════════════════════════════════════════════════════════════════════

const NAME_PATTERNS = [
  { pattern: /^DHT\s/i,              operator: "DHT Holdings",        vesselClass: "VLCC",    confidence: 0.95 },
  { pattern: /^NORDIC\s/i,           operator: "Nordic American Tankers", vesselClass: "Suezmax", confidence: 0.75, notes: "Could also be Teekay or other Nordic operators" },
  { pattern: /^FRONT\s/i,            operator: "Frontline",           vesselClass: "VLCC",    confidence: 0.85 },
  { pattern: /^FRONTLINE\s/i,        operator: "Frontline",           vesselClass: "VLCC",    confidence: 0.95 },
  { pattern: /^PACIFIC\s/i,          operator: "Various Pacific Basin",vesselClass: "VLCC",    confidence: 0.60 },
  { pattern: /^OCEAN\s/i,            operator: "Various",             vesselClass: "VLCC",    confidence: 0.50 },
  { pattern: /^ATLANTIC\s/i,         operator: "Various Atlantic",    vesselClass: "Suezmax", confidence: 0.55 },
  { pattern: /^MARAN\s/i,            operator: "Maran Tankers",       vesselClass: "VLCC",    confidence: 0.95 },
  { pattern: /^MAERSK\s/i,           operator: "Maersk Tankers",      vesselClass: "Suezmax", confidence: 0.90 },
  { pattern: /^STENA\s/i,            operator: "Stena Tankers",       vesselClass: "Aframax", confidence: 0.90 },
  { pattern: /^MINERVA\s/i,          operator: "Minerva Marine",      vesselClass: "Aframax", confidence: 0.90 },
  { pattern: /^OVERSEAS\s/i,         operator: "OSG",                 vesselClass: "Aframax", confidence: 0.85 },
  { pattern: /^BW\s/i,               operator: "BW Group",            vesselClass: "VLCC",    confidence: 0.85 },
  { pattern: /^SEAWAYS\s/i,          operator: "International Seaways",vesselClass: "VLCC",   confidence: 0.90 },
  { pattern: /^SKS\s/i,              operator: "SK Shipping",         vesselClass: "VLCC",    confidence: 0.90 },
  { pattern: /^TI\s/i,               operator: "TI Tankers/Shell",    vesselClass: "VLCC",    confidence: 0.80 },
  { pattern: /^NS\s/i,               operator: "Sovcomflot (SCF)",    vesselClass: "Aframax", confidence: 0.75, sanctioned: true },
  { pattern: /^DESH\s/i,             operator: "Shipping Corp of India",vesselClass: "VLCC",  confidence: 0.95 },
  { pattern: /^CHEM\s/i,             operator: "China Merchants",     vesselClass: "VLCC",    confidence: 0.85 },
  { pattern: /VLCC/i,                operator: "Various",             vesselClass: "VLCC",    confidence: 0.90, notes: "Vessel name contains VLCC — almost certainly a VLCC" },
  { pattern: /SUEZMAX/i,             operator: "Various",             vesselClass: "Suezmax", confidence: 0.90 },
  { pattern: /AFRAMAX/i,             operator: "Various",             vesselClass: "Aframax", confidence: 0.90 },
];

// ══════════════════════════════════════════════════════════════════════════
// LOOKUP FUNCTIONS
// Used by the voyage monitor to match vessels
// ══════════════════════════════════════════════════════════════════════════

function lookupVesselByMMSI(mmsi) {
  return KNOWN_VESSELS.find(v => v.mmsi === String(mmsi)) || null;
}

function lookupVesselByName(name) {
  if (!name) return null;
  const upper = name.trim().toUpperCase();
  // Exact match first
  const exact = KNOWN_VESSELS.find(v => v.name.toUpperCase() === upper);
  if (exact) return exact;
  // Partial match
  const partial = KNOWN_VESSELS.find(v => upper.includes(v.name.toUpperCase()) || v.name.toUpperCase().includes(upper));
  return partial || null;
}

function inferVesselFromName(name) {
  if (!name) return null;
  for (const pattern of NAME_PATTERNS) {
    if (pattern.pattern.test(name)) {
      return {
        name,
        operator: pattern.operator,
        vesselClass: pattern.vesselClass,
        confidence: pattern.confidence,
        sanctioned: pattern.sanctioned || false,
        shadowFleet: pattern.sanctioned || false,
        notes: pattern.notes || `Inferred from name pattern: ${pattern.pattern}`,
        inferred: true,
      };
    }
  }
  return null;
}

function getVesselIntelligence(name, mmsi) {
  // Try MMSI first (most accurate)
  if (mmsi) {
    const byMMSI = lookupVesselByMMSI(mmsi);
    if (byMMSI) return { ...byMMSI, matchType: 'mmsi', matchConfidence: 1.0 };
  }
  // Try exact name match
  if (name) {
    const byName = lookupVesselByName(name);
    if (byName) return { ...byName, matchType: 'name', matchConfidence: 0.95 };
    // Try pattern inference
    const inferred = inferVesselFromName(name);
    if (inferred) return { ...inferred, matchType: 'pattern', matchConfidence: inferred.confidence };
  }
  return null;
}

module.exports = {
  KNOWN_VESSELS,
  OPERATOR_PROFILES,
  NAME_PATTERNS,
  lookupVesselByMMSI,
  lookupVesselByName,
  inferVesselFromName,
  getVesselIntelligence,
};
