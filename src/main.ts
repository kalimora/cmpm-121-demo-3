// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
//document.title = "Slay";
// Location of our classroom (Google Maps)
// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const player_loc = leaflet.latLng(36.98949379578401, -122.06277128548504);
const playerIcon = leaflet.icon({
  iconUrl: "/project/src/Girl2.png",
  tooltipAnchor: [-16, 16],
});
const playerMarker = leaflet.marker(player_loc, { icon: playerIcon });
const emptyInven: string = "Inventory empty. Go out there and get some coins!";
const inventoryChanged: Event = new CustomEvent("inventory-changed");

// Interfaces
interface Tile {
  i: number;
  j: number;
}

// Create the game map (element with id "map" is defined in index.html)
const game_map = leaflet.map(document.getElementById("map")!, {
  center: player_loc,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
  dragging: false,
  keyboard: false,
  closePopupOnClick: false,
});

// Populate the game map with a background
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(game_map);

// Add a marker to represent the player
//const playerIcon = leaflet.icon({
//iconUrl: "/project/src/Girl2.png", // Ensure path to the resource is correct
//tooltipAnchor: [-16, 16],
//});
interface Coin {
  i: number;
  j: number;
  serial: number;
}
let playerCoins: Coin[];
const inventoryDiv = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
inventoryDiv.addEventListener("inventory-changed", () => {
  updateInventoryDiv();
});
interface Cache {
  i: number;
  j: number;
  inventory: Coin[];
  curSerial: number;
}
let cacheCache: Map<string, Cache>;
const cacheIcon = leaflet.icon({
  iconUrl: "/project/src/Chest_1.png", // Ensure path to the resource is correct
  tooltipAnchor: [-16, 16],
  popupAnchor: [16, 16],
});
const resetButton = document.querySelector<HTMLButtonElement>("#reset")!;
resetButton.addEventListener("click", () => {
  game_map.closePopup();
  initialize();
});
function initialize() {
  cacheCache = new Map<string, Cache>();
  playerMarker.bindTooltip("That's you!");
  playerMarker.addTo(game_map);
  playerCoins = [];
  inventoryDiv.innerHTML = emptyInven;
  // Look around the player's neighborhood for caches to spawn
  for (const tile of localTiles(player_loc)) {
    if (luck([tile.i, tile.j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(tile);
    }
  }
}
initialize();
function getLocalTile(LatLng: { lat: number; lng: number }): Tile {
  const i: number = Math.floor(LatLng.lat / TILE_DEGREES);
  const j: number = Math.floor(LatLng.lng / TILE_DEGREES);
  return { i, j };
}
function localTiles(LatLng: { lat: number; lng: number }): Tile[] {
  const result: Tile[] = [];
  const local_tile = getLocalTile(LatLng);
  for (
    let i = local_tile.i - NEIGHBORHOOD_SIZE;
    i < local_tile.i + NEIGHBORHOOD_SIZE;
    i++
  ) {
    for (
      let j = local_tile.j - NEIGHBORHOOD_SIZE;
      j < local_tile.j + NEIGHBORHOOD_SIZE;
      j++
    ) {
      result.push({ i: i, j: j });
    }
  }
  return result;
}
function getCoinLabel(coin: Coin) {
  const result: string = `${coin.i}:${coin.j}#${coin.serial}`;
  return result;
}
function transferCoin(from: Coin[], to: Coin[], coin: Coin) {
  const index = from.indexOf(coin);
  if (index > -1) {
    from.splice(index, 1);
  }
  to.push(coin);
  inventoryDiv.dispatchEvent(inventoryChanged);
}
function mintCoins(cache: Cache, amount: number): void {
  for (let k = 0; k < amount; k++) {
    cache.inventory.push({ i: cache.i, j: cache.j, serial: cache.curSerial });
    cache.curSerial++;
  }
}
function spawnCache(tile: Tile) {
  // Convert cell numbers into lat/lng bounds
  const key: string = [tile.i, tile.j].toString();
  let cache: Cache;
  if (!cacheCache.get(key)) {
    cache = { inventory: [], curSerial: 0, i: tile.i, j: tile.j };
    const cacheCoins = Math.floor(
      luck([cache.i, cache.j, "uh"].toString()) * 3,
    );
    mintCoins(cache, cacheCoins);
    cacheCache.set(key, cache);
  } else {
    cache = cacheCache.get(key)!;
  }
  const location = leaflet.latLng(
    cache.i * TILE_DEGREES,
    cache.j * TILE_DEGREES,
  );
  const cacheMarker = leaflet.marker(location, { icon: cacheIcon });
  cacheMarker.addTo(game_map);
  cacheMarker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    return updateCachePopup(popupDiv, cache);
  });
}

// Iteratively check and spawn caches in the neighborhood of the player
function updateInventoryDiv() {
  if (playerCoins.length < 1) {
    inventoryDiv.innerHTML = emptyInven;
    return;
  }
  inventoryDiv.innerHTML = "Inventory: ";
  for (const coin of playerCoins) {
    const buttonDiv = document.createElement("div");
    buttonDiv.innerHTML = `Coin: ${getCoinLabel(coin)}`;
    inventoryDiv.append(buttonDiv);
  }
}
// Function to calculate tile indices from geographical coordinates
function updateCachePopup(popupDiv: HTMLDivElement, cache: Cache) {
  popupDiv.innerHTML = `<div>Cache: ${cache.i},${cache.j} <br>Inventory:</div>`;
  coinSelectionMenu(cache, popupDiv);
  if (playerCoins.length > 0) {
    const depositButton = document.createElement("button");
    depositButton.innerHTML = "Deposit";
    depositButton.id = "give";
    depositButton.addEventListener("click", () => {
      if (playerCoins.length <= 0) {
        return;
      }
      depositButton.remove();
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
  const depositDiv = document.createElement("div");
  depositDiv.innerHTML = "Deposit: ";
  for (const coin of playerCoins) {
    const buttonDiv = document.createElement("div");
    buttonDiv.innerHTML = `Coin: ${getCoinLabel(coin)}  `;
    depositDiv.append(buttonDiv);
    const coinButton = document.createElement("button");
    coinButton.innerHTML = "Select";
    coinButton.addEventListener("click", () => {
      transferCoin(playerCoins, cache.inventory, coin);
      updateCachePopup(source, cache);
    });
    buttonDiv.append(coinButton);
  }
  source.append(depositDiv);
  return depositDiv;
}
//actually end of d3.b
