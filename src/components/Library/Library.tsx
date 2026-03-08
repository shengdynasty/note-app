import React, { useState } from 'react';
import Sidebar from './Sidebar';
import NotesGrid from './NotesGrid';
import { useStore } from '../../store/useStore';

interface LibraryProps {
  store: ReturnType<typeof useStore>;
  onOpenLearn: (noteId: string) => void;
}

export default function Library({ store, onOpenLearn }: LibraryProps) {
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  let displayNotes = store.notes;
  let sectionTitle = 'Home';

  if (store.sidebarSection === 'recents') {
    displayNotes = store.recentNotes;
    sectionTitle = 'Recents';
  } else if (store.sidebarSection === 'favorites') {
    displayNotes = store.favoriteNotes;
    sectionTitle = 'Favorites';
  } else if (store.sidebarSection === 'subject' && store.activeSubjectId) {
    displayNotes = store.notes.filter(n => n.subjectId === store.activeSubjectId);
    const sub = store.subjects.find(s => s.id === store.activeSubjectId);
    sectionTitle = sub?.name ?? 'Notes';
  }

  const handleImportUrl = async () => {
    if (!urlValue.trim()) return;
    setUrlLoading(true);
    setUrlError('');
    try {
      let url = urlValue.trim();
      if (!url.startsWith('http')) url = 'https://' + url;

      // Fetch via CORS proxy
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      const data = await res.json() as { contents: string };
      const html = data.contents ?? '';

      // Extract text from HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // Remove scripts/styles
      doc.querySelectorAll('script,style,nav,footer,header').forEach(el => el.remove());
      const rawText = (doc.body?.innerText ?? doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 4000);
      const pageTitle = doc.title || url;

      // Create note in the active subject or first subject
      const subjectId = store.activeSubjectId ?? store.subjects[0]?.id;
      if (!subjectId) { setUrlError('Please create a subject first.'); setUrlLoading(false); return; }

      // Create note with extracted content
      store.createNote(subjectId);
      // After createNote, the new note is at index 0
      const newNote = store.notes[0];

      // If we have an API key, summarize with Claude
      if (store.apiKey.trim().startsWith('sk-') && rawText) {
        try {
          const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': store.apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 800,
              messages: [{
                role: 'user',
                content: `Extract the key information from this web page and format it as a clean note with bullet points. Page title: "${pageTitle}"\n\nContent:\n${rawText}`,
              }],
            }),
          });
          if (apiRes.ok) {
            const apiData = await apiRes.json() as { content: { text: string }[] };
            const noteContent = apiData.content[0]?.text ?? rawText.slice(0, 500);
            if (newNote) {
              const newBox = { id: crypto.randomUUID(), x: 40, y: 40, width: 720, text: noteContent, fontSize: 14, fontFamily: 'sans-serif', color: '#000000', bold: false, italic: false, pageIndex: 0 };
              store.saveNote(newNote.id, { title: pageTitle.slice(0, 60), textBoxes: [newBox] });
            }
          }
        } catch { /* non-fatal */ }
      } else if (newNote && rawText) {
        const newBox = { id: crypto.randomUUID(), x: 40, y: 40, width: 720, text: rawText.slice(0, 1000), fontSize: 14, fontFamily: 'sans-serif', color: '#000000', bold: false, italic: false, pageIndex: 0 };
        store.saveNote(newNote.id, { title: pageTitle.slice(0, 60), textBoxes: [newBox] });
      }

      setUrlImportOpen(false);
      setUrlValue('');
    } catch {
      setUrlError('Could not import that URL. Try a different page.');
    } finally {
      setUrlLoading(false);
    }
  };

  return (
    <div className="library">
      <Sidebar
        dividers={store.dividers}
        subjects={store.subjects}
        notes={store.notes}
        activeSubjectId={store.activeSubjectId}
        sidebarSection={store.sidebarSection}
        onSelectSubject={store.setActiveSubject}
        onSidebarSection={store.setSidebarSection}
        onCreateDivider={store.createDivider}
        onRenameDivider={store.renameDivider}
        onDeleteDivider={store.deleteDivider}
        onCreateSubject={store.createSubject}
        onRenameSubject={store.renameSubject}
        onDeleteSubject={store.deleteSubject}
        onOpenSettings={store.openSettings}
      />
      <NotesGrid
        notes={displayNotes}
        subjects={store.subjects}
        activeSubjectId={store.sidebarSection === 'subject' ? store.activeSubjectId : null}
        sectionTitle={sectionTitle}
        onOpenNote={store.openNote}
        onCreateNote={store.createNote}
        onDeleteNote={store.deleteNote}
        onRenameNote={store.renameNote}
        onToggleFavorite={store.toggleFavorite}
        onOpenLearn={onOpenLearn}
        onOpenUrlImport={() => setUrlImportOpen(true)}
        onOpenChat={() => {
          const firstNote = displayNotes[0] ?? store.notes[0];
          if (firstNote) onOpenLearn(firstNote.id);
        }}
      />

      {/* URL Import Modal */}
      {urlImportOpen && (
        <div className="modal-overlay" onClick={() => { setUrlImportOpen(false); setUrlError(''); }}>
          <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import from URL</h2>
              <button className="modal-close" onClick={() => { setUrlImportOpen(false); setUrlError(''); }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>
                Paste a web URL to create a note from that page's content.
                {store.apiKey.trim().startsWith('sk-') ? ' Claude will summarize it for you.' : ''}
              </p>
              <input
                className="settings-input"
                placeholder="https://example.com/article"
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleImportUrl(); }}
                autoFocus
              />
              {urlError && <p style={{ color: '#FF3B30', fontSize: 13 }}>{urlError}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => { setUrlImportOpen(false); setUrlError(''); }}>Cancel</button>
                <button className="btn-primary" onClick={handleImportUrl} disabled={urlLoading || !urlValue.trim()}>
                  {urlLoading ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
