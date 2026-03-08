import React, { useState } from 'react';
import { themes } from '../../themes';

interface SettingsModalProps {
  currentThemeId: string;
  apiKey: string;
  onThemeChange: (id: string) => void;
  onApiKeyChange: (key: string) => void;
  onClose: () => void;
}

export default function SettingsModal({ currentThemeId, apiKey, onThemeChange, onApiKeyChange, onClose }: SettingsModalProps) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveKey = () => {
    onApiKeyChange(keyInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Theme section */}
          <div className="settings-section">
            <h3>Theme</h3>
            <div className="theme-grid">
              {themes.map(theme => (
                <button key={theme.id}
                  className={`theme-tile ${currentThemeId === theme.id ? 'active' : ''}`}
                  onClick={() => onThemeChange(theme.id)}>
                  <div className="theme-tile-swatch"
                    style={{ background: theme.vars['--bg'], border: `1px solid ${theme.vars['--border']}` }}>
                    <span>{theme.emoji}</span>
                  </div>
                  <span style={{ color: 'var(--text)', fontSize: 11 }}>{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI section */}
          <div className="settings-section">
            <h3>AI Features</h3>
            <div className="settings-row">
              <div>
                <div className="settings-label">Anthropic API Key</div>
                <div className="settings-sublabel">Required for AI summaries, quizzes, flashcards &amp; chat</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                className="settings-input"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-..."
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
              />
              <button className="save-key-btn" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowKey(!showKey)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <button className="save-key-btn" style={{ marginTop: 8, width: '100%' }} onClick={handleSaveKey}>
              {saved ? '✓ Saved!' : 'Save API Key'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
              Get your API key from{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>console.anthropic.com</a>.
              Your key is stored locally and never sent to our servers.
            </p>
          </div>

          {/* About section */}
          <div className="settings-section">
            <h3>About</h3>
            <div className="settings-row">
              <span className="settings-label">Version</span>
              <span style={{ color: 'var(--text3)', fontSize: 13 }}>1.0.0</span>
            </div>
            <div className="settings-row">
              <span className="settings-label">Storage</span>
              <span style={{ color: 'var(--text3)', fontSize: 13 }}>Local (browser)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
