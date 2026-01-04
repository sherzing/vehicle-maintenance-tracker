import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from './test/utils';
import App from './App';

// Mock Firebase auth
vi.mock('./services/firebase/config', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(null); // No user logged in
    return vi.fn(); // Return unsubscribe function
  }),
}));

describe('App', () => {
  it('should render login page when not authenticated', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Vehicle Maintenance Tracker')).toBeInTheDocument();
      expect(screen.getByText(/Sign in to manage your vehicles/i)).toBeInTheDocument();
    });
  });

  it('should render Google sign in button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign in with Google/i })).toBeInTheDocument();
    });
  });
});
