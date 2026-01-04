import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import CreateTeamModal from './CreateTeamModal';
import * as teamsService from '../../services/firebase/teams';

vi.mock('../../services/firebase/teams');

describe('CreateTeamModal', () => {
  const mockOnHide = vi.fn();
  const mockOnTeamCreated = vi.fn();
  const userId = 'user123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when show is false', () => {
    render(
      <CreateTeamModal
        show={false}
        onHide={mockOnHide}
        onTeamCreated={mockOnTeamCreated}
        userId={userId}
      />
    );

    expect(screen.queryByText('Create New Team')).not.toBeInTheDocument();
  });

  it('should render when show is true', () => {
    render(
      <CreateTeamModal
        show={true}
        onHide={mockOnHide}
        onTeamCreated={mockOnTeamCreated}
        userId={userId}
      />
    );

    expect(screen.getByText('Create New Team')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter team name')).toBeInTheDocument();
  });

  it('should show error when submitting empty team name', async () => {
    render(
      <CreateTeamModal
        show={true}
        onHide={mockOnHide}
        onTeamCreated={mockOnTeamCreated}
        userId={userId}
      />
    );

    const submitButton = screen.getByText('Create Team');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Team name is required')).toBeInTheDocument();
    });

    expect(teamsService.createTeam).not.toHaveBeenCalled();
  });

  it('should create team successfully', async () => {
    const teamId = 'new-team-id';
    teamsService.createTeam.mockResolvedValue(teamId);

    render(
      <CreateTeamModal
        show={true}
        onHide={mockOnHide}
        onTeamCreated={mockOnTeamCreated}
        userId={userId}
      />
    );

    const input = screen.getByPlaceholderText('Enter team name');
    fireEvent.change(input, { target: { value: 'New Team' } });

    const submitButton = screen.getByText('Create Team');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(teamsService.createTeam).toHaveBeenCalledWith(userId, 'New Team');
      expect(screen.getByText('Team created successfully!')).toBeInTheDocument();
    });

    // Callbacks will be called after 1 second timeout
    await waitFor(() => {
      expect(mockOnTeamCreated).toHaveBeenCalledWith(teamId);
      expect(mockOnHide).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should handle creation error', async () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    teamsService.createTeam.mockRejectedValue(new Error('Failed to create'));

    render(
      <CreateTeamModal
        show={true}
        onHide={mockOnHide}
        onTeamCreated={mockOnTeamCreated}
        userId={userId}
      />
    );

    const input = screen.getByPlaceholderText('Enter team name');
    fireEvent.change(input, { target: { value: 'New Team' } });

    const submitButton = screen.getByText('Create Team');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create')).toBeInTheDocument();
    });

    expect(mockOnTeamCreated).not.toHaveBeenCalled();
    expect(mockOnHide).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
