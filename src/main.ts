import leaflet from 'leaflet';
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
const playerLocation = leaflet.latLng(36.98949379578401, -122.06277128548504);
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

// Define coin structure
interface Coin {
  i: number;  // Tile index where the coin is located
  j: number;
  serial: number;  // Unique identifier for the coin
}

// Define cache structure with optional marker for map display
interface Cache {
  i: number;
  j: number;
  inventory: Coin[];
  currentSerial: number;
  marker?: leaflet.Marker;  // Optional marker property to handle cache markers
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

  iconUrl: "/project/src/Chest_1.png",
let playerCoins: Coin[] = [];  // Array to store player's collected coins
inventoryDiv.addEventListener('inventory-changed', updateInventoryDisplay);  // Listener for inventory changes

const cacheStorage: Map<string, Cache> = new Map();  // Storage for caches using a map
const cacheIcon = leaflet.icon({
  iconUrl: '/project/src/Chest_1.png',
  tooltipAnchor: [-16, 16],
  popupAnchor: [16, 16],
});

// Function to add caches to the map
function placeCache(pos: Position) {
  const cacheLat = (pos.row * TILE_SIZE + (pos.row + 1) * TILE_SIZE) / 2;
  const cacheLng = (pos.col * TILE_SIZE + (pos.col + 1) * TILE_SIZE) / 2;
  const cachePoint = leaflet.latLng(cacheLat, cacheLng);
  const cache = leaflet.marker(cachePoint, { icon: cacheMarker });
  cache.addTo(mapElement);

  cache.bindPopup(() => {
    let cacheCoins = Math.floor(generateLuck([pos.row, pos.col, "initialValue"].toString()) * 100);
    const popupContent = document.createElement("div");
    popupContent.innerHTML = `
      <div>There is a cache here at "${pos.row},${pos.col}". It has <span id="value">${cacheCoins}</span> coins.</div>
      <button id="take">Take</button>
      <button id="give">Deposit</button>`;
    popupContent.querySelector<HTMLButtonElement>("#take")!.addEventListener(
      "click",
      () => {
        if (cacheCoins <= 0) {
          return;
        }
        cacheCoins--;
        popupContent.querySelector<HTMLSpanElement>("#value")!.innerHTML = cacheCoins.toString();
        score++;
        statusDiv.innerHTML = `${score} coins!`;
      },
    );
    popupContent.querySelector<HTMLButtonElement>("#give")!.addEventListener(
      "click",
      () => {
        if (score <= 0) {
          return;
        }
        cacheCoins++;
        popupContent.querySelector<HTMLSpanElement>("#value")!.innerHTML = cacheCoins.toString();
        score--;
        statusDiv.innerHTML = `${score} coins!`;
      },
    );
    return popupContent;
  playerCoins = [];  // Reset player's coins
  inventoryDiv.innerHTML = emptyInventoryMessage;  // Display message when inventory is empty

  // Check surrounding tiles for potential cache placements
  findNearbyTiles(playerLocation).forEach(tile => {
  });
}

// Calculate tile indices from geographical coordinates
function calculateTileFromLocation(location: { lat: number; lng: number }): Position {
  const row = Math.floor(location.lat / TILE_SIZE);
  const col = Math.floor(location.lng / TILE_SIZE);
initializeGame();  // Call initializeGame to set up the initial state

function getTileFromCoordinates(coords: { lat: number; lng: number }): Tile {
}

// Checking and adding caches in the player's vicinity
const currentTile = calculateTileFromLocation(playerLocation);
for (let row = currentTile.row - AREA_SIZE; row < currentTile.row + AREA_SIZE; row++) {
function findNearbyTiles(coords: { lat: number; lng: number }): Tile[] {
    }
  }
  const index = from.indexOf(coin);
  if (index > -1) {
    from.splice(index, 1);
    to.push(coin);
    inventoryDiv.dispatchEvent(inventoryChangedEvent);  // Dispatch event to update the inventory display
  }
}

function addCoinsToCache(cache: Cache, numberOfCoins: number) {
  // Add a specified number of coins to a cache
  for (let k = 0; k < numberOfCoins; k++) {
    cache.inventory.push({
      i: cache.i,
      j: cache.j,
      serial: cache.currentSerial++
    });
  }
}

function createCache(tile: Tile) {
  // Function to create a new cache and place it on the map
  const key = `${tile.i},${tile.j}`;
  if (!cacheStorage.has(key)) {
    const cache: Cache = {
      i: tile.i,
      j: tile.j,
      inventory: [],
      currentSerial: 0
    };
    const numCoins = Math.floor(generateLuck(`${tile.i},${tile.j},seed`) * 3);
    addCoinsToCache(cache, numCoins);

    const location = leaflet.latLng(tile.i * TILE_SIZE, tile.j * TILE_SIZE);
    const cacheMarker = leaflet.marker(location, { icon: cacheIcon }).addTo(gameMap);
    cache.marker = cacheMarker; // Store the marker in the cache object
    cacheMarker.bindPopup(() => createCachePopup(cache));
    cacheStorage.set(key, cache);
  }
}

function updateInventoryDisplay() {
  // Update the inventory display based on the current contents of the player's coins
  if (playerCoins.length === 0) {
    inventoryDiv.innerHTML = emptyInventoryMessage;
  } else {
    inventoryDiv.innerHTML = 'Inventory: ';
    playerCoins.forEach(coin => {
      const coinDiv = document.createElement('div');
      coinDiv.textContent = `Coin: ${createLabelForCoin(coin)}`;
      inventoryDiv.appendChild(coinDiv);
    });
  }
}

function createCachePopup(cache: Cache): HTMLElement {
  // Create a popup for a cache with options to interact with its contents
  const popupDiv = document.createElement('div');
  popupDiv.innerHTML = `<div>Cache: ${cache.i},${cache.j} <br>Inventory:</div>`;
  const inventoryList = document.createElement('div');

  // Display each coin in the cache with a button to select
  cache.inventory.forEach(coin => {
    const coinDiv = document.createElement('div');
    coinDiv.textContent = `Coin: ${createLabelForCoin(coin)}`;
    const selectButton = document.createElement('button');
    selectButton.textContent = 'Select';
    selectButton.addEventListener('click', () => {
      transferCoin(cache.inventory, playerCoins, coin);
      updateInventoryDisplay();  // Refresh inventory display
      popupDiv.innerHTML = '';  // Clear current content
      popupDiv.appendChild(createCachePopup(cache));  // Re-create popup to reflect changes
    });
    coinDiv.appendChild(selectButton);
    inventoryList.appendChild(coinDiv);
  });

  // Add a button for depositing coins to the cache
  const depositButton = document.createElement('button');
  depositButton.textContent = 'Deposit Coin';
  depositButton.addEventListener('click', () => {
    depositMenu(cache, popupDiv);  // Call function to handle deposit actions
  });

  popupDiv.appendChild(inventoryList);
  popupDiv.appendChild(depositButton);
  return popupDiv;
}

function depositMenu(cache: Cache, popupDiv: HTMLElement) {
    const depositDiv = document.createElement('div');
    depositDiv.innerHTML = '<div>Select a coin to deposit:</div>';

    // Display player coins with a button to deposit each one
    playerCoins.forEach(coin => {
        const coinDiv = document.createElement('div');
        coinDiv.textContent = `Coin: ${createLabelForCoin(coin)}`;
        const depositButton = document.createElement('button');
        depositButton.textContent = 'Deposit';
        depositButton.addEventListener('click', () => {
            transferCoin(playerCoins, cache.inventory, coin);
            updateInventoryDisplay();  // Refresh player inventory display
            popupDiv.innerHTML = '';  // Clear current content
            popupDiv.appendChild(createCachePopup(cache));  // Re-create popup to reflect changes
        });
        coinDiv.appendChild(depositButton);
        depositDiv.appendChild(coinDiv);
    });

    popupDiv.appendChild(depositDiv);
}
