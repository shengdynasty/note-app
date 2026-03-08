import React, { useState } from 'react';
import { ToolType, PageBackground, ShapeType } from '../../types';

const COLORS = [
  '#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#00C7BE', '#007AFF', '#5856D6', '#AF52DE',
  '#FF2D55', '#A2845E', '#636366', '#8E8E93',
];

const WIDTHS = [1, 2, 4, 6, 10, 16];

interface ToolbarProps {
  tool: ToolType;
  color: string;
  strokeWidth: number;
  opacity: number;
  background: PageBackground;
  shapeType: ShapeType;
  canUndo: boolean;
  canRedo: boolean;
  isRecording: boolean;
  showAI: boolean;
  onTool: (t: ToolType) => void;
  onColor: (c: string) => void;
  onWidth: (w: number) => void;
  onOpacity: (o: number) => void;
  onBackground: (b: PageBackground) => void;
  onShapeType: (s: ShapeType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onInsertImage: () => void;
  onExport: () => void;
  onClose: () => void;
  onToggleAI: () => void;
  onToggleRecording: () => void;
  onOpenTranscript: () => void;
  onOpenAttachments: () => void;
  onImportPDF: () => void;
  noteTitle: string;
  onRenameNote: (title: string) => void;
}

export default function Toolbar({
  tool, color, strokeWidth, opacity, background, shapeType,
  canUndo, canRedo, isRecording, showAI,
  onTool, onColor, onWidth, onOpacity, onBackground, onShapeType,
  onUndo, onRedo, onInsertImage, onExport, onClose, onToggleAI, onToggleRecording,
  onOpenTranscript, onOpenAttachments, onImportPDF,
  noteTitle, onRenameNote,
}: ToolbarProps) {
  const [showColor, setShowColor] = useState(false);
  const [showWidth, setShowWidth] = useState(false);
  const [showBg, setShowBg] = useState(false);
  const [showShape, setShowShape] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(noteTitle);

  const closeAll = () => { setShowColor(false); setShowWidth(false); setShowBg(false); setShowShape(false); setShowMore(false); };

  const tools: { id: ToolType; icon: string; label: string }[] = [
    { id: 'pen', icon: '✏️', label: 'Pen' },
    { id: 'highlighter', icon: '🖊', label: 'Hi-lite' },
    { id: 'eraser', icon: '⬜', label: 'Eraser' },
    { id: 'lasso', icon: '⬡', label: 'Lasso' },
    { id: 'text', icon: 'T', label: 'Text' },
    { id: 'shape', icon: '◯', label: 'Shape' },
    { id: 'tape', icon: '▬', label: 'Tape' },
  ];

  const backgrounds: { id: PageBackground; icon: string; label: string }[] = [
    { id: 'blank', icon: '□', label: 'Blank' },
    { id: 'ruled', icon: '≡', label: 'Ruled' },
    { id: 'grid', icon: '⊞', label: 'Grid' },
    { id: 'dotted', icon: '⠿', label: 'Dotted' },
  ];

  const shapes: { id: ShapeType; icon: string; label: string }[] = [
    { id: 'rect', icon: '▭', label: 'Rectangle' },
    { id: 'circle', icon: '○', label: 'Circle' },
    { id: 'arrow', icon: '→', label: 'Arrow' },
    { id: 'line', icon: '—', label: 'Line' },
  ];

  return (
    <div className="toolbar" onClick={closeAll}>
      {/* Left: back + title */}
      <div className="toolbar-left">
        <button className="back-btn" onClick={onClose}>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 1L1 6l5 5"/></svg>
          Library
        </button>
        <div className="toolbar-title-wrap">
          {editingTitle ? (
            <input className="toolbar-title-input" value={titleVal} autoFocus
              onChange={e => setTitleVal(e.target.value)}
              onBlur={() => { onRenameNote(titleVal); setEditingTitle(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onRenameNote(titleVal); setEditingTitle(false); } }} />
          ) : (
            <span className="toolbar-title" onDoubleClick={() => { setTitleVal(noteTitle); setEditingTitle(true); }}>
              {noteTitle}
            </span>
          )}
        </div>
      </div>

      {/* Center: tools */}
      <div className="toolbar-center">
        <div className="tool-group">
          {tools.map(t => (
            <button key={t.id}
              className={`toolbar-tool-btn ${tool === t.id ? 'active' : ''}`}
              onClick={e => { e.stopPropagation(); onTool(t.id); }}
              title={t.label}>
              <span className="tool-icon">{t.icon}</span>
              <span className="tool-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        {/* Color picker */}
        <div className="toolbar-popup-wrap" onClick={e => e.stopPropagation()}>
          <button className="color-btn" style={{ backgroundColor: color }}
            onClick={() => { setShowColor(!showColor); setShowWidth(false); setShowBg(false); setShowShape(false); }} />
          {showColor && (
            <div className="popup-panel color-popup">
              <div className="color-grid">
                {COLORS.map(c => (
                  <button key={c} className={`color-swatch ${color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c, border: c === '#FFFFFF' ? '1px solid var(--border)' : undefined }}
                    onClick={() => { onColor(c); setShowColor(false); }} />
                ))}
              </div>
              <div className="custom-color-row">
                <span>Custom:</span>
                <input type="color" value={color} onChange={e => onColor(e.target.value)} />
              </div>
              {(tool === 'highlighter' || tool === 'tape') && (
                <div className="opacity-row">
                  <span>Opacity: {Math.round(opacity * 100)}%</span>
                  <input type="range" min="0.1" max="0.9" step="0.05" value={opacity}
                    onChange={e => onOpacity(Number(e.target.value))} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Width picker */}
        <div className="toolbar-popup-wrap" onClick={e => e.stopPropagation()}>
          <button className="toolbar-btn width-btn"
            onClick={() => { setShowWidth(!showWidth); setShowColor(false); setShowBg(false); setShowShape(false); }}
            title="Stroke width">
            <div className="width-preview" style={{ height: Math.min(strokeWidth, 10), backgroundColor: color }} />
          </button>
          {showWidth && (
            <div className="popup-panel width-popup">
              {WIDTHS.map(w => (
                <button key={w} className={`width-option ${strokeWidth === w ? 'selected' : ''}`}
                  onClick={() => { onWidth(w); setShowWidth(false); }}>
                  <div className="width-line" style={{ height: Math.min(w, 12), backgroundColor: color }} />
                  <span>{w}px</span>
                </button>
              ))}
              <div className="custom-width-row">
                <span>Size: {strokeWidth}px</span>
                <input type="range" min="1" max="50" value={strokeWidth} onChange={e => onWidth(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        <div className="toolbar-divider" />

        {/* Background */}
        <div className="toolbar-popup-wrap" onClick={e => e.stopPropagation()}>
          <button className="toolbar-btn" title="Page style"
            onClick={() => { setShowBg(!showBg); setShowColor(false); setShowWidth(false); setShowShape(false); }}>
            <span style={{ fontSize: 16 }}>📄</span>
          </button>
          {showBg && (
            <div className="popup-panel bg-popup">
              {backgrounds.map(b => (
                <button key={b.id} className={`bg-option ${background === b.id ? 'selected' : ''}`}
                  onClick={() => { onBackground(b.id); setShowBg(false); }}>
                  <span className="bg-option-icon">{b.icon}</span>
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shape type (only when shape tool active) */}
        {tool === 'shape' && (
          <div className="toolbar-popup-wrap" onClick={e => e.stopPropagation()}>
            <button className="toolbar-btn" title="Shape type"
              onClick={() => { setShowShape(!showShape); setShowColor(false); setShowWidth(false); setShowBg(false); }}>
              {shapes.find(s => s.id === shapeType)?.icon ?? '▭'}
            </button>
            {showShape && (
              <div className="popup-panel shape-popup">
                {shapes.map(s => (
                  <button key={s.id} className={`shape-option ${shapeType === s.id ? 'selected' : ''}`}
                    onClick={() => { onShapeType(s.id); setShowShape(false); }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="toolbar-divider" />

        {/* More menu */}
        <div className="toolbar-popup-wrap" onClick={e => e.stopPropagation()}>
          <button className="toolbar-btn" title="More"
            onClick={() => { setShowMore(!showMore); setShowColor(false); setShowWidth(false); setShowBg(false); setShowShape(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
          {showMore && (
            <div className="popup-panel more-popup">
              <button className="more-menu-item" onClick={() => { onInsertImage(); setShowMore(false); }}>
                <span>🖼</span> Insert Image
              </button>
              <button className="more-menu-item" onClick={() => { onImportPDF(); setShowMore(false); }}>
                <span>📄</span> Import PDF
              </button>
              <button className="more-menu-item" onClick={() => { onOpenTranscript(); setShowMore(false); }}>
                <span>🎬</span> Transcript
              </button>
              <button className="more-menu-item" onClick={() => { onOpenAttachments(); setShowMore(false); }}>
                <span>📎</span> Attachments
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: undo/redo/record/AI/export */}
      <div className="toolbar-right">
        <button className="toolbar-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩</button>
        <button className="toolbar-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">↪</button>

        <div className="toolbar-divider" />

        {/* Audio record */}
        <button
          className={`toolbar-btn ${isRecording ? 'recording-btn' : ''}`}
          onClick={onToggleRecording}
          title={isRecording ? 'Stop recording' : 'Record audio'}
          style={{ color: isRecording ? '#FF3B30' : undefined }}>
          {isRecording ? '⏹' : '🎙'}
        </button>

        {/* AI button */}
        <button className="ai-toolbar-btn" onClick={onToggleAI}>
          ✦ AI
        </button>

        <button className="export-btn toolbar-btn" onClick={onExport}>⬇ PDF</button>
      </div>
    </div>
  );
}
