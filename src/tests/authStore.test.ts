import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/authStore';

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: false,
      userId: null,
      username: null,
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
    login(1, 'testuser');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.userId).toBe(1);
    expect(state.username).toBe('testuser');
  });

  it('should logout user correctly', () => {
    const { login, logout } = useAuthStore.getState();

    login(1, 'testuser');
    logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBe(null);
    expect(state.username).toBe(null);
  });
});

