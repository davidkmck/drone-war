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
