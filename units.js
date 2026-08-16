// units.js

// Unit Template Registry
const UNIT_TYPES = {
  INFANTRY: { name: 'Infantry', moveRange: 2, attackRange: 1, cost: 100, icon: '🪖' },
  MOBILE_LAUNCHER: { name: 'Mobile Launcher', moveRange: 3, attackRange: 4, cost: 500, icon: '🚛' },
  INTERCEPTOR: { name: 'Interceptor Drone', moveRange: 4, attackRange: 2, cost: 250, icon: '🛸' },
  LOGISTICS_TRUCK: { name: 'Supply Truck', moveRange: 4, attackRange: 0, cost: 200, icon: '🚚' }
};

// Calculate reachable hexes within unit move range using H3 distance
function getValidMoves(originHexIndex, moveRange, boardState) {
  // h3.gridDisk returns all hexes within k-distance
  const candidateHexes = h3.gridDisk(originHexIndex, moveRange);

  return candidateHexes.filter(targetHex => {
    // Exclude origin hex
    if (targetHex === originHexIndex) return false;

    // Check if target hex is impassable terrain (e.g., Water)
    const hexData = boardState[targetHex];
    if (hexData && hexData.terrain === 'Water') return false;

    return true;
  });
}

// Spawn new unit on board state
function spawnUnit(hexIndex, unitTypeKey, owner, boardState) {
  if (!boardState[hexIndex]) {
    boardState[hexIndex] = { terrain: 'Plains', owner: owner, units: [] };
  }

  const newUnit = {
    id: 'u_' + Date.now(),
    type: unitTypeKey,
    owner: owner,
    hp: 100,
    ammo: 3,
    hasMoved: false
  };

  boardState[hexIndex].units.push(newUnit);
  return newUnit;
}
