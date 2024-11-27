// src/movement.ts

export interface LatLng {
    lat: number;
    lng: number;
  }
  
  // The player's current position
  let playerLocation: LatLng;
  
  // Event name for movement
  export const PLAYER_MOVED_EVENT = "player-moved";
  
  // Function to update player location and dispatch an event
  export function updatePlayerLocation(newLocation: LatLng): void {
    playerLocation = newLocation; // Update position
    document.dispatchEvent(new Event(PLAYER_MOVED_EVENT)); // Notify the system
  }
  
  // Function to fetch the player's current location
  export function getPlayerLocation(): LatLng {
    return playerLocation;
  }