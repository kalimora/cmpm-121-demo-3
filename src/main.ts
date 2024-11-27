import leaflet from 'leaflet';
import { Marker } from "leaflet";
import { LatLng } from "leaflet";
import 'leaflet/dist/leaflet.css';
import './style.css';
import './leafletWorkaround.ts';
import generateLuck from './luck.ts';  // Custom module for generating random values
import { getPlayerLocation, PLAYER_MOVED_EVENT } from './movement.ts';
import { Cache, Coin } from './types.ts';

// Configuration constants for the game
const Location = leaflet.latLng(36.98949379578401, -122.06277128548504);
const GAME_ZOOM_LEVEL = 19;  // Fixed zoom level for the game map
const TILE_SIZE = 1e-4;  // Size of each tile on the map
const AREA_SIZE = 8;  // Area around the player to check for tile interactions
const CACHE_CREATION_CHANCE = 0.1;  // Probability of creating a cache in a tile

// Setting up player location and icons
let playerLocation = Location;
const playerIcon = leaflet.icon({
  iconUrl: 'project/src/Girl2.png',  // Path to player icon image
  tooltipAnchor: [-16, 16]  // Offset for tooltip to avoid overlapping with the icon
});
const playerMarker = leaflet.marker(playerLocation, { icon: playerIcon });  // Marker representing the player
const emptyInventoryMessage = 'Inventory is empty. Go out and get some coins!';
const inventoryChangedEvent = new CustomEvent('inventory-changed');  // Event triggered when inventory changes

// Define tile structure
interface Tile {
  i: number;  // Tile index on the x-axis
  j: number;  // Tile index on the y-axis
}
const playerMovedEventName = "player-moved";
const _removeCacheEvent: string = "remove-cache";
const _addCacheEvent: string = "add-cache";
const _updateCacheEvent: string = "update-cache";

// Initialize the game map with specific settings to disable certain controls and interactions
const gameMap = leaflet.map(document.getElementById('map')!, {
  center: Location,
  zoom: GAME_ZOOM_LEVEL,
  minZoom: GAME_ZOOM_LEVEL,
  maxZoom: GAME_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
  dragging: false,
  keyboard: false,
  closePopupOnClick: false
});
leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(gameMap);
const movementHistory = leaflet.polyline([], { color: 'blue' }).addTo(gameMap);
// Adding geolocation functionality
document.querySelector<HTMLButtonElement>("#geoLocation")!.addEventListener("click", function () {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(positionUpdateSuccess, positionUpdateError);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
});

function positionUpdateSuccess(position: GeolocationPosition) {
  const newLocation = leaflet.latLng(position.coords.latitude, position.coords.longitude);
  panPlayerTo(newLocation);
  updateCaches();
  movementHistory.addLatLng(newLocation);
}

function positionUpdateError(error: GeolocationPositionError) {
  console.error('Geolocation error:', error.message);
  alert(`Error accessing geolocation: ${error.message}`);
}


// Resetting the game state
document.querySelector<HTMLButtonElement>("#reset")!.addEventListener("click", function () {
  if (confirm("Are you sure you want to reset the game and lose all progress?")) {
    initializeGame();
    localStorage.removeItem('gameState');
    movementHistory.setLatLngs([]);
  }
});
// Handling persistent game state
addEventListener("beforeunload", function () {
  localStorage.setItem('gameState', JSON.stringify({
    playerLocation: playerLocation,
    playerCoins: playerCoins,
    caches: Array.from(cacheStorage.values())
  }));
});
addEventListener("load", function () {
  const savedState = JSON.parse(localStorage.getItem('gameState') || '{}');
  if (savedState) {
    playerLocation = leaflet.latLng(savedState.playerLocation);
    playerCoins = savedState.playerCoins;
    savedState.caches.forEach((cacheMemento: string) => {
      const cache = cacheFromMemento(cacheMemento);
      spawnCache({ i: cache.i, j: cache.j });
    });
    movementHistory.setLatLngs(savedState.movementHistory || []);
  }
});
const messengerMarker = leaflet.marker(leaflet.latLng(0, 0));
messengerMarker.addEventListener(playerMovedEventName, () => {
  updateCaches();
});

let playerCoins: Coin[] = [];  // Array to store player's collected coins
const inventoryDiv = document.querySelector<HTMLDivElement>('#statusPanel')!;  // Div element to display inventory status
inventoryDiv.addEventListener("inventory-changed", () => {
  updateInventoryDiv();
});

const cacheToMomento = function (this: Cache): string {
  return JSON.stringify(this);
};

function cacheFromMemento(str: string): Cache {
  return JSON.parse(str);
}



let cacheStorage: Map<string, string> = new Map(); // Storage for caches using a map
const currentCaches: Map<Tile, [Marker, Cache]> = new Map<
  Tile,
  [Marker, Cache]
>();
const cacheIcon = leaflet.icon({
  iconUrl: '/project/src/Chest_1.png',
  tooltipAnchor: [-16, 16],
  popupAnchor: [16, 16],
});

document.querySelector<HTMLButtonElement>("#reset")!
  .addEventListener("click", () => {
    gameMap.closePopup();
    initializeGame();
  });

  
  document.querySelector<HTMLButtonElement>("#north")!
  .addEventListener("click", () => {
    panPlayerTo(leaflet.latLng(playerLocation.lat + TILE_SIZE, playerLocation.lng));
  });

document.querySelector<HTMLButtonElement>("#south")!
  .addEventListener("click", () => {
    panPlayerTo(leaflet.latLng(playerLocation.lat - TILE_SIZE, playerLocation.lng));
  });

document.querySelector<HTMLButtonElement>("#west")!
  .addEventListener("click", () => {
    panPlayerTo(leaflet.latLng(playerLocation.lat, playerLocation.lng - TILE_SIZE));
  });

document.querySelector<HTMLButtonElement>("#east")!
  .addEventListener("click", () => {
    panPlayerTo(leaflet.latLng(playerLocation.lat, playerLocation.lng + TILE_SIZE));
  });

function initializeGame() {
  document.addEventListener(PLAYER_MOVED_EVENT, () => {
    const currentLocation = getPlayerLocation();
    updateMapAfterPlayerMoved(currentLocation);  // Reflects movement on the map
  });
  currentCaches.forEach((marker, tile) => {
    marker[0].removeFrom(gameMap);
    currentCaches.delete(tile);
  });
  cacheStorage = new Map<string, string>();

  playerMarker.bindTooltip("That's you!");
  playerMarker.addTo(gameMap);
  playerCoins = [];
  inventoryDiv.innerHTML = emptyInventoryMessage;

  updateCaches();
}

initializeGame();  // Call initializeGame to set up the initial state

function newCache(tile: Tile): Cache {
  return {
    inventory: [],
    currentSerial: 0,
    i: tile.i,
    j: tile.j,
    toMemento: cacheToMomento,
  };
}
function findNearbyTiles(coords: { lat: number; lng: number }): Tile[] {
  const i: number = Math.round(coords.lat / TILE_SIZE);
  const j: number = Math.round(coords.lng / TILE_SIZE);
  const tiles: Tile[] = [];  // Use `const` since `tiles` is never reassigned
  for (let di = -AREA_SIZE; di <= AREA_SIZE; di++) {
    for (let dj = -AREA_SIZE; dj <= AREA_SIZE; dj++) {
      tiles.push({ i: i + di, j: j + dj });
    }
  }
  return tiles;
}

function localTiles(location: { lat: number; lng: number }): Tile[] {
  const tiles: Tile[] = [];
  const baseI = Math.round(location.lat / TILE_SIZE);
  const baseJ = Math.round(location.lng / TILE_SIZE);

  for (let di = -AREA_SIZE; di <= AREA_SIZE; di++) {
    for (let dj = -AREA_SIZE; dj <= AREA_SIZE; dj++) {
      tiles.push({ i: baseI + di, j: baseJ + dj });
    }
  }
  return tiles;
}

// Usage example: Getting nearby tiles and processing each
const nearbyTiles = localTiles(playerLocation);
nearbyTiles.forEach(tile => {
  console.log(`Tile at index i: ${tile.i}, j: ${tile.j}`);
});

//const playerMovedEvent = new Event(playerMovedEventName);
function updatePlayerPosition(newLocation: LatLng) {
  // Update player location
  playerLocation = newLocation;

  // Emit movement event
  document.dispatchEvent(new Event(playerMovedEventName));
}
function updateMapAfterPlayerMoved() {
  // Pan the map to the new player location
  gameMap.panTo(playerLocation);

  // Update player marker location on the map
  playerMarker.setLatLng(playerLocation);
}

// Dispatch the event after updating player location
function panPlayerTo(latLng: LatLng) {
  // Update the core game state
  updatePlayerPosition(latLng);

  // Update the visual representation on the map
  updateMapAfterPlayerMoved();
}




function getCoinLabel(coin: Coin) {
  const result: string = `${coin.i}:${coin.j}#${coin.serial}`;
  return result;
}

function transferCoin(from: Coin[], to: Coin[], coin: Coin) {
  const index = from.findIndex(c => c.i === coin.i && c.j === coin.j && c.serial === coin.serial);
  if (index > -1) {
    from.splice(index, 1); // Remove the coin from the 'from' array
  }
  to.push(coin);
  inventoryDiv.dispatchEvent(inventoryChangedEvent);
}

function mintCoins(cache: Cache, amount: number): void {
  for (let k = 0; k < amount; k++) {
    cache.inventory.push({ i: cache.i, j: cache.j, serial: cache.currentSerial });
    cache.currentSerial++;
  }
}

function updateCaches() {
  const visibleTiles = findNearbyTiles(playerLocation);
  const visibleTileSet = new Set(visibleTiles.map(tile => `${tile.i},${tile.j}`));

  // Remove caches no longer visible
  currentCaches.forEach((value, key) => {
    if (!visibleTileSet.has(`${key.i},${key.j}`)) {
      value[0].removeFrom(gameMap);
      cacheStorage.set(`${key.i},${key.j}`, value[1].toMemento());
      currentCaches.delete(key);
    }
  });

  // Add new caches that are now visible
  visibleTiles.forEach(tile => {
    if (!currentCaches.has(tile) && generateLuck([tile.i, tile.j].toString()) < CACHE_CREATION_CHANCE) {
      spawnCache(tile);
    }
  });
}


function spawnCache(tile: Tile) {
  const key: string = [tile.i, tile.j].toString();
  let cache: Cache;
  if (!cacheStorage.has(key)) {
    cache = newCache(tile);
    const cacheCoins = Math.floor(
      generateLuck([tile.i, tile.j, "uh"].toString()) * 2 + 1
    );
    mintCoins(cache, cacheCoins);
    cacheStorage.set(key, cache.toMemento());
  } else {
    const memento = cacheStorage.get(key)!;  // Ensure it's not undefined
    cache = cacheFromMemento(memento);
    cache.toMemento = cacheToMomento;
  }
  const location = leaflet.latLng(cache.i * TILE_SIZE, cache.j * TILE_SIZE);
  const cacheMarker = leaflet.marker(location, { icon: cacheIcon });
  cacheMarker.addTo(gameMap);

  cacheMarker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    return updateCachePopup(popupDiv, cache);
  });

  currentCaches.set(tile, [cacheMarker, cache]);
}


function updateInventoryDiv() {
  inventoryDiv.innerHTML = playerCoins.length > 0 ? "Inventory: " : emptyInventoryMessage;
  playerCoins.forEach(coin => {
    const coinDiv = document.createElement("div");
    coinDiv.innerHTML = `Coin: ${getCoinLabel(coin)}`;
    coinDiv.addEventListener("click", () => {
      const coinLocation = leaflet.latLng(coin.i * TILE_SIZE, coin.j * TILE_SIZE);
      gameMap.panTo(coinLocation);
    });
    inventoryDiv.append(coinDiv);
  });
}

document.querySelector<HTMLButtonElement>("#reset")!.addEventListener("click", () => {
  if (confirm("Are you sure you want to reset the game and lose all progress?")) {
    initializeGame();
    localStorage.removeItem('gameState');
    movementHistory.setLatLngs([]);
    alert("Game has been reset successfully.");
  }
});


function updateCachePopup(popupDiv: HTMLDivElement, cache: Cache) {
  popupDiv.innerHTML = `<div>Cache: ${cache.i},${cache.j} <br>Inventory:</div>`;
  coinSelectionMenu(cache, popupDiv);

  // Remove existing deposit button if it exists
  const existingDepositButton = popupDiv.querySelector('#give');
  if (existingDepositButton) {
    existingDepositButton.remove();
  }

  if (playerCoins.length > 0) {
    // Add a button for depositing coins to the cache
    const depositButton = document.createElement('button');
    depositButton.textContent = 'Deposit Coin';
    depositButton.id = "give";
    depositButton.addEventListener("click", () => {
      if (playerCoins.length <= 0) {
        return;
      }
      depositMenu(cache, popupDiv);
    });
    popupDiv.appendChild(depositButton);
  }

  return popupDiv;
}
function coinSelectionMenu(
  cache: Cache,
  source: HTMLDivElement,
): HTMLDivElement {
  const invenLabel = document.createElement("div");
  cache.inventory.length > 0
    ? invenLabel.innerHTML = "Choose a coin: "
    : invenLabel.innerHTML = "Cache is empty.";

  for (const coin of cache.inventory) {
    const buttonDiv = document.createElement("div");
    buttonDiv.innerHTML = `Coin: ${getCoinLabel(coin)}  `;
    invenLabel.append(buttonDiv);

    const coinButton = document.createElement("button");
    coinButton.innerHTML = "Select";
    coinButton.addEventListener("click", () => {
      transferCoin(cache.inventory, playerCoins, coin);
      updateCachePopup(source, cache);
    });
    buttonDiv.append(coinButton);
  }
  source.append(invenLabel);
  return invenLabel;
}

function depositMenu(cache: Cache, source: HTMLDivElement): HTMLDivElement {
  // Remove existing deposit menu if it exists
  const existingDepositMenu = source.querySelector('.deposit-menu');
  if (existingDepositMenu) {
    existingDepositMenu.remove();
  }

  const depositDiv = document.createElement("div");
  depositDiv.className = 'deposit-menu';
  depositDiv.innerHTML = '<div>Select a coin to deposit:</div>';

  for (const coin of playerCoins) {
    const buttonDiv = document.createElement("div");
    buttonDiv.innerHTML = `Coin: ${getCoinLabel(coin)} `;
    depositDiv.append(buttonDiv);

    const coinButton = document.createElement("button");
    coinButton.innerHTML = "Select";
    coinButton.addEventListener("click", () => {
      transferCoin(playerCoins, cache.inventory, coin);
      
      // Update the cache storage
      cacheStorage.set([cache.i, cache.j].toString(), cache.toMemento());
      
      // Update the inventory display
      updateInventoryDiv();
      
      // Refresh the cache popup
      updateCachePopup(source, cache);
    });
    buttonDiv.append(coinButton);
  }

  source.append(depositDiv);
  return depositDiv;
}
