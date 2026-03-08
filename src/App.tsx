import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import Library from './components/Library/Library';
import Editor from './components/Editor/Editor';
import SettingsModal from './components/Settings/SettingsModal';
import LearnPanel from './components/AI/LearnPanel';
import './index.css';

export default function App() {
  const store = useStore();
  const activeNote = store.notes.find(n => n.id === store.activeNoteId);

  const [learnNoteId, setLearnNoteId] = useState<string | null>(null);
  const learnNote = store.notes.find(n => n.id === learnNoteId);

  // Apply CSS theme variables
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(store.currentTheme.vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
    if (store.currentTheme.dark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [store.currentTheme]);

  return (
    <>
      {store.view === 'editor' && activeNote ? (
        <Editor
          note={activeNote}
          apiKey={store.apiKey}
          onClose={store.closeNote}
          onSave={store.saveNote}
          onRename={store.renameNote}
          onAddPage={store.addPage}
          onDeletePage={store.deletePage}
          onToggleBookmark={store.toggleBookmark}
          onSetApiKey={store.setApiKey}
          onAddAttachment={store.addAttachment}
          onRemoveAttachment={store.removeAttachment}
          onOpenLearn={() => setLearnNoteId(activeNote.id)}
        />
      ) : (
        <Library store={store} onOpenLearn={setLearnNoteId} />
      )}

      {store.showSettings && (
        <SettingsModal
          currentThemeId={store.themeId}
          apiKey={store.apiKey}
          onThemeChange={store.setTheme}
          onApiKeyChange={store.setApiKey}
          onClose={store.closeSettings}
        />
      )}

      {learnNote && (
        <LearnPanel
          note={learnNote}
          apiKey={store.apiKey}
          onClose={() => setLearnNoteId(null)}
          onSetApiKey={store.setApiKey}
        />
      )}
    </>
  );
}
