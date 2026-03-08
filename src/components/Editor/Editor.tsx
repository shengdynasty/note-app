import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Note, ToolType, ShapeType, PageBackground, Stroke, TextBox, ImageObj, TapeObj, ShapeObj, Attachment } from '../../types';
import Toolbar from './Toolbar';
import Canvas, { CanvasHandle, PAGE_WIDTH, PAGE_HEIGHT } from './Canvas';
import PageNav from './PageNav';
import AudioRecorder from './AudioRecorder';
import TranscriptModal from '../Media/TranscriptModal';
import PDFImporter from '../Media/PDFImporter';
import FileAttachments from '../Media/FileAttachments';

interface HistoryEntry {
  strokes: Stroke[];
  textBoxes: TextBox[];
  images: ImageObj[];
  tapes: TapeObj[];
  shapes: ShapeObj[];
}

interface EditorProps {
  note: Note;
  apiKey: string;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Note>) => void;
  onRename: (id: string, title: string) => void;
  onAddPage: (noteId: string, bg?: PageBackground) => void;
  onDeletePage: (noteId: string, pageIndex: number) => void;
  onToggleBookmark: (noteId: string, pageIndex: number) => void;
  onSetApiKey: (key: string) => void;
  onAddAttachment: (noteId: string, attachment: Attachment) => void;
  onRemoveAttachment: (noteId: string, attachmentId: string) => void;
  onOpenLearn: () => void;
}

export default function Editor({
  note, apiKey, onClose, onSave, onRename, onAddPage, onDeletePage, onToggleBookmark, onSetApiKey,
  onAddAttachment, onRemoveAttachment, onOpenLearn,
}: EditorProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(0.4);
  const [shapeType, setShapeType] = useState<ShapeType>('rect');
const [isRecording, setIsRecording] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showPDFImporter, setShowPDFImporter] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  const [strokes, setStrokes] = useState<Stroke[]>(note.strokes);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>(note.textBoxes);
  const [images, setImages] = useState<ImageObj[]>(note.images);
  const [tapes, setTapes] = useState<TapeObj[]>(note.tapes);
  const [shapes, setShapes] = useState<ShapeObj[]>(note.shapes);

  const [history, setHistory] = useState<HistoryEntry[]>([{
    strokes: note.strokes, textBoxes: note.textBoxes, images: note.images, tapes: note.tapes, shapes: note.shapes
  }]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const canvasRef = useRef<CanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const thumbTimer = useRef<ReturnType<typeof setTimeout>>();

  const currentBackground = note.pages[Math.min(currentPage, note.pages.length - 1)]?.background ?? 'ruled';

  // Auto-save with debounce
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(note.id, { strokes, textBoxes, images, tapes, shapes });
      // Generate thumbnail slightly after save
      clearTimeout(thumbTimer.current);
      thumbTimer.current = setTimeout(() => {
        const dataUrl = canvasRef.current?.toDataURL('image/jpeg', 0.55);
        if (dataUrl) onSave(note.id, { thumbnail: dataUrl });
      }, 300);
    }, 800);
    return () => { clearTimeout(saveTimer.current); clearTimeout(thumbTimer.current); };
  }, [strokes, textBoxes, images, tapes, shapes]);

  const takeSnapshot = useCallback(() => {
    const entry: HistoryEntry = { strokes, textBoxes, images, tapes, shapes };
    setHistory(h => [...h.slice(0, historyIdx + 1), entry]);
    setHistoryIdx(i => i + 1);
  }, [strokes, textBoxes, images, tapes, shapes, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const prev = history[historyIdx - 1];
    setStrokes(prev.strokes); setTextBoxes(prev.textBoxes); setImages(prev.images);
    setTapes(prev.tapes); setShapes(prev.shapes); setHistoryIdx(i => i - 1);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    setStrokes(next.strokes); setTextBoxes(next.textBoxes); setImages(next.images);
    setTapes(next.tapes); setShapes(next.shapes); setHistoryIdx(i => i + 1);
  }, [history, historyIdx]);

  const handleBackground = useCallback((bg: PageBackground) => {
    const newPages = note.pages.map((p, i) => i === currentPage ? { ...p, background: bg } : p);
    onSave(note.id, { pages: newPages });
  }, [note, currentPage, onSave]);

  const handleInsertImage = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxW = 400;
        const scale = Math.min(maxW / img.width, 1);
        const newImg: ImageObj = { id: crypto.randomUUID(), x: 80, y: 80, width: img.width * scale, height: img.height * scale, src, pageIndex: currentPage };
        setImages(imgs => [...imgs, newImg]);
        takeSnapshot();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [currentPage, takeSnapshot]);

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [PAGE_WIDTH, PAGE_HEIGHT] });
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    pdf.save(`${note.title}.pdf`);
  }, [note.title]);

  const handleReorderPage = useCallback((from: number, to: number) => {
    const newPages = [...note.pages];
    const [moved] = newPages.splice(from, 1);
    newPages.splice(to, 0, moved);
    onSave(note.id, { pages: newPages });
    if (currentPage === from) setCurrentPage(to);
  }, [note, currentPage, onSave]);

  const handleInsertText = useCallback((text: string) => {
    const id = crypto.randomUUID();
    const newTextBox: TextBox = { id, x: 40, y: 40, width: 720, text, fontSize: 14, fontFamily: 'sans-serif', color: '#000000', bold: false, italic: false, pageIndex: currentPage };
    setTextBoxes(tb => [...tb, newTextBox]);
    takeSnapshot();
  }, [currentPage, takeSnapshot]);

  const handlePDFImport = useCallback((pages: { imageData: string; width: number; height: number }[]) => {
    if (pages.length === 0) return;
    const newImages: ImageObj[] = pages.map((p, i) => ({
      id: crypto.randomUUID(), x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, src: p.imageData, pageIndex: currentPage + i,
    }));
    const extraPagesNeeded = pages.length - (note.pages.length - currentPage);
    if (extraPagesNeeded > 0) {
      for (let i = 0; i < extraPagesNeeded; i++) onAddPage(note.id, 'blank');
    }
    setImages(imgs => [...imgs, ...newImages]);
    takeSnapshot();
  }, [currentPage, note, onAddPage, takeSnapshot]);

  // Zoom wheel handler
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => Math.max(0.25, Math.min(3, z - e.deltaY * 0.001)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y' || (e.shiftKey && e.key === 'z')) { e.preventDefault(); redo(); }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(z => Math.min(3, z + 0.1)); }
        if (e.key === '-') { e.preventDefault(); setZoom(z => Math.max(0.25, z - 0.1)); }
        if (e.key === '0') { e.preventDefault(); setZoom(1); }
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === 'p') setTool('pen');
      if (e.key === 'h') setTool('highlighter');
      if (e.key === 'e') setTool('eraser');
      if (e.key === 't') setTool('text');
      if (e.key === 'l') setTool('lasso');
      if (e.key === 's') setTool('shape');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <div className="editor">
      <Toolbar
        tool={tool} color={color} strokeWidth={strokeWidth} opacity={opacity}
        background={currentBackground} shapeType={shapeType}
        canUndo={historyIdx > 0} canRedo={historyIdx < history.length - 1}
        isRecording={isRecording} showAI={false}
        onTool={setTool} onColor={setColor} onWidth={setStrokeWidth}
        onOpacity={setOpacity} onBackground={handleBackground} onShapeType={setShapeType}
        onUndo={undo} onRedo={redo}
        onInsertImage={handleInsertImage}
        onExport={handleExport}
        onClose={onClose}
        onToggleAI={onOpenLearn}
        onToggleRecording={() => setIsRecording(r => !r)}
        onOpenTranscript={() => setShowTranscript(true)}
        onOpenAttachments={() => setShowAttachments(s => !s)}
        onImportPDF={() => setShowPDFImporter(true)}
        noteTitle={note.title}
        onRenameNote={title => onRename(note.id, title)}
      />

      <div className="editor-body">
        <div className="editor-main">
          <div ref={scrollAreaRef} className="canvas-scroll-area">
            <div className="canvas-center-pad">
              {/* Outer div reserves space for scrolling at the zoomed size */}
              <div style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom, position: 'relative', flexShrink: 0 }}>
                {/* Inner div applies the zoom transform */}
                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT }}>
                  <div className="page-shadow">
                    <Canvas
                      ref={canvasRef}
                      pageIndex={currentPage}
                      background={currentBackground}
                      strokes={strokes} textBoxes={textBoxes} images={images}
                      tapes={tapes} shapes={shapes}
                      tool={tool} color={color} strokeWidth={strokeWidth}
                      opacity={opacity} shapeType={shapeType}
                      onStrokesChange={setStrokes} onTextBoxesChange={setTextBoxes}
                      onImagesChange={setImages} onTapesChange={setTapes} onShapesChange={setShapes}
                      onSnapshot={takeSnapshot}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showAttachments && (
            <div className="attachments-panel">
              <FileAttachments
                attachments={note.attachments ?? []}
                onAdd={att => onAddAttachment(note.id, att)}
                onRemove={id => onRemoveAttachment(note.id, id)}
              />
            </div>
          )}
        </div>

        <PageNav
          pages={note.pages} currentPage={currentPage}
          onPageChange={setCurrentPage}
          onAddPage={bg => onAddPage(note.id, bg)}
          onDeletePage={i => { onDeletePage(note.id, i); if (currentPage >= note.pages.length - 1) setCurrentPage(Math.max(0, note.pages.length - 2)); }}
          onToggleBookmark={i => onToggleBookmark(note.id, i)}
          onReorderPage={handleReorderPage}
        />

      </div>

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} title="Zoom out (Ctrl+-)">−</button>
        <button className="zoom-pct" onClick={() => setZoom(1)} title="Reset zoom (Ctrl+0)">{Math.round(zoom * 100)}%</button>
        <button className="zoom-btn" onClick={() => setZoom(z => Math.min(3, z + 0.1))} title="Zoom in (Ctrl+=)">+</button>
      </div>

      {/* Page indicator */}
      <div className="page-indicator">Page {currentPage + 1} / {note.pages.length}</div>

      {isRecording && (
        <AudioRecorder isRecording={isRecording} onToggle={() => setIsRecording(r => !r)} />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />

      {showTranscript && (
        <TranscriptModal apiKey={apiKey} onClose={() => setShowTranscript(false)} onInsertText={handleInsertText} />
      )}
      {showPDFImporter && (
        <PDFImporter onImport={handlePDFImport} onClose={() => setShowPDFImporter(false)} />
      )}
    </div>
  );
}
