// Initialize Leaflet map with Satellite Imagery
const initialCoords = [45.8150, 15.9819]; // Default coordinates (Zagreb / European terrain)
const map = L.map('map', {
  center: initialCoords,
  zoom: 13,
  zoomControl: false // Minimalist UI optimized for mobile touch inputs
});

// Esri World Imagery (Satellite Layer)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri',
  maxZoom: 18
}).addTo(map);

const hexLayerGroup = L.layerGroup().addTo(map);
const H3_RESOLUTION = 8; // Hexagon resolution scale (~0.7 km² area per hex)

// State tracking variables
let activeBoardState = {}; // Loaded from state.json or local memory
let selectedUnitHex = null;
let validMoveHighlights = [];

// Highlight reachable hexes for selected unit
function highlightValidMoves(originHex, moveRange) {
  clearHighlights();

  validMoveHighlights = getValidMoves(originHex, moveRange, activeBoardState);

  hexLayerGroup.eachLayer(layer => {
    if (validMoveHighlights.includes(layer.hexIndex)) {
      layer.setStyle({ fillColor: '#22c55e', fillOpacity: 0.4 }); // Green overlay for valid moves
    }
  });
}

function clearHighlights() {
  hexLayerGroup.eachLayer(layer => {
    layer.setStyle({ fillColor: 'transparent', fillOpacity: 0.1 });
  });
}

// Updated Polygon Click Listener in app.js
polygon.on('click', async function() {
  const currentHex = hexIndex;

  // 1. If tapping a highlighted move destination for a selected unit:
  if (selectedUnitHex && validMoveHighlights.includes(currentHex)) {
    moveUnit(selectedUnitHex, currentHex);
    selectedUnitHex = null;
    clearHighlights();
    renderBoardUnits();
    return;
  }

  // 2. Select unit present on tapped hex
  const hexData = activeBoardState[currentHex];
  if (hexData && hexData.units && hexData.units.length > 0) {
    const unit = hexData.units[0];
    selectedUnitHex = currentHex;
    
    // Get unit movement range stats
    const unitStats = UNIT_TYPES[unit.type] || UNIT_TYPES.INFANTRY;
    highlightValidMoves(currentHex, unitStats.moveRange);

    document.getElementById('selected-hex').innerHTML = `
      <strong>Selected:</strong> ${unitStats.name} ${unitStats.icon}<br/>
      <strong>HP:</strong> ${unit.hp} | <strong>Ammo:</strong> ${unit.ammo}<br/>
      <em>Tap green hex to move</em>
    `;
    return;
  }

  // 3. Fallback: Normal hex inspection & terrain lookup
  selectedUnitHex = null;
  clearHighlights();
  polygon.setStyle({ fillColor: '#38bdf8', fillOpacity: 0.4 });
  
  const [lat, lng] = h3.cellToLatLng(currentHex);
  const terrain = await classifyHexTerrain(lat, lng);
  
  document.getElementById('selected-hex').innerHTML = `
    <strong>Hex:</strong> ${currentHex.substring(0, 8)}...<br/>
    <strong>Terrain:</strong> ${terrain.name}<br/>
    <strong>Move Cost:</strong> ${terrain.moveCost}
  `;
});

// Move unit from source to destination hex
function moveUnit(fromHex, toHex) {
  if (!activeBoardState[fromHex] || !activeBoardState[fromHex].units.length) return;

  const unit = activeBoardState[fromHex].units.pop();
  unit.hasMoved = true;

  if (!activeBoardState[toHex]) {
    activeBoardState[toHex] = { terrain: 'Plains', owner: unit.owner, units: [] };
  }

  activeBoardState[toHex].units.push(unit);
}

// Generate Hex Overlay across current viewport bounds
function renderHexGrid() {
  hexLayerGroup.clearLayers();
  
  const bounds = map.getBounds();
  const bboxPolygon = [
    [bounds.getSouth(), bounds.getWest()],
    [bounds.getNorth(), bounds.getWest()],
    [bounds.getNorth(), bounds.getEast()],
    [bounds.getSouth(), bounds.getEast()]
  ];

  // Retrieve H3 index cells covering the current viewport
  const hexes = h3.polygonToCells(bboxPolygon, H3_RESOLUTION);

  hexes.forEach(hexIndex => {
    const boundary = h3.cellToBoundary(hexIndex);
    
    const polygon = L.polygon(boundary, {
      color: 'rgba(255, 255, 255, 0.35)',
      weight: 1,
      fillColor: 'transparent',
      fillOpacity: 0.1
    });

    // Touch & Click Interaction
    polygon.on('click', function() {
      document.getElementById('selected-hex').innerText = hexIndex;

      // Get hex centroid lat/lng
      const [lat, lng] = h3.cellToLatLng(hexIndex);
      
      // Clear previous selection and highlight active hex
      hexLayerGroup.eachLayer(layer => layer.setStyle({ fillColor: 'transparent' }));
      polygon.setStyle({ fillColor: '#38bdf8', fillOpacity: 0.4 });

      // Classify Terrain
      document.getElementById('selected-hex').innerText = `${hexIndex} (Analyzing...)`;
      const terrain = await classifyHexTerrain(lat, lng);
      
      document.getElementById('selected-hex').innerHTML = `
        <strong>ID:</strong> ${hexIndex.substring(0, 8)}...<br/>
        <strong>Type:</strong> ${terrain.name}<br/>
        <strong>Move Cost:</strong> ${terrain.moveCost}<br/>
        <strong>Defense Bonus:</strong> +${terrain.defBonus * 100}%
      `;
    });

    hexLayerGroup.addLayer(polygon);
  });
}

// Event Listeners for map rendering
map.on('moveend', renderHexGrid);
renderHexGrid();
