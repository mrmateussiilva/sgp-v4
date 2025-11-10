import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAuthStore } from '../store/authStore';

const resetStore = () => {
  useAuthStore.setState({
    isAuthenticated: false,
    userId: null,
    username: null,
    isAdmin: false,
    sessionToken: null,
    sessionExpiresAt: null,
  });
};

describe('Auth Store', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBe(null);
    expect(state.username).toBe(null);
    expect(state.sessionToken).toBe(null);
    expect(state.sessionExpiresAt).toBe(null);
  });

  it('should login user and set expiration', () => {
    const { login } = useAuthStore.getState();
    login({ userId: 1, username: 'testuser', sessionToken: 'token123' });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.userId).toBe(1);
    expect(state.username).toBe('testuser');
    expect(state.sessionToken).toBe('token123');
    expect(state.sessionExpiresAt).not.toBeNull();
    expect(state.sessionExpiresAt ?? 0).toBeGreaterThan(Date.now());
  });

  it('should respect custom expiration', () => {
    const { login } = useAuthStore.getState();
    login({ userId: 1, username: 'user', sessionToken: 'abc', expiresInSeconds: 60 });

    const state = useAuthStore.getState();
    const expectedExpiry = Date.now() + 60 * 1000;
    expect(state.sessionExpiresAt ?? 0).toBeGreaterThanOrEqual(expectedExpiry - 50);
    expect(state.sessionExpiresAt ?? 0).toBeLessThanOrEqual(expectedExpiry + 50);
  });

  it('should logout user correctly', () => {
    const { login, logout } = useAuthStore.getState();

    login({ userId: 1, username: 'testuser', sessionToken: 'token123' });
    logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBe(null);
    expect(state.username).toBe(null);
    expect(state.sessionToken).toBe(null);
    expect(state.sessionExpiresAt).toBe(null);
  });
});

