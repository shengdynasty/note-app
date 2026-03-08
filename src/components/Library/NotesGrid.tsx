import React, { useState } from 'react';
import { Note, Subject } from '../../types';

interface NotesGridProps {
  notes: Note[];
  subjects: Subject[];
  activeSubjectId: string | null;
  sectionTitle: string;
  onOpenNote: (id: string) => void;
  onCreateNote: (subjectId: string) => void;
  onDeleteNote: (id: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenLearn: (id: string) => void;
  onOpenUrlImport: () => void;
  onOpenChat: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts), now = new Date(), diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotesGrid({
  notes, subjects, activeSubjectId, sectionTitle,
  onOpenNote, onCreateNote, onDeleteNote, onRenameNote, onToggleFavorite,
  onOpenLearn, onOpenUrlImport, onOpenChat,
}: NotesGridProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');

  const sorted = [...notes].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'created') return b.createdAt - a.createdAt;
    return b.updatedAt - a.updatedAt;
  });
  const filtered = sorted.filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()));
  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  const startRename = (noteId: string, title: string) => { setEditingId(noteId); setEditVal(title); setContextMenu(null); };
  const commitRename = (noteId: string) => { if (editVal.trim()) onRenameNote(noteId, editVal.trim()); setEditingId(null); };

  return (
    <div className="notes-panel" onClick={() => setContextMenu(null)}>

      {/* ── Top header bar ── */}
      <div className="notes-topbar">
        <div className="notes-topbar-left">
          <h1 className="notes-topbar-title">
            {activeSubject && <span className="topbar-dot" style={{ backgroundColor: activeSubject.color }} />}
            {sectionTitle}
          </h1>
        </div>
        <div className="notes-topbar-right">
          <div className="nb-search-box">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ color: 'var(--text3)', fontSize: 12 }}>✕</button>}
          </div>
          <div className="nb-view-toggle">
            <button className={`nb-view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
            </button>
            <button className={`nb-view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="12" width="14" height="2" rx="1"/></svg>
            </button>
          </div>
          <select className="nb-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="updated">Last edited</option>
            <option value="created">Date created</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      {/* ── Centered Action Bar ── */}
      <div className="nb-action-center">
        <div className="nb-action-bar">
          <button className="nb-action-url" onClick={onOpenUrlImport}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span>Import from URL</span>
          </button>

          <div className="nb-action-divider" />

          <button className="nb-action-btn" onClick={onOpenChat}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Chat</span>
          </button>

          <div className="nb-action-divider" />

          <button className="nb-action-new"
            onClick={() => { const sub = activeSubjectId ?? subjects[0]?.id; if (sub) onCreateNote(sub); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* ── Notes count ── */}
      {filtered.length > 0 && (
        <div className="nb-notes-meta">
          <span className="nb-notes-count">{filtered.length} note{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Notes ── */}
      {filtered.length === 0 ? (
        <div className="notes-empty">
          <div className="notes-empty-icon">📄</div>
          <p>{search ? 'No notes match your search' : 'No notes yet'}</p>
          {(activeSubjectId || subjects.length > 0) && !search && (
            <button className="btn-primary" style={{ marginTop: 12 }}
              onClick={() => { const sub = activeSubjectId ?? subjects[0]?.id; if (sub) onCreateNote(sub); }}>
              Create your first note
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="nb-notes-grid">
          {filtered.map(note => {
            const subject = subjects.find(s => s.id === note.subjectId);
            return (
              <div key={note.id} className="nb-note-card"
                onClick={() => onOpenNote(note.id)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id }); }}
                onDoubleClick={() => startRename(note.id, note.title)}>

                <div className="nb-card-thumb">
                  {note.thumbnail
                    ? <img src={note.thumbnail} alt="" className="nb-card-thumb-img" />
                    : <div className="nb-card-thumb-lines">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="nb-card-thumb-line"
                            style={{ width: i % 3 === 0 ? '50%' : i % 2 === 0 ? '80%' : '65%' }} />
                        ))}
                      </div>}

                  <button className="nb-learn-badge"
                    onClick={e => { e.stopPropagation(); onOpenLearn(note.id); }}>
                    ✦ Learn
                  </button>

                  {note.favorited && <div className="nb-fav-star">★</div>}
                  {subject && <div className="nb-subject-bar" style={{ backgroundColor: subject.color }} />}
                </div>

                <div className="nb-card-info">
                  {editingId === note.id
                    ? <input className="inline-edit" value={editVal} autoFocus
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => commitRename(note.id)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(note.id); if (e.key === 'Escape') setEditingId(null); }}
                        onClick={e => e.stopPropagation()} />
                    : <div className="nb-card-title">{note.title}</div>}
                  <div className="nb-card-meta">
                    {subject && (
                      <span className="nb-card-subject" style={{ color: subject.color }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: subject.color, marginRight: 4, flexShrink: 0 }} />
                        {subject.name}
                      </span>
                    )}
                    <span className="nb-card-date">{formatDate(note.updatedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="nb-notes-list">
          {filtered.map(note => {
            const subject = subjects.find(s => s.id === note.subjectId);
            return (
              <div key={note.id} className="nb-list-row"
                onClick={() => onOpenNote(note.id)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id }); }}>
                <div className="nb-list-thumb">
                  {note.thumbnail
                    ? <img src={note.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text3)', background: 'var(--surface2)', borderRadius: 6 }}>📄</div>}
                </div>
                <div className="nb-list-info">
                  {editingId === note.id
                    ? <input className="inline-edit" value={editVal} autoFocus
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => commitRename(note.id)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(note.id); if (e.key === 'Escape') setEditingId(null); }}
                        onClick={e => e.stopPropagation()} />
                    : <span className="nb-list-title">{note.title}</span>}
                  <div className="nb-list-sub">
                    {subject && <span style={{ color: subject.color, fontSize: 11, fontWeight: 600 }}>● {subject.name}</span>}
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(note.updatedAt)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{note.pages.length}p</span>
                  </div>
                </div>
                <div className="nb-list-actions">
                  {note.favorited && <span style={{ fontSize: 13, color: '#F59500' }}>★</span>}
                  <button className="nb-list-learn-btn" onClick={e => { e.stopPropagation(); onOpenLearn(note.id); }} title="Learn">✦</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { onOpenNote(contextMenu.noteId); setContextMenu(null); }}>Open</button>
          <button onClick={() => { onOpenLearn(contextMenu.noteId); setContextMenu(null); }}>✦ Study with Learn</button>
          <button onClick={() => { const n = notes.find(n => n.id === contextMenu.noteId); if (n) startRename(n.id, n.title); }}>Rename</button>
          <button onClick={() => { onToggleFavorite(contextMenu.noteId); setContextMenu(null); }}>
            {notes.find(n => n.id === contextMenu.noteId)?.favorited ? 'Remove from Favorites' : 'Add to Favorites'}
          </button>
          <button className="danger" onClick={() => { onDeleteNote(contextMenu.noteId); setContextMenu(null); }}>Delete</button>
        </div>
      )}
    </div>
  );
}
