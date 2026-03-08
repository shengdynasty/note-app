import { Note, Subject, Divider } from '../types';

const KEY = 'notability_data_v2';

interface StoredData {
  dividers: Divider[];
  subjects: Subject[];
  notes: Note[];
  themeId?: string;
  apiKey?: string;
}

export function saveToStorage(data: StoredData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save', e);
  }
}

export function loadFromStorage(): StoredData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
