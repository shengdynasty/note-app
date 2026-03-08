import { useState, useCallback } from 'react';
import { Note, Subject, Divider, Page, PageBackground, Attachment } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { saveToStorage, loadFromStorage } from '../utils/storage';
import { themes, defaultTheme, Theme } from '../themes';

const DEFAULT_COLORS = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#00C7BE', '#FF2D55', '#5856D6'];

export type SidebarSection = 'all' | 'recents' | 'favorites' | 'subject';

function createDefaultData() {
  const div1: Divider = { id: uuidv4(), name: 'Personal' };
  const div2: Divider = { id: uuidv4(), name: 'Work' };
  const sub1: Subject = { id: uuidv4(), name: 'Journal', color: '#007AFF', dividerId: div1.id };
  const sub2: Subject = { id: uuidv4(), name: 'Ideas', color: '#34C759', dividerId: div1.id };
  const sub3: Subject = { id: uuidv4(), name: 'Meetings', color: '#FF3B30', dividerId: div2.id };
  const sub4: Subject = { id: uuidv4(), name: 'Research', color: '#FF9500', dividerId: div2.id };
  const note1: Note = {
    id: uuidv4(), title: 'Welcome to Notability', subjectId: sub1.id,
    createdAt: Date.now(), updatedAt: Date.now(), favorited: false,
    pages: [{ id: uuidv4(), background: 'ruled', bookmarked: false }],
    strokes: [], textBoxes: [], images: [], tapes: [], shapes: [], audioSegments: [], attachments: [],
  };
  const note2: Note = {
    id: uuidv4(), title: 'Meeting Notes', subjectId: sub3.id,
    createdAt: Date.now() - 86400000, updatedAt: Date.now() - 3600000, favorited: true,
    pages: [{ id: uuidv4(), background: 'ruled', bookmarked: false }],
    strokes: [], textBoxes: [], images: [], tapes: [], shapes: [], audioSegments: [], attachments: [],
  };
  return { dividers: [div1, div2], subjects: [sub1, sub2, sub3, sub4], notes: [note1, note2] };
}

interface AppState {
  dividers: Divider[];
  subjects: Subject[];
  notes: Note[];
  activeNoteId: string | null;
  activeSubjectId: string | null;
  sidebarSection: SidebarSection;
  view: 'library' | 'editor';
  themeId: string;
  apiKey: string;
  showSettings: boolean;
}

function loadInitialState(): AppState {
  const saved = loadFromStorage();
  const base = (saved != null && Array.isArray(saved.notes) && saved.notes.length > 0)
    ? { dividers: saved.dividers ?? [], subjects: saved.subjects ?? [], notes: saved.notes }
    : createDefaultData();
  return {
    ...base,
    activeNoteId: null,
    activeSubjectId: base.subjects[0]?.id ?? null,
    sidebarSection: 'subject',
    view: 'library',
    themeId: saved?.themeId ?? 'light',
    apiKey: saved?.apiKey ?? '',

    showSettings: false,
  };
}

export function useStore() {
  const [state, setState] = useState<AppState>(loadInitialState);

  const save = useCallback((s: AppState) => {
    saveToStorage({ dividers: s.dividers, subjects: s.subjects, notes: s.notes, themeId: s.themeId, apiKey: s.apiKey });
  }, []);

  const update = useCallback((updater: (s: AppState) => AppState) => {
    setState(prev => { const next = updater(prev); save(next); return next; });
  }, [save]);

  const currentTheme: Theme = themes.find(t => t.id === state.themeId) ?? defaultTheme;
  const setTheme = useCallback((id: string) => update(s => ({ ...s, themeId: id })), [update]);
  const setApiKey = useCallback((key: string) => update(s => ({ ...s, apiKey: key })), [update]);
  const openSettings = useCallback(() => setState(s => ({ ...s, showSettings: true })), []);
  const closeSettings = useCallback(() => setState(s => ({ ...s, showSettings: false })), []);

  const createDivider = useCallback((name: string) => {
    const d: Divider = { id: uuidv4(), name };
    update(s => ({ ...s, dividers: [...s.dividers, d] }));
  }, [update]);
  const renameDivider = useCallback((id: string, name: string) => {
    update(s => ({ ...s, dividers: s.dividers.map(d => d.id === id ? { ...d, name } : d) }));
  }, [update]);
  const deleteDivider = useCallback((id: string) => {
    update(s => ({ ...s, dividers: s.dividers.filter(d => d.id !== id), subjects: s.subjects.filter(sub => sub.dividerId !== id) }));
  }, [update]);

  const createSubject = useCallback((name: string, dividerId: string) => {
    const color = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
    const sub: Subject = { id: uuidv4(), name, color, dividerId };
    update(s => ({ ...s, subjects: [...s.subjects, sub], activeSubjectId: sub.id, sidebarSection: 'subject' }));
  }, [update]);
  const renameSubject = useCallback((id: string, name: string) => {
    update(s => ({ ...s, subjects: s.subjects.map(sub => sub.id === id ? { ...sub, name } : sub) }));
  }, [update]);
  const deleteSubject = useCallback((id: string) => {
    update(s => ({
      ...s, subjects: s.subjects.filter(sub => sub.id !== id),
      notes: s.notes.filter(n => n.subjectId !== id),
      activeSubjectId: s.subjects.find(sub => sub.id !== id)?.id ?? null,
    }));
  }, [update]);

  const createNote = useCallback((subjectId: string) => {
    const note: Note = {
      id: uuidv4(), title: 'Untitled Note', subjectId,
      createdAt: Date.now(), updatedAt: Date.now(), favorited: false,
      pages: [{ id: uuidv4(), background: 'ruled', bookmarked: false }],
      strokes: [], textBoxes: [], images: [], tapes: [], shapes: [], audioSegments: [], attachments: [],
    };
    update(s => ({ ...s, notes: [note, ...s.notes], activeNoteId: note.id, view: 'editor' }));
  }, [update]);

  const openNote = useCallback((id: string) => {
    update(s => ({ ...s, activeNoteId: id, view: 'editor' }));
  }, [update]);
  const closeNote = useCallback(() => {
    update(s => ({ ...s, activeNoteId: null, view: 'library' }));
  }, [update]);
  const renameNote = useCallback((id: string, title: string) => {
    update(s => ({ ...s, notes: s.notes.map(n => n.id === id ? { ...n, title, updatedAt: Date.now() } : n) }));
  }, [update]);
  const deleteNote = useCallback((id: string) => {
    update(s => ({
      ...s, notes: s.notes.filter(n => n.id !== id),
      activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
      view: s.activeNoteId === id ? 'library' : s.view,
    }));
  }, [update]);
  const toggleFavorite = useCallback((id: string) => {
    update(s => ({ ...s, notes: s.notes.map(n => n.id === id ? { ...n, favorited: !n.favorited } : n) }));
  }, [update]);
  const saveNote = useCallback((id: string, updates: Partial<Note>) => {
    update(s => ({ ...s, notes: s.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n) }));
  }, [update]);

  const addPage = useCallback((noteId: string, background: PageBackground = 'ruled') => {
    const page: Page = { id: uuidv4(), background, bookmarked: false };
    update(s => ({ ...s, notes: s.notes.map(n => n.id === noteId ? { ...n, pages: [...n.pages, page] } : n) }));
    return page;
  }, [update]);
  const deletePage = useCallback((noteId: string, pageIndex: number) => {
    update(s => ({
      ...s, notes: s.notes.map(n => {
        if (n.id !== noteId || n.pages.length <= 1) return n;
        return {
          ...n, pages: n.pages.filter((_, i) => i !== pageIndex),
          strokes: n.strokes.filter(st => st.pageIndex !== pageIndex)
            .map(st => ({ ...st, pageIndex: st.pageIndex > pageIndex ? st.pageIndex - 1 : st.pageIndex })),
        };
      })
    }));
  }, [update]);
  const toggleBookmark = useCallback((noteId: string, pageIndex: number) => {
    update(s => ({
      ...s, notes: s.notes.map(n => {
        if (n.id !== noteId) return n;
        return { ...n, pages: n.pages.map((p, i) => i === pageIndex ? { ...p, bookmarked: !p.bookmarked } : p) };
      })
    }));
  }, [update]);

  const addAttachment = useCallback((noteId: string, attachment: Attachment) => {
    update(s => ({
      ...s, notes: s.notes.map(n =>
        n.id === noteId ? { ...n, attachments: [...(n.attachments ?? []), attachment], updatedAt: Date.now() } : n
      )
    }));
  }, [update]);
  const removeAttachment = useCallback((noteId: string, attachmentId: string) => {
    update(s => ({
      ...s, notes: s.notes.map(n =>
        n.id === noteId ? { ...n, attachments: (n.attachments ?? []).filter(a => a.id !== attachmentId), updatedAt: Date.now() } : n
      )
    }));
  }, [update]);

  const setActiveSubject = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, activeSubjectId: id, sidebarSection: 'subject' }));
  }, []);
  const setSidebarSection = useCallback((section: SidebarSection) => {
    setState(prev => ({ ...prev, sidebarSection: section }));
  }, []);

  const recentNotes = [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20);
  const favoriteNotes = state.notes.filter(n => n.favorited);

  return {
    ...state,
    currentTheme, recentNotes, favoriteNotes,
    setTheme, setApiKey, openSettings, closeSettings,
    createDivider, renameDivider, deleteDivider,
    createSubject, renameSubject, deleteSubject,
    createNote, openNote, closeNote, renameNote, deleteNote, toggleFavorite, saveNote,
    addPage, deletePage, toggleBookmark,
    addAttachment, removeAttachment,
    setActiveSubject, setSidebarSection,
  };
}
