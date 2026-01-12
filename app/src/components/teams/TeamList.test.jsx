import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeamList from './TeamList';

describe('TeamList', () => {
  const mockOnTeamSelect = vi.fn();
  const mockOnCreateTeam = vi.fn();
  const mockOnEditTeam = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should show empty state when no teams exist', () => {
      render(
        <TeamList
          teams={[]}
          currentTeamId={null}
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText(/you haven't joined any teams yet/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first team/i)).toBeInTheDocument();
    });

    it('should call onCreateTeam when create button is clicked in empty state', () => {
      render(
        <TeamList
          teams={[]}
          currentTeamId={null}
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const createButton = screen.getByText(/create your first team/i);
      fireEvent.click(createButton);

      expect(mockOnCreateTeam).toHaveBeenCalled();
    });

    it('should show empty state when teams is null', () => {
      render(
        <TeamList
          teams={null}
          currentTeamId={null}
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText(/you haven't joined any teams yet/i)).toBeInTheDocument();
    });
  });

  describe('Team List Display', () => {
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
        member_ids: ['user1', 'user2', 'user3'],
      },
    ];

    it('should display header with title and create button', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText(/your teams/i)).toBeInTheDocument();
      expect(screen.getByText(/click a team to set it as active/i)).toBeInTheDocument();
      expect(screen.getByText(/\+ new team/i)).toBeInTheDocument();
    });

    it('should display all teams with names', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });

    it('should display member count for each team', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText('2 members')).toBeInTheDocument();
      expect(screen.getByText('3 members')).toBeInTheDocument();
    });

    it('should display singular "member" for teams with one member', () => {
      const singleMemberTeams = [
        {
          id: 'team1',
          name: 'Solo Team',
          owner_id: 'user1',
          member_ids: ['user1'],
        },
      ];

      render(
        <TeamList
          teams={singleMemberTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText('1 member')).toBeInTheDocument();
    });

    it('should call onCreateTeam when + New Team button is clicked', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const createButton = screen.getByText(/\+ new team/i);
      fireEvent.click(createButton);

      expect(mockOnCreateTeam).toHaveBeenCalled();
    });
  });

  describe('Active Team Badge', () => {
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

    it('should show Active badge on currently selected team', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges).toHaveLength(1);
    });

    it('should not show Active badge on non-selected teams', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      // Only one Active badge should exist
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges).toHaveLength(1);
    });

    it('should not show Active badge when no team is selected', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId={null}
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });

    it('should update Active badge when currentTeamId changes', () => {
      const { rerender } = render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();

      // Change selected team
      rerender(
        <TeamList
          teams={mockTeams}
          currentTeamId="team2"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      // Still only one Active badge, but on different team
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges).toHaveLength(1);
    });
  });

  describe('Team Selection', () => {
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

    it('should call onTeamSelect when team is clicked', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const teamBetaItem = screen.getByText('Team Beta').closest('.list-group-item');
      fireEvent.click(teamBetaItem);

      expect(mockOnTeamSelect).toHaveBeenCalledWith('team2');
    });

    it('should highlight selected team with active class', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const teamAlphaItem = screen.getByText('Team Alpha').closest('.list-group-item');
      expect(teamAlphaItem).toHaveClass('active');
    });

    it('should not highlight non-selected teams', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const teamBetaItem = screen.getByText('Team Beta').closest('.list-group-item');
      expect(teamBetaItem).not.toHaveClass('active');
    });
  });

  describe('Owner Features', () => {
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

    it('should show Owner badge for teams owned by current user', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const ownerBadges = screen.getAllByText('Owner');
      expect(ownerBadges).toHaveLength(1);
    });

    it('should show Edit button for teams owned by current user', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const editButtons = screen.getAllByText('Edit');
      expect(editButtons).toHaveLength(1);
    });

    it('should not show Owner badge for teams not owned by current user', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team2"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      // Only one owner badge (for team1 which is owned by user1)
      const ownerBadges = screen.getAllByText('Owner');
      expect(ownerBadges).toHaveLength(1);
    });

    it('should call onEditTeam when Edit button is clicked', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(mockOnEditTeam).toHaveBeenCalledWith(mockTeams[0]);
    });

    it('should not call onTeamSelect when Edit button is clicked', () => {
      render(
        <TeamList
          teams={mockTeams}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(mockOnTeamSelect).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle team with no member_ids gracefully', () => {
      const teamsWithoutMembers = [
        {
          id: 'team1',
          name: 'Team Alpha',
          owner_id: 'user1',
          member_ids: null,
        },
      ];

      render(
        <TeamList
          teams={teamsWithoutMembers}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText('0 members')).toBeInTheDocument();
    });

    it('should handle team with empty member_ids array', () => {
      const teamsWithEmptyMembers = [
        {
          id: 'team1',
          name: 'Team Alpha',
          owner_id: 'user1',
          member_ids: [],
        },
      ];

      render(
        <TeamList
          teams={teamsWithEmptyMembers}
          currentTeamId="team1"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      expect(screen.getByText('0 members')).toBeInTheDocument();
    });

    it('should render multiple teams correctly', () => {
      const manyTeams = Array.from({ length: 5 }, (_, i) => ({
        id: `team${i}`,
        name: `Team ${i}`,
        owner_id: i === 0 ? 'user1' : 'otherUser',
        member_ids: ['user1', 'user2'],
      }));

      render(
        <TeamList
          teams={manyTeams}
          currentTeamId="team0"
          onTeamSelect={mockOnTeamSelect}
          onCreateTeam={mockOnCreateTeam}
          onEditTeam={mockOnEditTeam}
          userId="user1"
        />
      );

      manyTeams.forEach((team) => {
        expect(screen.getByText(team.name)).toBeInTheDocument();
      });
    });
  });
});
