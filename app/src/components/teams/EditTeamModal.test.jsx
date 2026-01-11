import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import EditTeamModal from './EditTeamModal';
import * as teamsService from '../../services/firebase/teams';

// Mock Firebase Firestore
const mockGetDocs = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
}));

// Mock the teams service
vi.mock('../../services/firebase/teams', () => ({
  updateTeamName: vi.fn(),
  addUserToTeam: vi.fn(),
  removeUserFromTeam: vi.fn(),
}));

// Mock Firebase config
vi.mock('../../services/firebase/config', () => ({
  db: {},
}));

describe('EditTeamModal', () => {
  const mockTeam = {
    id: 'team123',
    name: 'Test Team',
    owner_id: 'user1',
    member_ids: ['user1', 'user2', 'user3'],
  };

  const mockOnHide = vi.fn();
  const mockOnTeamUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock loadMembers query to return user data
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'user1',
          data: () => ({ email: 'owner@example.com', display_name: 'Owner User' }),
        },
        {
          id: 'user2',
          data: () => ({ email: 'member1@example.com', display_name: 'Member One' }),
        },
        {
          id: 'user3',
          data: () => ({ email: 'member2@example.com', display_name: 'Member Two' }),
        },
      ],
      empty: false,
    });
  });

  const renderModal = async (props = {}) => {
    const result = render(
      <EditTeamModal
        show={true}
        onHide={mockOnHide}
        onTeamUpdated={mockOnTeamUpdated}
        team={mockTeam}
        currentUserId="user1"
        {...props}
      />
    );

    // Wait for members to load
    await waitFor(() => {
      expect(screen.queryByText(/3 members/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    return result;
  };

  describe('Team Name Editing', () => {
    it('should display current team name in input', async () => {
      await renderModal();
      const input = screen.getByLabelText(/team name/i);
      expect(input).toHaveValue('Test Team');
    });

    it('should update team name on submit', async () => {
      teamsService.updateTeamName.mockResolvedValue();
      await renderModal();

      const input = screen.getByLabelText(/team name/i);
      fireEvent.change(input, { target: { value: 'Updated Team Name' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(teamsService.updateTeamName).toHaveBeenCalledWith('team123', 'Updated Team Name');
      }, { timeout: 2000 });
    });

    it('should show error when team name is empty', async () => {
      await renderModal();

      const input = screen.getByLabelText(/team name/i);
      fireEvent.change(input, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/team name is required/i)).toBeInTheDocument();
      });
      expect(teamsService.updateTeamName).not.toHaveBeenCalled();
    });
  });

  describe('Adding Members', () => {
    it('should have email input for adding members', async () => {
      await renderModal();
      expect(screen.getByPlaceholderText(/enter email address/i)).toBeInTheDocument();
    });

    it('should show error when email is invalid', async () => {
      await renderModal();

      const emailInput = screen.getByPlaceholderText(/enter email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const addButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should show error when email is empty', async () => {
      await renderModal();

      const addButton = screen.getByRole('button', { name: /add member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Removing Members', () => {
    it('should display list of team members', async () => {
      await renderModal();
      expect(screen.getByText(/3 members/i)).toBeInTheDocument();
      expect(screen.getByText(/owner user/i)).toBeInTheDocument();
      expect(screen.getByText(/member one/i)).toBeInTheDocument();
      expect(screen.getByText(/member two/i)).toBeInTheDocument();
    });

    it('should not show remove button for team owner', async () => {
      await renderModal();
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      // Should have 2 remove buttons (for user2 and user3, not user1 who is owner)
      expect(removeButtons).toHaveLength(2);
    });
  });

  describe('Permission Restrictions', () => {
    it('should disable editing when user is not owner', async () => {
      await renderModal({ currentUserId: 'user2' });

      const teamNameInput = screen.getByLabelText(/team name/i);
      expect(teamNameInput).toBeDisabled();

      // Email input should not be shown for non-owners
      expect(screen.queryByPlaceholderText(/enter email address/i)).not.toBeInTheDocument();
    });

    it('should show message when user is not owner', async () => {
      await renderModal({ currentUserId: 'user2' });
      await waitFor(() => {
        expect(screen.getByText(/only the team owner can edit/i)).toBeInTheDocument();
      });
    });

    it('should not show remove buttons when user is not owner', async () => {
      await renderModal({ currentUserId: 'user2' });
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should call onHide when cancel button is clicked', async () => {
      await renderModal();
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      expect(mockOnHide).toHaveBeenCalled();
    });

    it('should not render when show is false', () => {
      render(
        <EditTeamModal
          show={false}
          onHide={mockOnHide}
          onTeamUpdated={mockOnTeamUpdated}
          team={mockTeam}
          currentUserId="user1"
        />
      );
      expect(screen.queryByText(/edit team/i)).not.toBeInTheDocument();
    });
  });
});
