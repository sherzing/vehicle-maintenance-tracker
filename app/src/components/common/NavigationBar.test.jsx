import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { MemoryRouter } from 'react-router-dom';
import NavigationBar from './NavigationBar';

// Mock useAuth hook
const mockNavigate = vi.fn();
const mockSignOut = vi.fn();
let mockUser = null;

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
  }),
}));

// Mock react-router-dom navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NavigationBar', () => {
  const testUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const renderNav = (route = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <NavigationBar />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUser = testUser; // Reset to logged in user by default
  });

  it('should not render when user is not logged in', () => {
    mockUser = null; // Override to null for this test
    renderNav();

    expect(screen.queryByText('VMT')).not.toBeInTheDocument();
  });

  it('should render header with user avatar when logged in', () => {
    renderNav();

    expect(screen.getByText('VMT')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('TU')).toBeInTheDocument(); // User initials
  });

  it('should show user menu when avatar is clicked', async () => {
    renderNav();

    const avatar = screen.getByText('TU');
    fireEvent.click(avatar);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Manage Teams')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  it('should display email when displayName is not available', async () => {
    mockUser = {
      uid: 'user123',
      email: 'test@example.com',
    };
    renderNav();

    const avatar = screen.getByText('TE'); // Initials from email
    fireEvent.click(avatar);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });
  });

  it('should close menu when clicking outside', async () => {
    renderNav();

    const avatar = screen.getByText('TU');
    fireEvent.click(avatar);

    await waitFor(() => {
      expect(screen.getByText('Manage Teams')).toBeInTheDocument();
    });

    // Click outside the menu
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Manage Teams')).not.toBeInTheDocument();
    });
  });

  it('should show "Manage Teams" link in user dropdown', async () => {
    renderNav();

    const avatar = screen.getByText('TU');
    fireEvent.click(avatar);

    await waitFor(() => {
      const manageTeamsLink = screen.getByText('Manage Teams');
      expect(manageTeamsLink).toBeInTheDocument();
      expect(manageTeamsLink.tagName).toBe('A');
    });
  });

  it('should navigate to teams page and close menu when "Manage Teams" is clicked', async () => {
    renderNav();

    const avatar = screen.getByText('TU');
    fireEvent.click(avatar);

    await waitFor(() => {
      expect(screen.getByText('Manage Teams')).toBeInTheDocument();
    });

    const manageTeamsLink = screen.getByText('Manage Teams');
    fireEvent.click(manageTeamsLink);

    await waitFor(() => {
      // Menu should close
      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
      // Breadcrumb should show Teams (indicating navigation occurred)
      expect(screen.getByText('Teams')).toBeInTheDocument();
    });
  });

  it('should call signOut and clear localStorage when Sign Out is clicked', async () => {
    localStorage.setItem('selectedTeamId', 'team123');
    renderNav();

    const avatar = screen.getByText('TU');
    fireEvent.click(avatar);

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(localStorage.getItem('selectedTeamId')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should show correct breadcrumb for dashboard', () => {
    renderNav('/dashboard');

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument(); // Not shown when on dashboard
  });

  it('should show correct breadcrumb for teams page', () => {
    renderNav('/teams');

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('should generate correct initials from full name', () => {
    renderNav();
    expect(screen.getByText('TU')).toBeInTheDocument(); // Test User -> TU
  });

  it('should generate correct initials from single name', () => {
    mockUser = {
      ...testUser,
      displayName: 'John',
    };
    renderNav();
    expect(screen.getByText('JO')).toBeInTheDocument(); // First 2 letters
  });

  it('should generate correct initials from email when no displayName', () => {
    mockUser = {
      uid: 'user123',
      email: 'john@example.com',
    };
    renderNav();
    expect(screen.getByText('JO')).toBeInTheDocument(); // First 2 letters of email
  });
});
