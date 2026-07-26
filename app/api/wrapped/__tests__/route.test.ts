/**
 * Unit tests for the wrapped API route rate limiting
 * Tests that Horizon 429 rate-limit responses are handled correctly
 */

import { GET } from '../route';
import { indexAccount } from '@/app/services/indexerService';
import { NextRequest } from 'next/server';

interface MockError extends Error {
  statusCode?: number;
}

jest.mock('@/app/services/indexerService', () => ({
  indexAccount: jest.fn(),
}));

jest.mock('@/app/utils/indexer', () => ({
  PERIODS: {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    yearly: 365,
  },
}));

const mockIndexAccount = indexAccount as jest.Mock;

interface MockError extends Error {
  statusCode?: number;
}

function createRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/wrapped');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return new NextRequest(url);
}

// Valid Stellar account ID (56 chars, starts with G)
const VALID_ACCOUNT_ID = 'GABCDEF1234567890123456789012345678901234567890123456789';

describe('GET /api/wrapped - Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 429 with retry-friendly message when indexAccount throws 429 error', async () => {
    const rateLimitError = new Error('Rate limit exceeded (429). Please try again later.');
    (rateLimitError as MockError).statusCode = 429;
    mockIndexAccount.mockRejectedValue(rateLimitError);

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limited. Please try again later.');
  });

  it('should return 429 when error message contains "Rate limit"', async () => {
    const rateLimitError = new Error('Rate limit exceeded. Try again later.');
    (rateLimitError as MockError).statusCode = 429;
    mockIndexAccount.mockRejectedValue(rateLimitError);

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limited. Please try again later.');
  });

  it('should return 429 when error has statusCode 429 property', async () => {
    const error = new Error('Too Many Requests');
    (error as MockError).statusCode = 429;
    mockIndexAccount.mockRejectedValue(error);

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limited. Please try again later.');
  });

  it('should return 404 for account not found', async () => {
    const notFoundError = new Error('Not Found');
    (notFoundError as MockError).statusCode = 404;
    mockIndexAccount.mockRejectedValue(notFoundError);

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Account not found on this network');
  });

  it('should return 500 for Horizon server errors', async () => {
    const serverError = new Error('Internal Server Error');
    (serverError as MockError).statusCode = 500;
    mockIndexAccount.mockRejectedValue(serverError);

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Horizon server error');
  });

  it('should return 400 for bad request errors', async () => {
    const badRequestError = new Error('Bad Request');
    (badRequestError as MockError).statusCode = 400;
    mockIndexAccount.mockRejectedValue(badRequestError);

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Bad Request to Horizon API');
  });

  it('should return 400 for missing accountId', async () => {
    const request = createRequest({
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing accountId parameter');
  });

  it('should return 400 for invalid accountId format', async () => {
    const request = createRequest({
      accountId: 'INVALID_ACCOUNT',
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid account ID format');
  });

  it('should return 400 for invalid network', async () => {
    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'invalid',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid network');
  });

  it('should return 400 for invalid period', async () => {
    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'invalid',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid period');
  });

  it('should return 500 for unknown errors', async () => {
    const unknownError = new Error('Unknown error');
    mockIndexAccount.mockRejectedValue(unknownError);

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch wrapped data');
    expect(data.details).toBe('Unknown error');
  });

  it('should return successful response with cached data', async () => {
    const mockResult = {
      accountId: 'GABCDEF12345678901234567890123456789012345678901234567890',
      totalTransactions: 10,
      totalVolume: 1000,
      mostActiveAsset: 'XLM',
      contractCalls: 0,
      gasSpent: 0,
      dapps: [],
      vibes: [],
    };

    mockIndexAccount.mockResolvedValue({
      result: mockResult,
      fromCache: true,
      cacheTimestamp: Date.now(),
    });

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(data.totalTransactions).toBe(10);
  });

  it('should return successful response with fresh data', async () => {
    const mockResult = {
      accountId: 'GABCDEF12345678901234567890123456789012345678901234567890',
      totalTransactions: 5,
      totalVolume: 500,
      mostActiveAsset: 'USDC',
      contractCalls: 2,
      gasSpent: 100,
      dapps: ['dapp1'],
      vibes: ['vibe1'],
    };

    mockIndexAccount.mockResolvedValue({
      result: mockResult,
      fromCache: false,
    });

    const request = createRequest({
      accountId: 'GABCDEF1234567890123456789012345678901234567890123456789',
      network: 'testnet',
      period: 'weekly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.totalTransactions).toBe(5);
    expect(data.mostActiveAsset).toBe('USDC');
  });

  it('should return refreshingInBackground when cache is stale', async () => {
    const mockResult = {
      accountId: 'GABCDEF12345678901234567890123456789012345678901234567890',
      totalTransactions: 8,
      totalVolume: 800,
      mostActiveAsset: 'XLM',
      contractCalls: 1,
      gasSpent: 50,
      dapps: [],
      vibes: [],
    };

    mockIndexAccount.mockResolvedValue({
      result: mockResult,
      fromCache: true,
      cacheTimestamp: Date.now() - 100000,
      refreshingInBackground: true,
    });

    const request = createRequest({
      accountId: VALID_ACCOUNT_ID,
      network: 'mainnet',
      period: 'monthly',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.refreshingInBackground).toBe(true);
    expect(data.cached).toBe(true);
  });
});