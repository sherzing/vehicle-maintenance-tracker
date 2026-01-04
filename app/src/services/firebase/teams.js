import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Create a new team
 * @param {string} userId - User ID of the team creator
 * @param {string} name - Team name
 * @returns {Promise<string>} Team ID
 */
export async function createTeam(userId, name) {
  const teamData = {
    name,
    owner_id: userId,
    member_ids: [userId],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const teamRef = await addDoc(collection(db, 'teams'), teamData);

  // Update user document to include this team
  await addUserToTeam(userId, teamRef.id);

  return teamRef.id;
}

/**
 * Get team by ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Team data
 */
export async function getTeam(teamId) {
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) {
    throw new Error('Team not found');
  }

  return {
    id: teamSnap.id,
    ...teamSnap.data(),
  };
}

/**
 * Get all teams for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of teams
 */
export async function getUserTeams(userId) {
  const teamsQuery = query(
    collection(db, 'teams'),
    where('member_ids', 'array-contains', userId)
  );

  const snapshot = await getDocs(teamsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Add a user to a team
 * @param {string} userId - User ID
 * @param {string} teamId - Team ID
 */
export async function addUserToTeam(userId, teamId) {
  // Update team to add user to member_ids
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    member_ids: arrayUnion(userId),
    updated_at: serverTimestamp(),
  });

  // Update or create user document to add team_id
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      team_ids: arrayUnion(teamId),
    });
  } else {
    // Create user document if it doesn't exist
    await setDoc(userRef, {
      email: '', // Will be populated from auth
      display_name: '', // Will be populated from auth
      team_ids: [teamId],
      created_at: serverTimestamp(),
    });
  }
}

/**
 * Remove a user from a team
 * @param {string} userId - User ID
 * @param {string} teamId - Team ID
 */
export async function removeUserFromTeam(userId, teamId) {
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    member_ids: arrayRemove(userId),
    updated_at: serverTimestamp(),
  });

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    team_ids: arrayRemove(teamId),
  });
}

/**
 * Update team name
 * @param {string} teamId - Team ID
 * @param {string} name - New team name
 */
export async function updateTeamName(teamId, name) {
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    name,
    updated_at: serverTimestamp(),
  });
}
