// Firebase has been completely removed in favor of SecureNodeX Native Cluster Auth.
import { authService } from '../lib/auth';

export const auth = {
  currentUser: authService.getCurrentUser(),
  signOut: async () => authService.logout(),
};

export const db = {};
export const storage = {};
export const functions = {};

export default { auth, db, storage, functions };
