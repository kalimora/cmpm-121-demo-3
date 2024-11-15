import leaflet from 'leaflet';
import { Marker } from "leaflet";
import 'leaflet/dist/leaflet.css';
import './style.css';
import './leafletWorkaround.ts';
import generateLuck from './luck.ts';  // Custom module for generating random values

// Configuration constants for the game
const GAME_ZOOM_LEVEL = 19;  // Fixed zoom level for the game map
const TILE_SIZE = 1e-4;  // Size of each tile on the map
const AREA_SIZE = 8;  // Area around the player to check for tile interactions
const CACHE_CREATION_CHANCE = 0.1;  // Probability of creating a cache in a tile

// Setting up player location and icons
let playerLocation = leaflet.latLng(36.98949379578401, -122.06277128548504);
const playerIcon = leaflet.icon({
  iconUrl: '/project/src/Girl2.png',  // Path to player icon image
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
// Initialize the game map with specific settings to disable certain controls and interactions
const gameMap = leaflet.map(document.getElementById('map')!, {
  center: playerLocation,
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
document.addEventListener("player-moved", () => {
  updateCaches();
});

// Define coin structure
interface Coin {
  i: number;  // Tile index where the coin is located
  j: number;
  serial: number;  // Unique identifier for the coin
}
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

// Define cache structure with optional marker for map display
interface Cache {
  i: number;
  j: number;
  inventory: Coin[];
  currentSerial: number;

  toMemento(): string;
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
    panPlayerTo({ i: playerLocation.lat + TILE_SIZE, j: playerLocation.lng });
  });

document.querySelector<HTMLButtonElement>("#south")!
  .addEventListener("click", () => {
    panPlayerTo({ i: playerLocation.lat - TILE_SIZE, j: playerLocation.lng });
  });

document.querySelector<HTMLButtonElement>("#west")!
  .addEventListener("click", () => {
    panPlayerTo({ i: playerLocation.lat, j: playerLocation.lng - TILE_SIZE });
  });

document.querySelector<HTMLButtonElement>("#east")!
  .addEventListener("click", () => {
    panPlayerTo({ i: playerLocation.lat, j: playerLocation.lng + TILE_SIZE });
  });

function initializeGame() {
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

const playerMovedEvent = new Event('playerMoved');

// Dispatch the event after updating player location
function panPlayerTo(latLng: { i: number; j: number }) {
  playerLocation = leaflet.latLng(latLng.i, latLng.j); // Update playerLocation
  gameMap.panTo(playerLocation);
  playerMarker.setLatLng(playerLocation);
  document.dispatchEvent(playerMovedEvent);
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
  // Look around the player's neighborhood for caches to spawn
  const newCaches: Tile[] = []; //Caches that need to be rendered
  for (const tile of findNearbyTiles(playerLocation)) {
    if (generateLuck([tile.i, tile.j].toString()) < CACHE_CREATION_CHANCE) {
      newCaches.push(tile);
    }
  }
  currentCaches.forEach((marker, tile) => { //remove caches outside bounds
    if (newCaches.indexOf(tile) === -1) {
      marker[0].removeFrom(gameMap);
      cacheStorage.set([tile.i, tile.j].toString(), marker[1].toMemento());
      currentCaches.delete(tile);
    }
  });

  newCaches.filter(function (tile: Tile): boolean {
    return !currentCaches.has(tile); //For tiles in newCaches, but not in currenCaches, spawn
  }).map(function (tile: Tile) {
    spawnCache(tile);
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
  if (playerCoins.length < 1) {
    inventoryDiv.innerHTML = emptyInventoryMessage;
    return;
  }
  inventoryDiv.innerHTML = "Inventory: ";
  for (const coin of playerCoins) {
    const coinDiv = document.createElement("div");
    coinDiv.innerHTML = `Coin: ${getCoinLabel(coin)}`;
    inventoryDiv.append(coinDiv);
  }
}

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