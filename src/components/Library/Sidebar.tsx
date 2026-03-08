import { useState } from 'react';
import { Divider, Subject } from '../../types';
import { SidebarSection } from '../../store/useStore';

interface SidebarProps {
  dividers: Divider[];
  subjects: Subject[];
  notes: { id: string; subjectId: string }[];
  activeSubjectId: string | null;
  sidebarSection: SidebarSection;
  onSelectSubject: (id: string) => void;
  onSidebarSection: (s: SidebarSection) => void;
  onCreateDivider: (name: string) => void;
  onRenameDivider: (id: string, name: string) => void;
  onDeleteDivider: (id: string) => void;
  onCreateSubject: (name: string, dividerId: string) => void;
  onRenameSubject: (id: string, name: string) => void;
  onDeleteSubject: (id: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  dividers, subjects, notes, activeSubjectId, sidebarSection,
  onSelectSubject, onSidebarSection,
  onCreateDivider, onRenameDivider, onDeleteDivider,
  onCreateSubject, onRenameSubject, onDeleteSubject,
  onOpenSettings,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [addingDivider, setAddingDivider] = useState(false);
  const [newDividerName, setNewDividerName] = useState('');
  const [addingSubjectFor, setAddingSubjectFor] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'divider' | 'subject'; id: string } | null>(null);
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedSet(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const startEdit = (id: string, val: string) => { setEditingId(id); setEditVal(val); setContextMenu(null); };
  const commitEdit = (type: 'divider' | 'subject', id: string) => {
    if (editVal.trim()) type === 'divider' ? onRenameDivider(id, editVal.trim()) : onRenameSubject(id, editVal.trim());
    setEditingId(null);
  };
  const noteCount = (subId: string) => notes.filter(n => n.subjectId === subId).length;

  return (
    <div className="nb-sidebar" onClick={() => setContextMenu(null)}>

      {/* Logo */}
      <div className="nb-sidebar-logo">
        <div className="nb-logo-mark">N</div>
        <span className="nb-logo-text">Notability</span>
      </div>

      {/* Quick nav */}
      <div className="nb-sidebar-nav">
        <button className={`nb-nav-item ${sidebarSection === 'all' ? 'active' : ''}`} onClick={() => onSidebarSection('all')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Home</span>
        </button>
        <button className={`nb-nav-item ${sidebarSection === 'recents' ? 'active' : ''}`} onClick={() => onSidebarSection('recents')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Recents</span>
        </button>
        <button className={`nb-nav-item ${sidebarSection === 'favorites' ? 'active' : ''}`} onClick={() => onSidebarSection('favorites')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Favorites</span>
        </button>
      </div>

      <div className="nb-sidebar-section-label">My Library</div>

      {/* Subjects tree */}
      <div className="nb-sidebar-subjects">
        {dividers.map(div => (
          <div key={div.id} className="nb-divider-group">
            <div className="nb-divider-row"
              onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'divider', id: div.id }); }}>
              <button className="nb-divider-chevron"
                style={{ transform: collapsedSet.has(div.id) ? 'rotate(-90deg)' : '' }}
                onClick={() => toggleCollapse(div.id)}>
                <svg width="10" height="7" viewBox="0 0 10 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l4 4 4-4"/></svg>
              </button>
              {editingId === div.id
                ? <input className="inline-edit" value={editVal} autoFocus
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={() => commitEdit('divider', div.id)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit('divider', div.id); }}
                    onClick={e => e.stopPropagation()} />
                : <span className="nb-divider-name">{div.name}</span>}
              <button className="nb-add-subject-btn"
                onClick={e => { e.stopPropagation(); setAddingSubjectFor(div.id); setNewSubjectName(''); }}>+</button>
            </div>

            {!collapsedSet.has(div.id) && (
              <div className="nb-subjects-list">
                {subjects.filter(s => s.dividerId === div.id).map(sub => (
                  <button key={sub.id}
                    className={`nb-subject-item ${sidebarSection === 'subject' && activeSubjectId === sub.id ? 'active' : ''}`}
                    onClick={() => { onSelectSubject(sub.id); onSidebarSection('subject'); }}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'subject', id: sub.id }); }}>
                    <span className="nb-subject-dot" style={{ backgroundColor: sub.color }} />
                    {editingId === sub.id
                      ? <input className="inline-edit" value={editVal} autoFocus style={{ flex: 1 }}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => commitEdit('subject', sub.id)}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit('subject', sub.id); }}
                          onClick={e => e.stopPropagation()} />
                      : <span className="nb-subject-name">{sub.name}</span>}
                    <span className="nb-subject-count">{noteCount(sub.id)}</span>
                  </button>
                ))}
                {addingSubjectFor === div.id && (
                  <div className="nb-subject-item">
                    <span className="nb-subject-dot" style={{ backgroundColor: '#7183A0' }} />
                    <input className="inline-edit" placeholder="Notebook name" value={newSubjectName} autoFocus style={{ flex: 1 }}
                      onChange={e => setNewSubjectName(e.target.value)}
                      onBlur={() => { if (newSubjectName.trim()) onCreateSubject(newSubjectName.trim(), div.id); setAddingSubjectFor(null); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSubjectName.trim()) { onCreateSubject(newSubjectName.trim(), div.id); setAddingSubjectFor(null); }
                        if (e.key === 'Escape') setAddingSubjectFor(null);
                      }} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {addingDivider
          ? <div style={{ padding: '4px 12px' }}>
              <input className="inline-edit" placeholder="Section name" value={newDividerName} autoFocus
                onChange={e => setNewDividerName(e.target.value)}
                onBlur={() => { if (newDividerName.trim()) onCreateDivider(newDividerName.trim()); setAddingDivider(false); setNewDividerName(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newDividerName.trim()) { onCreateDivider(newDividerName.trim()); setAddingDivider(false); setNewDividerName(''); }
                  if (e.key === 'Escape') { setAddingDivider(false); setNewDividerName(''); }
                }} />
            </div>
          : <button className="nb-add-divider-btn" onClick={() => setAddingDivider(true)}>+ Add Section</button>}
      </div>

      {/* Bottom */}
      <div className="nb-sidebar-bottom">
        <button className="nb-settings-btn" onClick={onOpenSettings}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Settings</span>
        </button>
      </div>

      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          <button onClick={() => {
            const name = contextMenu.type === 'divider'
              ? (dividers.find(d => d.id === contextMenu.id)?.name ?? '')
              : (subjects.find(s => s.id === contextMenu.id)?.name ?? '');
            startEdit(contextMenu.id, name);
          }}>Rename</button>
          <button className="danger" onClick={() => {
            contextMenu.type === 'divider' ? onDeleteDivider(contextMenu.id) : onDeleteSubject(contextMenu.id);
            setContextMenu(null);
          }}>Delete</button>
        </div>
      )}
    </div>
  );
}
