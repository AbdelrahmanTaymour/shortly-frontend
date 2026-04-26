/**
 * store/index.js — Composes and exports the singleton store instance.
 *
 * This is the single import point for the store.
 * Import the store from here, not from Store.js directly.
 *
 * USAGE:
 *   import { store } from '../store/index.js';
 *   store.getState('Auth');
 *   store.subscribe('Links', callback);
 */

import {Store} from './Store.js';
import {createAuthSlice} from './slices/auth.slice.js';
import {createLinksSlice} from './slices/links.slice.js';
import {createAnalyticsSlice} from "./slices/analytics.slice";
import {createProfileSlice} from "./slices/profile.slice";
import {createSettingsSlice} from "./slices/settings.slice";

// Singleton — the same instance is shared by every importer.
export const store = new Store();

// Initialize all slices at module load time.
store.initSlice('auth', createAuthSlice());
store.initSlice('links', createLinksSlice());
store.initSlice('analytics', createAnalyticsSlice());
store.initSlice('profile', createProfileSlice());
store.initSlice('settings', createSettingsSlice());