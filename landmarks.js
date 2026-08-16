// Master Strategic Landmarks Dataset (Ukraine, Crimea & Western Russia)
const STRATEGIC_LANDMARKS = [
  // ================= UKRAINE =================
  // Civilian & Military Airfields
  { name: "Kyiv / Sikorsky International Airport (IEV)", lat: 50.4017, lon: 30.4519, type: "airfield" },
  { name: "Boryspil International Airport (KBP)", lat: 50.3450, lon: 30.8947, type: "airfield" },
  { name: "Gostomel / Antonov Airport (GML)", lat: 50.5861, lon: 30.1914, type: "airfield" },
  { name: "Vasylkiv Air Base", lat: 50.2342, lon: 30.3039, type: "airfield" },
  { name: "Odesa International Airport (ODS)", lat: 46.4268, lon: 30.6765, type: "airfield" },
  { name: "Starokostiantyniv Air Base", lat: 49.7483, lon: 27.4811, type: "airfield" },
  { name: "Mykolaiv International Airport / Air Base", lat: 46.9361, lon: 31.9197, type: "airfield" },
  { name: "Kulbakino Air Base (Mykolaiv)", lat: 46.9364, lon: 32.0983, type: "airfield" },
  { name: "Dnipro International Airport (DNK)", lat: 48.3572, lon: 35.1006, type: "airfield" },
  { name: "Lviv Danylo Halytskyi Airport (LWO)", lat: 49.8125, lon: 23.9561, type: "airfield" },
  { name: "Kharkiv International Airport (HRK)", lat: 49.9247, lon: 36.2900, type: "airfield" },
  { name: "Chuguyev Air Base (Kharkiv)", lat: 49.8378, lon: 36.6433, type: "airfield" },
  { name: "Chornobaivka / Kherson Airport (KHE)", lat: 46.6739, lon: 32.5064, type: "airfield" },
  { name: "Melitopol Air Base", lat: 46.8800, lon: 35.3050, type: "airfield" },
  { name: "Ozerne Air Base (Zhytomyr)", lat: 50.1583, lon: 28.7383, type: "airfield" },
  { name: "Mirgorod Air Base", lat: 49.9328, lon: 33.6419, type: "airfield" },
  { name: "Kanatovo Air Base (Kropyvnytskyi)", lat: 48.5600, lon: 32.3833, type: "airfield" },
  { name: "Ivano-Frankivsk Airport / Air Base", lat: 48.8842, lon: 24.6861, type: "airfield" },
  { name: "Lutsk Air Base", lat: 50.7917, lon: 25.3475, type: "airfield" },
  { name: "Zaporizhzhia International Airport", lat: 47.8672, lon: 35.3150, type: "airfield" },

  // Intelligence & Security Services Facilities
  { name: "SBU Headquarters (Kyiv)", lat: 50.4508, lon: 30.5156, type: "intel" },
  { name: "HUR Defense Intelligence HQ (Kyiv)", lat: 50.4722, lon: 30.5283, type: "intel" },
  { name: "Foreign Intelligence Service HQ (Lisnyky)", lat: 50.3125, lon: 30.5220, type: "intel" },
  { name: "SBU Regional HQ (Kharkiv)", lat: 50.0042, lon: 36.2336, type: "intel" },
  { name: "SBU Regional HQ (Odesa)", lat: 46.4803, lon: 30.7303, type: "intel" },
  { name: "National Guard Center (Novi Petrivtsi)", lat: 50.6225, lon: 30.4489, type: "security" },
  { name: "State Border Guard Service HQ (Kyiv)", lat: 50.4533, lon: 30.5186, type: "security" },

  // ================= CRIMEA =================
  { name: "Belbek Air Base (Sevastopol)", lat: 44.6914, lon: 33.5739, type: "airfield" },
  { name: "Saky Air Base (Novofedorivka)", lat: 45.0922, lon: 33.5908, type: "airfield" },
  { name: "Dzhankoi Air Base", lat: 45.7008, lon: 34.4189, type: "airfield" },
  { name: "Gvardeyskoye Air Base", lat: 45.1161, lon: 33.9767, type: "airfield" },
  { name: "Kacha Air Base", lat: 44.7797, lon: 33.5714, type: "airfield" },
  { name: "Simferopol International Airport", lat: 45.0522, lon: 33.9753, type: "airfield" },

  // ================= WESTERN RUSSIA =================
  // Civilian & Military Airfields
  { name: "Engels-2 Strategic Airbase", lat: 51.4812, lon: 46.2132, type: "airfield" },
  { name: "Dyagilevo Strategic Air Base (Ryazan)", lat: 54.6464, lon: 39.5714, type: "airfield" },
  { name: "Seshcha Air Base (Bryansk)", lat: 53.7125, lon: 33.3442, type: "airfield" },
  { name: "Shatalovo Air Base (Smolensk)", lat: 54.3375, lon: 32.4744, type: "airfield" },
  { name: "Millerovo Air Base (Rostov)", lat: 48.9536, lon: 40.3014, type: "airfield" },
  { name: "Yeysk Naval Air Base (Krasnodar)", lat: 46.6800, lon: 38.2511, type: "airfield" },
  { name: "Kursk Vostochny Air Base / Airport", lat: 51.7514, lon: 36.2956, type: "airfield" },
  { name: "Voronezh Malshevo Air Base (Baltimor)", lat: 51.6236, lon: 39.1528, type: "airfield" },
  { name: "Morozovsk Air Base (Rostov)", lat: 48.3128, lon: 41.7897, type: "airfield" },
  { name: "Krymsk Air Base", lat: 44.9628, lon: 37.9803, type: "airfield" },
  { name: "Armavir Air Base", lat: 44.9786, lon: 41.1114, type: "airfield" },
  { name: "Taganrog-Central Air Base", lat: 47.2008, lon: 38.8475, type: "airfield" },
  { name: "Belgorod International Airport / Base", lat: 50.6439, lon: 36.5900, type: "airfield" },
  { name: "Shagol / Chelyabinsk Air Base", lat: 55.2536, lon: 61.3386, type: "airfield" },

  // Intelligence & Security Facilities
  { name: "FSB Regional Directorate (Belgorod)", lat: 50.5975, lon: 36.5882, type: "intel" },
  { name: "FSB Border Guard Center (Bryansk)", lat: 53.2435, lon: 34.3636, type: "intel" },
  { name: "FSB Regional Directorate (Kursk)", lat: 51.7303, lon: 36.1925, type: "intel" },
  { name: "FSB Directorate (Rostov-on-Don)", lat: 47.2225, lon: 39.7150, type: "intel" },
  { name: "Rosgvardiya Southern District HQ (Rostov)", lat: 47.2357, lon: 39.7015, type: "security" },
  { name: "Rosgvardiya Center (Voronezh)", lat: 51.6617, lon: 39.2003, type: "security" },
  { name: "GRU 22nd Spetsnaz Brigade Base (Stepnoy)", lat: 47.3072, lon: 39.8731, type: "military" },
  { name: "GRU 10th Spetsnaz Brigade Base (Molkino)", lat: 44.6292, lon: 39.1350, type: "military" }
];
