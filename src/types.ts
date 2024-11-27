// types.ts
// Define cache structure with optional marker for map display
export interface Cache {
  i: number;
  j: number;
  inventory: Coin[];
  currentSerial: number;
  toMemento(): string;
}
// Define coin structure
export interface Coin {
    i: number;  // Tile index where the coin is located
    j: number;
    serial: number;  // Unique identifier for the coin
  }
