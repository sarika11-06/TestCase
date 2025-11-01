import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { mockTestGenerationResponse } from './mocks/testData';

// Mock fetch globally
global.fetch = vi.fn();

// Setup default fetch mock response
beforeEach(() => {
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => mockTestGenerationResponse,
  });
});

// Clean up mocks
afterEach(() => {
  vi.clearAllMocks();
});
