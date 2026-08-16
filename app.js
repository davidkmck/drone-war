// Initialize Leaflet map with Satellite Imagery & Zoom Locks
const initialCoords = [45.8150, 15.9819]; 
const map = L.map('map', {
  center: initialCoords,
  zoom: 13,
  minZoom: 3,         // Prevents zooming out beyond the full world map
  maxZoom: 18,        // Max satellite resolution
  maxBounds: [       // Locks panning strictly to valid geographical coordinates
    [-90, -180],
    [90, 180]
  ],
  maxBoundsViscosity: 1.0, // Hard boundary lock (prevents rubber-banding off the map)
  zoomControl: false
});

// Esri World Imagery (Satellite Layer)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri',
  maxZoom: 18
}).addTo(map);

// Secondary Overlay Layer for Borders & City Labels
const bordersAndLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Labels &copy; Esri',
  maxZoom: 18,
  pane: 'overlayPane' // Ensures labels render above the satellite layer
}).addTo(map);

// Layer group to hold strategic landmark markers
const militaryLandmarksGroup = L.layerGroup().addTo(map);


const hexLayerGroup = L.layerGroup().addTo(map);
const unitLayerGroup = L.layerGroup().addTo(map);
const H3_RESOLUTION = 8; // Hexagon resolution scale (~0.7 km² area per hex)

// State Tracking Variables
let activeBoardState = {}; 
let selectedUnitHex = null;
let validMoveHighlights = [];
let currentTargetHex = null;

// Dynamic H3 Resolution Scale based on Map Zoom
function getH3Resolution(zoom) {
  if (zoom >= 14) return 8; // Tactical detail (~0.7 km² per hex)
  if (zoom >= 12) return 7; // Medium scale (~5 km² per hex)
  if (zoom >= 9)  return 6; // Regional scale (~36 km² per hex)
  if (zoom >= 7)  return 5; // Strategic scale (~250 km² per hex)
  return 4;                 // Global/Theater view (~1,700 km² per hex)
}

// Fetch Airfields & Military Bases strictly for Ukraine & Russia from Overpass API
async function loadStrategicLandmarks() {
  if (map.getZoom() < 6) {
    militaryLandmarksGroup.clearLayers();
    return; 
  }

  const bounds = map.getBounds();
  const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

  // Overpass Query filtered strictly by Ukraine (UA) and Russia (RU) national boundaries
  const query = `
    [out:json][timeout:12];
    area["ISO3166-1"="UA"]->.ua;
    area["ISO3166-1"="RU"]->.ru;
    (
      node["military"~"airfield|base|installation|barracks|air_base"](${bbox})(area.ua);
      way["military"~"airfield|base|installation|barracks|air_base"](${bbox})(area.ua);
      node["aeroway"~"aerodrome|helipad|airfield"](${bbox})(area.ua);
      way["aeroway"~"aerodrome|helipad|airfield"](${bbox})(area.ua);

      node["military"~"airfield|base|installation|barracks|air_base"](${bbox})(area.ru);
      way["military"~"airfield|base|installation|barracks|air_base"](${bbox})(area.ru);
      node["aeroway"~"aerodrome|helipad|airfield"](${bbox})(area.ru);
      way["aeroway"~"aerodrome|helipad|airfield"](${bbox})(area.ru);
    );
    out center tags;
  `;

  const OVERPASS_ENDPOINTS = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter'
  ];

  let data = null;

  for (const url of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        data = await res.json();
        break;
      }
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn(`Endpoint ${url} failed or timed out, switching...`);
    }
  }

  if (!data || !data.elements) {
    console.warn("Could not retrieve regional landmark data.");
    return;
  }

  // Clear previous markers only AFTER receiving valid filtered data
  militaryLandmarksGroup.clearLayers();

  console.log(`Loaded ${data.elements.length} military/aviation landmarks in UA/RU.`);

  data.elements.forEach(elem => {
    const lat = elem.lat || (elem.center && elem.center.lat);
    const lon = elem.lon || (elem.center && elem.center.lon);
    if (!lat || !lon) return;

    const tags = elem.tags || {};
    const name = tags.name || tags['name:en'] || tags.military || tags.aeroway || 'Strategic Site';
    const isAirfield = tags.aeroway === 'aerodrome' || tags.aeroway === 'helipad' || tags.military === 'airfield' || tags.military === 'air_base';

    const icon = L.divIcon({
      className: 'landmark-marker',
      html: isAirfield ? '🛫' : '🪖',
      iconSize: [24, 24]
    });

    const marker = L.marker([lat, lon], { icon }).bindTooltip(name, { 
      permanent: false, 
      direction: 'top' 
    });

    militaryLandmarksGroup.addLayer(marker);
  });
}

// Render Map Grid Overlay
function renderHexGrid() {
  hexLayerGroup.clearLayers();

  const currentZoom = map.getZoom();
  const H3_RESOLUTION = getH3Resolution(currentZoom);
  
  const bounds = map.getBounds();
  const bboxPolygon = [
    [bounds.getSouth(), bounds.getWest()],
    [bounds.getNorth(), bounds.getWest()],
    [bounds.getNorth(), bounds.getEast()],
    [bounds.getSouth(), bounds.getEast()]
  ];

// Retrieve scaled hexes for viewport
  const hexes = h3.polygonToCells(bboxPolygon, H3_RESOLUTION);

  // Performance Guard: Skip rendering if zoomed out too far with too many cells
  if (hexes.length > 600) return;

  hexes.forEach(hexIndex => {
    const boundary = h3.cellToBoundary(hexIndex);
    
    const polygon = L.polygon(boundary, {
      color: 'rgba(255, 255, 255, 0.35)',
      weight: 1,
      fillColor: 'transparent',
      fillOpacity: 0.1
    });

    // Attach hex index directly to layer for highlighting
    polygon.hexIndex = hexIndex;

    // Tap/Click Interaction Logic
    polygon.on('click', async function() {
      const currentHex = hexIndex;

      // 1. Execute Movement if destination hex was tapped
      if (selectedUnitHex && validMoveHighlights.includes(currentHex)) {
        moveUnit(selectedUnitHex, currentHex);
        selectedUnitHex = null;
        clearHighlights();
        resetMenus();
        renderBoardUnits();
        return;
      }

      // 2. Select Unit if present on hex
      const hexData = activeBoardState[currentHex];
      if (hexData && hexData.units && hexData.units.length > 0) {
        const unit = hexData.units[hexData.units.length - 1]; // Top unit
        selectedUnitHex = currentHex;
        
        const unitStats = UNIT_TYPES[unit.type] || UNIT_TYPES.INFANTRY;
        highlightValidMoves(currentHex, unitStats.moveRange);

        document.getElementById('selected-hex').innerHTML = `
          <strong>Selected:</strong> ${unitStats.name} ${unitStats.icon}<br/>
          <strong>HP:</strong> ${unit.hp} | <strong>Ammo:</strong> ${unit.ammo}<br/>
          <em>Tap highlighted hex to move</em>
        `;

        showActionPanel(currentHex);
        return;
      }

      // 3. Inspect Open Hex & Fetch Terrain
      selectedUnitHex = null;
      clearHighlights();
      polygon.setStyle({ fillColor: '#38bdf8', fillOpacity: 0.4 });
      
      document.getElementById('selected-hex').innerText = `${currentHex.substring(0, 8)}... (Analyzing...)`;
      
      const [lat, lng] = h3.cellToLatLng(currentHex);
      const terrain = await classifyHexTerrain(lat, lng);
      
      document.getElementById('selected-hex').innerHTML = `
        <strong>Hex:</strong> ${currentHex.substring(0, 8)}...<br/>
        <strong>Terrain:</strong> ${terrain.name}<br/>
        <strong>Move Cost:</strong> ${terrain.moveCost} | <strong>Defense:</strong> +${terrain.defBonus * 100}%
      `;

      showActionPanel(currentHex);
    });

    hexLayerGroup.addLayer(polygon);
  });

  renderBoardUnits();
}

// Draw Unit Icons on Map
function renderBoardUnits() {
  unitLayerGroup.clearLayers();

  Object.keys(activeBoardState).forEach(hexIndex => {
    const hexData = activeBoardState[hexIndex];
    if (hexData.units && hexData.units.length > 0) {
      const topUnit = hexData.units[hexData.units.length - 1];
      const unitStats = UNIT_TYPES[topUnit.type] || { icon: '❓' };
      const [lat, lng] = h3.cellToLatLng(hexIndex);

      const icon = L.divIcon({
        className: 'unit-marker',
        html: unitStats.icon,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lat, lng], { icon: icon, interactive: false });
      unitLayerGroup.addLayer(marker);
    }
  });
}

// Move Unit Execution
function moveUnit(fromHex, toHex) {
  if (!activeBoardState[fromHex] || !activeBoardState[fromHex].units.length) return;

  const unit = activeBoardState[fromHex].units.pop();
  unit.hasMoved = true;

  if (!activeBoardState[toHex]) {
    activeBoardState[toHex] = { terrain: 'Plains', owner: unit.owner, units: [] };
  }

  activeBoardState[toHex].units.push(unit);
}

// Highlight Movement Targets
function highlightValidMoves(originHex, moveRange) {
  clearHighlights();
  validMoveHighlights = getValidMoves(originHex, moveRange, activeBoardState);

  hexLayerGroup.eachLayer(layer => {
    if (validMoveHighlights.includes(layer.hexIndex)) {
      layer.setStyle({ fillColor: '#22c55e', fillOpacity: 0.4 });
    }
  });
}

function clearHighlights() {
  hexLayerGroup.eachLayer(layer => {
    layer.setStyle({ fillColor: 'transparent', fillOpacity: 0.1 });
  });
}

// UI Menu Handlers
function showActionPanel(hexIndex) {
  currentTargetHex = hexIndex;
  resetMenus();
  document.getElementById('action-panel').classList.remove('hidden');
}

function resetMenus() {
  document.getElementById('action-panel').classList.add('hidden');
  document.getElementById('deploy-menu').classList.add('hidden');
  document.getElementById('strike-menu').classList.add('hidden');
}

function showDeployMenu() {
  document.getElementById('action-panel').classList.add('hidden');
  document.getElementById('deploy-menu').classList.remove('hidden');
}

function showStrikeMenu() {
  document.getElementById('action-panel').classList.add('hidden');
  document.getElementById('strike-menu').classList.remove('hidden');
}

// Deploy Unit Action
function executeDeploy(unitKey) {
  if (!currentTargetHex) return;

  spawnUnit(currentTargetHex, unitKey, 'Player_1', activeBoardState);
  alert(`Deployed ${unitKey} to hex ${currentTargetHex.substring(0, 8)}...`);
  
  resetMenus();
  renderBoardUnits();
}

// Execute Long-Range Strike
function executeStrike(weaponType) {
  if (!currentTargetHex) return;

  const targetHexData = activeBoardState[currentTargetHex];
  
  if (targetHexData && targetHexData.units && targetHexData.units.length > 0) {
    const destroyedUnit = targetHexData.units.pop();
    alert(`💥 STRIKE CONFIRMED! ${weaponType} destroyed ${destroyedUnit.type} on target hex.`);
  } else {
    alert(`🚀 ${weaponType} struck hex ${currentTargetHex.substring(0, 8)}... No units detected.`);
  }

  resetMenus();
  renderBoardUnits();
}


// Map Event Listeners
map.on('moveend', () => {
  renderHexGrid();
  loadStrategicLandmarks();
});

// Initial load executions
renderHexGrid();
loadStrategicLandmarks();


// Toggle handler for HTML checkbox controls
function toggleLayer(layerType) {
  if (layerType === 'borders') {
    map.hasLayer(bordersAndLabels) ? map.removeLayer(bordersAndLabels) : map.addLayer(bordersAndLabels);
  } else if (layerType === 'military') {
    map.hasLayer(militaryLandmarksGroup) ? map.removeLayer(militaryLandmarksGroup) : map.addLayer(militaryLandmarksGroup);
  }
}

window.toggleLayer = toggleLayer;

// Expose UI handlers globally for inline HTML onclick attributes
window.showActionPanel = showActionPanel;
window.resetMenus = resetMenus;
window.showDeployMenu = showDeployMenu;
window.showStrikeMenu = showStrikeMenu;
window.executeDeploy = executeDeploy;
window.executeStrike = executeStrike;

