// Storage interface - currently not used by the test case generator
// This file is kept for potential future user management features

export interface IStorage {
  // Storage methods can be added here as needed
}

export class MemStorage implements IStorage {
  constructor() {
    // Empty constructor for now
  }
}

export const storage = new MemStorage();
