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
const unitLayerGroup = L.layerGroup().addTo(map);
const H3_RESOLUTION = 8; // Hexagon resolution scale (~0.7 km² area per hex)

// State Tracking Variables
let activeBoardState = {}; 
let selectedUnitHex = null;
let validMoveHighlights = [];
let currentTargetHex = null;

// Render Map Grid Overlay
function renderHexGrid() {
  hexLayerGroup.clearLayers();
  
  const bounds = map.getBounds();
  const bboxPolygon = [
    [bounds.getSouth(), bounds.getWest()],
    [bounds.getNorth(), bounds.getWest()],
    [bounds.getNorth(), bounds.getEast()],
    [bounds.getSouth(), bounds.getEast()]
  ];

  const hexes = h3.polygonToCells(bboxPolygon, H3_RESOLUTION);

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
map.on('moveend', renderHexGrid);
renderHexGrid();

// Expose UI handlers globally for inline HTML onclick attributes
window.showActionPanel = showActionPanel;
window.resetMenus = resetMenus;
window.showDeployMenu = showDeployMenu;
window.showStrikeMenu = showStrikeMenu;
window.executeDeploy = executeDeploy;
window.executeStrike = executeStrike;

