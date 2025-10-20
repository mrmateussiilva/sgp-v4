import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/authStore';

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: false,
      userId: null,
      username: null,
      isAdmin: false,
      sessionToken: null,
    });
  });

  it('should initialize with default values', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBe(null);
    expect(state.username).toBe(null);
  });

  it('should login user correctly', () => {
    const { login } = useAuthStore.getState();
    login({ userId: 1, username: 'testuser', sessionToken: 'token123' });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.userId).toBe(1);
    expect(state.username).toBe('testuser');
    expect(state.sessionToken).toBe('token123');
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
  });
});


