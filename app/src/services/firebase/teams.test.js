import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTeam,
  getTeam,
  getUserTeams,
  addUserToTeam,
  removeUserFromTeam,
  updateTeamName,
} from './teams';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => 'TIMESTAMP'),
  arrayUnion: vi.fn((value) => ({ _type: 'arrayUnion', value })),
  arrayRemove: vi.fn((value) => ({ _type: 'arrayRemove', value })),
}));

vi.mock('./config', () => ({
  db: {},
}));

describe('teams service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTeam', () => {
    it('should create a team with correct data', async () => {
      const mockTeamRef = { id: 'team123' };
      firestore.addDoc.mockResolvedValue(mockTeamRef);
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ team_ids: [] }),
      });

      const teamId = await createTeam('user123', 'My Team');

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        name: 'My Team',
        owner_id: 'user123',
        member_ids: ['user123'],
      });
      expect(teamId).toBe('team123');
    });
  });

  describe('getTeam', () => {
    it('should return team data when team exists', async () => {
      const mockTeamData = {
        name: 'My Team',
        owner_id: 'user123',
        member_ids: ['user123'],
      };

      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'team123',
        data: () => mockTeamData,
      });

      const team = await getTeam('team123');

      expect(team).toEqual({
        id: 'team123',
        ...mockTeamData,
      });
    });

    it('should throw error when team does not exist', async () => {
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(getTeam('nonexistent')).rejects.toThrow('Team not found');
    });
  });

  describe('getUserTeams', () => {
    it('should return list of teams for user', async () => {
      const mockDocs = [
        {
          id: 'team1',
          data: () => ({ name: 'Team 1', member_ids: ['user123'] }),
        },
        {
          id: 'team2',
          data: () => ({ name: 'Team 2', member_ids: ['user123'] }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const teams = await getUserTeams('user123');

      expect(teams).toHaveLength(2);
      expect(teams[0]).toEqual({
        id: 'team1',
        name: 'Team 1',
        member_ids: ['user123'],
      });
    });
  });

  describe('updateTeamName', () => {
    it('should update team name', async () => {
      await updateTeamName('team123', 'New Team Name');

      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        name: 'New Team Name',
      });
    });
  });

  describe('removeUserFromTeam', () => {
    it('should remove user from team and update user doc', async () => {
      await removeUserFromTeam('user123', 'team123');

      expect(firestore.updateDoc).toHaveBeenCalledTimes(2);
      expect(firestore.arrayRemove).toHaveBeenCalledWith('user123');
      expect(firestore.arrayRemove).toHaveBeenCalledWith('team123');
    });
  });
});
