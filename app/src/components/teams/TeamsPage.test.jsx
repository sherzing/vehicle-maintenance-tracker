import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamsPage from './TeamsPage';
import * as AuthContext from '../../contexts/AuthContext';
import * as teamsService from '../../services/firebase/teams';

// Mock dependencies
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/firebase/teams', () => ({
  getUserTeams: vi.fn(),
  createTeam: vi.fn(),
  updateTeamName: vi.fn(),
  addUserToTeam: vi.fn(),
  removeUserFromTeam: vi.fn(),
}));

// Mock child components
vi.mock('./TeamList', () => ({
  default: ({ teams, currentTeamId, onTeamSelect, onCreateTeam, onEditTeam }) => (
    <div data-testid="team-list">
      <button onClick={onCreateTeam}>Create Team</button>
      {teams.map((team) => (
        <div key={team.id} data-testid={`team-${team.id}`}>
          <span>{team.name}</span>
          <button onClick={() => onTeamSelect(team.id)}>Select {team.name}</button>
          {team.owner_id === 'user1' && (
            <button onClick={() => onEditTeam(team)}>Edit {team.name}</button>
          )}
          {currentTeamId === team.id && <span>Active</span>}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('./CreateTeamModal', () => ({
  default: ({ show, onHide, onTeamCreated }) => (
    show ? (
      <div data-testid="create-team-modal">
        <button onClick={onHide}>Close</button>
        <button onClick={() => onTeamCreated('newTeam123')}>Create</button>
      </div>
    ) : null
  ),
}));

vi.mock('./EditTeamModal', () => ({
  default: ({ show, onHide, onTeamUpdated, team }) => (
    show ? (
      <div data-testid="edit-team-modal">
        <span>Editing {team?.name}</span>
        <button onClick={onHide}>Close</button>
        <button onClick={onTeamUpdated}>Update</button>
      </div>
    ) : null
  ),
}));

vi.mock('./ExportImportModal', () => ({
  default: ({ show, onHide, team }) => (
    show ? (
      <div data-testid="export-import-modal">
        <span>Export/Import for {team?.name}</span>
        <button onClick={onHide}>Close</button>
      </div>
    ) : null
  ),
}));

describe('TeamsPage', () => {
  const mockUser = {
    uid: 'user1',
    email: 'test@example.com',
  };

  const mockTeams = [
    {
      id: 'team1',
      name: 'Team Alpha',
      owner_id: 'user1',
      member_ids: ['user1', 'user2'],
    },
    {
      id: 'team2',
      name: 'Team Beta',
      owner_id: 'user2',
      member_ids: ['user1', 'user2'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    AuthContext.useAuth.mockReturnValue({ user: mockUser });
    teamsService.getUserTeams.mockResolvedValue(mockTeams);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial Loading', () => {
    it('should show loading spinner initially', () => {
      teamsService.getUserTeams.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TeamsPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should load user teams on mount', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(teamsService.getUserTeams).toHaveBeenCalledWith('user1');
      });
    });

    it('should display teams after loading', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Team Alpha')).toBeInTheDocument();
        expect(screen.getByText('Team Beta')).toBeInTheDocument();
      });
    });

    it('should show error message on load failure', async () => {
      teamsService.getUserTeams.mockRejectedValue(new Error('Failed to load'));

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load teams/i)).toBeInTheDocument();
      });
    });
  });

  describe('localStorage Synchronization', () => {
    it('should read selectedTeamId from localStorage on mount', async () => {
      localStorage.setItem('selectedTeamId', 'team2');

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('team-team2')).toHaveTextContent('Active');
      });
    });

    it('should select first team when no localStorage value exists', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('team-team1')).toHaveTextContent('Active');
      });
    });

    it('should save selectedTeamId to localStorage on mount if not set', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(localStorage.getItem('selectedTeamId')).toBe('team1');
      });
    });

    it('should ignore invalid localStorage teamId and select first team', async () => {
      localStorage.setItem('selectedTeamId', 'invalidTeamId');

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('team-team1')).toHaveTextContent('Active');
        expect(localStorage.getItem('selectedTeamId')).toBe('team1');
      });
    });

    it('should update localStorage when team selection changes', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      });

      const selectButton = screen.getByText('Select Team Beta');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(localStorage.getItem('selectedTeamId')).toBe('team2');
      });
    });

    it('should persist team selection across component remounts', async () => {
      const { unmount } = render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      });

      // Select team2
      const selectButton = screen.getByText('Select Team Beta');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(localStorage.getItem('selectedTeamId')).toBe('team2');
      });

      // Unmount and remount
      unmount();
      render(<TeamsPage />);

      // Should restore team2 as selected
      await waitFor(() => {
        expect(screen.getByTestId('team-team2')).toHaveTextContent('Active');
      });
    });
  });

  describe('Team Selection', () => {
    it('should update selected team when user clicks a team', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      });

      const selectButton = screen.getByText('Select Team Beta');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId('team-team2')).toHaveTextContent('Active');
      });
    });

    it('should show Export/Import button when team is selected', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/📥 export \/ import/i)).toBeInTheDocument();
      });
    });

    it('should not show Export/Import button when no team is selected', async () => {
      teamsService.getUserTeams.mockResolvedValue([]);

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/📥 export \/ import/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Create Team Modal', () => {
    it('should not show create modal initially', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.queryByTestId('create-team-modal')).not.toBeInTheDocument();
      });
    });

    it('should show create modal when create button is clicked', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Create Team')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Team');
      fireEvent.click(createButton);

      expect(screen.getByTestId('create-team-modal')).toBeInTheDocument();
    });

    it('should hide create modal when close is clicked', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Create Team')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Team');
      fireEvent.click(createButton);

      expect(screen.getByTestId('create-team-modal')).toBeInTheDocument();

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('create-team-modal')).not.toBeInTheDocument();
    });

    it('should reload teams and select new team after creation', async () => {
      const newTeam = {
        id: 'newTeam123',
        name: 'New Team',
        owner_id: 'user1',
        member_ids: ['user1'],
      };

      teamsService.getUserTeams
        .mockResolvedValueOnce(mockTeams)
        .mockResolvedValueOnce([...mockTeams, newTeam]);

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Create Team')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Team');
      fireEvent.click(createButton);

      const createInModal = screen.getByText('Create');
      fireEvent.click(createInModal);

      await waitFor(() => {
        expect(teamsService.getUserTeams).toHaveBeenCalledTimes(2);
        expect(localStorage.getItem('selectedTeamId')).toBe('newTeam123');
      });
    });
  });

  describe('Edit Team Modal', () => {
    it('should not show edit modal initially', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.queryByTestId('edit-team-modal')).not.toBeInTheDocument();
      });
    });

    it('should show edit modal when edit button is clicked', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Edit Team Alpha')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit Team Alpha');
      fireEvent.click(editButton);

      expect(screen.getByTestId('edit-team-modal')).toBeInTheDocument();
      expect(screen.getByText('Editing Team Alpha')).toBeInTheDocument();
    });

    it('should hide edit modal when close is clicked', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Edit Team Alpha')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit Team Alpha');
      fireEvent.click(editButton);

      expect(screen.getByTestId('edit-team-modal')).toBeInTheDocument();

      const closeButton = screen.getAllByText('Close')[0];
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('edit-team-modal')).not.toBeInTheDocument();
    });

    it('should reload teams after update', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Edit Team Alpha')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit Team Alpha');
      fireEvent.click(editButton);

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(teamsService.getUserTeams).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Export/Import Modal', () => {
    it('should not show export/import modal initially', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.queryByTestId('export-import-modal')).not.toBeInTheDocument();
      });
    });

    it('should show export/import modal when button is clicked', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/📥 export \/ import/i)).toBeInTheDocument();
      });

      const exportImportButton = screen.getByText(/📥 export \/ import/i);
      fireEvent.click(exportImportButton);

      expect(screen.getByTestId('export-import-modal')).toBeInTheDocument();
      expect(screen.getByText('Export/Import for Team Alpha')).toBeInTheDocument();
    });

    it('should hide export/import modal when close is clicked', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/📥 export \/ import/i)).toBeInTheDocument();
      });

      const exportImportButton = screen.getByText(/📥 export \/ import/i);
      fireEvent.click(exportImportButton);

      expect(screen.getByTestId('export-import-modal')).toBeInTheDocument();

      const closeButton = screen.getAllByText('Close')[0];
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('export-import-modal')).not.toBeInTheDocument();
    });

    it('should show export/import modal for currently selected team', async () => {
      localStorage.setItem('selectedTeamId', 'team2');

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/📥 export \/ import/i)).toBeInTheDocument();
      });

      const exportImportButton = screen.getByText(/📥 export \/ import/i);
      fireEvent.click(exportImportButton);

      expect(screen.getByText('Export/Import for Team Beta')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error alert when teams fail to load', async () => {
      teamsService.getUserTeams.mockRejectedValue(new Error('Network error'));

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load teams/i)).toBeInTheDocument();
      });
    });

    it('should allow dismissing error alert', async () => {
      teamsService.getUserTeams.mockRejectedValue(new Error('Network error'));

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load teams/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText(/failed to load teams/i)).not.toBeInTheDocument();
    });
  });

  describe('No Teams State', () => {
    it('should handle user with no teams', async () => {
      teamsService.getUserTeams.mockResolvedValue([]);

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('team-list')).toBeInTheDocument();
      });

      // Should not set any team as selected
      expect(localStorage.getItem('selectedTeamId')).toBeNull();
    });

    it('should not show Export/Import button when no teams', async () => {
      teamsService.getUserTeams.mockResolvedValue([]);

      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/📥 export \/ import/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Page Header', () => {
    it('should display page title and description', async () => {
      render(<TeamsPage />);

      await waitFor(() => {
        expect(screen.getByText('Teams')).toBeInTheDocument();
        expect(screen.getByText(/manage your teams and collaborate/i)).toBeInTheDocument();
      });
    });
  });
});
