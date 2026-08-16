// terrain.js

// Fetch OSM features around the center point of an H3 Hex
async function classifyHexTerrain(lat, lng) {
  // Query a 150m radius around the hex centroid using Overpass API
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const query = `
    [out:json][timeout:3];
    (
      way(around:100, ${lat}, ${lng})["natural"];
      way(around:100, ${lat}, ${lng})["landuse"];
      way(around:100, ${lat}, ${lng})["building"];
      way(around:100, ${lat}, ${lng})["waterway"];
    );
    out tags;
  `;

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query)
    });

    // Check if Overpass returned 200 OK before parsing JSON
    if (!response.ok) {
      console.warn(`Overpass API returned status ${response.status}. Falling back to Plains.`);
      return TERRAIN_TYPES.PLAINS;
    }

    const data = await response.json();
    return parseOsmData(data.elements);
  } catch (err) {
    console.warn("Overpass API request failed. Falling back to Plains:", err);
    return TERRAIN_TYPES.PLAINS;
  }
}
    

// Terrain Types & Combat Modifiers
const TERRAIN_TYPES = {
  PLAINS: { name: 'Plains', moveCost: 1, defBonus: 0, cover: 0 },
  FOREST: { name: 'Forest', moveCost: 2, defBonus: 0.25, cover: 0.5 },
  WATER:  { name: 'Water', moveCost: 99, defBonus: -0.2, cover: 0 },
  URBAN:  { name: 'Urban', moveCost: 1.5, defBonus: 0.40, cover: 0.75 }
};

function parseOsmData(elements) {
  if (!elements || elements.length === 0) return TERRAIN_TYPES.PLAINS;

  for (let elem of elements) {
    const tags = elem.tags || {};
    
    // Water bodies / Rivers
    if (tags.natural === 'water' || tags.waterway) {
      return TERRAIN_TYPES.WATER;
    }
    // Forests / Dense Canopy
    if (tags.natural === 'wood' || tags.landuse === 'forest') {
      return TERRAIN_TYPES.FOREST;
    }
    // Built-up Urban Areas
    if (tags.building || tags.landuse === 'residential' || tags.landuse === 'commercial' || tags.landuse === 'industrial') {
      return TERRAIN_TYPES.URBAN;
    }
  }

  return TERRAIN_TYPES.PLAINS;
}
