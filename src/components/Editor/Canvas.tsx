import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { ToolType, Stroke, TextBox, ImageObj, TapeObj, ShapeObj, PageBackground, ShapeType } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;

interface CanvasProps {
  pageIndex: number;
  background: PageBackground;
  strokes: Stroke[];
  textBoxes: TextBox[];
  images: ImageObj[];
  tapes: TapeObj[];
  shapes: ShapeObj[];
  tool: ToolType;
  color: string;
  strokeWidth: number;
  opacity: number;
  shapeType: ShapeType;
  onStrokesChange: (strokes: Stroke[]) => void;
  onTextBoxesChange: (boxes: TextBox[]) => void;
  onImagesChange: (images: ImageObj[]) => void;
  onTapesChange: (tapes: TapeObj[]) => void;
  onShapesChange: (shapes: ShapeObj[]) => void;
  onSnapshot: () => void;
}

export interface CanvasHandle {
  toDataURL: (type?: string, quality?: number) => string;
  getCanvas: () => HTMLCanvasElement | null;
}

function drawBackground(ctx: CanvasRenderingContext2D, bg: PageBackground) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  if (bg === 'ruled') {
    const lineSpacing = 32;
    ctx.strokeStyle = '#c5cfe0'; ctx.lineWidth = 0.7;
    for (let y = 80; y < PAGE_HEIGHT; y += lineSpacing) {
      ctx.beginPath(); ctx.moveTo(62, y); ctx.lineTo(PAGE_WIDTH - 12, y); ctx.stroke();
    }
    ctx.strokeStyle = '#f4a7b5'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(62, 0); ctx.lineTo(62, PAGE_HEIGHT); ctx.stroke();
  } else if (bg === 'grid') {
    ctx.strokeStyle = '#dce5f5'; ctx.lineWidth = 0.6;
    const spacing = 32;
    for (let x = 0; x < PAGE_WIDTH; x += spacing) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, PAGE_HEIGHT); ctx.stroke(); }
    for (let y = 0; y < PAGE_HEIGHT; y += spacing) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PAGE_WIDTH, y); ctx.stroke(); }
  } else if (bg === 'dotted') {
    ctx.fillStyle = '#a8b4c8';
    const spacing = 28;
    for (let x = spacing; x < PAGE_WIDTH; x += spacing)
      for (let y = spacing; y < PAGE_HEIGHT; y += spacing) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
  }
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], pageIndex: number) {
  strokes.filter(s => s.pageIndex === pageIndex).forEach(stroke => {
    const pts = stroke.points;
    if (pts.length < 2) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1;
      ctx.strokeStyle = '#000'; ctx.lineWidth = stroke.width;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i].x + pts[i+1].x)/2, my = (pts[i].y + pts[i+1].y)/2; ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my); }
      ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y); ctx.stroke();
    } else if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = stroke.opacity; ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.lineCap = 'square';
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i].x + pts[i+1].x)/2, my = (pts[i].y + pts[i+1].y)/2; ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my); }
      ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y); ctx.stroke();
    } else {
      ctx.globalAlpha = 1; ctx.strokeStyle = stroke.color;
      const hasPressure = pts.some(p => p.pressure !== undefined && (p.pressure as number) > 0);
      if (hasPressure) {
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i-1], p1 = pts[i];
          const pr = ((p0.pressure ?? 0.7) + (p1.pressure ?? 0.7)) / 2;
          ctx.lineWidth = Math.max(0.5, stroke.width * pr);
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
          if (i < pts.length - 1) { const p2 = pts[i+1]; ctx.quadraticCurveTo(p1.x, p1.y, (p1.x+p2.x)/2, (p1.y+p2.y)/2); }
          else ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      } else {
        ctx.lineWidth = stroke.width;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i].x + pts[i+1].x)/2, my = (pts[i].y + pts[i+1].y)/2; ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my); }
        ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y); ctx.stroke();
      }
    }
    ctx.restore();
  });
}

function drawShapes(ctx: CanvasRenderingContext2D, shapes: ShapeObj[], pageIndex: number) {
  shapes.filter(s => s.pageIndex === pageIndex).forEach(shape => {
    ctx.save(); ctx.strokeStyle = shape.color; ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.fillStyle = shape.color + '22';
    if (shape.type === 'rect') {
      ctx.beginPath(); ctx.rect(shape.x, shape.y, shape.width, shape.height);
      if (shape.filled) ctx.fill(); ctx.stroke();
    } else if (shape.type === 'circle') {
      ctx.beginPath(); ctx.ellipse(shape.x + shape.width/2, shape.y + shape.height/2, Math.abs(shape.width/2), Math.abs(shape.height/2), 0, 0, Math.PI*2);
      if (shape.filled) ctx.fill(); ctx.stroke();
    } else if (shape.type === 'arrow') {
      const ex = shape.x + shape.width, ey = shape.y + shape.height;
      ctx.beginPath(); ctx.moveTo(shape.x, shape.y); ctx.lineTo(ex, ey); ctx.stroke();
      const angle = Math.atan2(ey - shape.y, ex - shape.x), len = Math.max(14, shape.strokeWidth * 4);
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - len*Math.cos(angle-0.45), ey - len*Math.sin(angle-0.45)); ctx.moveTo(ex, ey); ctx.lineTo(ex - len*Math.cos(angle+0.45), ey - len*Math.sin(angle+0.45)); ctx.stroke();
    } else if (shape.type === 'line') {
      ctx.beginPath(); ctx.moveTo(shape.x, shape.y); ctx.lineTo(shape.x + shape.width, shape.y + shape.height); ctx.stroke();
    }
    ctx.restore();
  });
}

function drawTapes(ctx: CanvasRenderingContext2D, tapes: TapeObj[], pageIndex: number) {
  tapes.filter(t => t.pageIndex === pageIndex).forEach(tape => {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = tape.color;
    ctx.fillRect(tape.x, tape.y, tape.width, tape.height); ctx.restore();
  });
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(({
  pageIndex, background, strokes, textBoxes, images, tapes, shapes,
  tool, color, strokeWidth, opacity, shapeType,
  onStrokesChange, onTextBoxesChange, onImagesChange, onTapesChange, onShapesChange, onSnapshot,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const lastMoveRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const [activeTextBox, setActiveTextBox] = useState<string | null>(null);
  const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    toDataURL: (type = 'image/jpeg', quality = 0.8) => canvasRef.current?.toDataURL(type, quality) ?? '',
    getCanvas: () => canvasRef.current,
  }));

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    drawBackground(ctx, background);
    images.filter(img => img.pageIndex === pageIndex).forEach(imgObj => {
      const imgEl = new Image(); imgEl.src = imgObj.src;
      const draw = () => ctx.drawImage(imgEl, imgObj.x, imgObj.y, imgObj.width, imgObj.height);
      if (imgEl.complete) draw();
      else imgEl.onload = () => { draw(); drawStrokes(ctx, strokes, pageIndex); drawShapes(ctx, shapes, pageIndex); drawTapes(ctx, tapes, pageIndex); };
    });
    drawTapes(ctx, tapes, pageIndex);
    drawStrokes(ctx, strokes, pageIndex);
    drawShapes(ctx, shapes, pageIndex);
    if (lassoRect) {
      ctx.save(); ctx.setLineDash([5,4]); ctx.strokeStyle = '#007AFF'; ctx.lineWidth = 1.5;
      ctx.strokeRect(lassoRect.x, lassoRect.y, lassoRect.w, lassoRect.h);
      ctx.fillStyle = 'rgba(0,122,255,0.06)'; ctx.fillRect(lassoRect.x, lassoRect.y, lassoRect.w, lassoRect.h); ctx.restore();
    }
  }, [background, strokes, shapes, tapes, images, pageIndex, lassoRect]);

  useEffect(() => { redraw(); }, [redraw]);

  const getPos = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (PAGE_WIDTH / rect.width), y: (e.clientY - rect.top) * (PAGE_HEIGHT / rect.height) };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    lastMoveRef.current = { time: performance.now(), x, y };
    if (tool === 'text') {
      const newBox: TextBox = { id: uuidv4(), x, y, width: 240, text: '', fontSize: 18, fontFamily: 'Georgia', color, bold: false, italic: false, pageIndex };
      onTextBoxesChange([...textBoxes, newBox]); setActiveTextBox(newBox.id); return;
    }
    if (tool === 'tape' || tool === 'lasso' || tool === 'shape') { shapeStart.current = { x, y }; drawingRef.current = true; return; }
    drawingRef.current = true;
    const isEraser = tool === 'eraser', isHighlighter = tool === 'highlighter';
    const initP = (e.pressure > 0 && e.pointerType === 'pen') ? e.pressure : 0.8;
    currentStroke.current = {
      id: uuidv4(), tool: isEraser ? 'eraser' : isHighlighter ? 'highlighter' : 'pen',
      color: isEraser ? '#ffffff' : color,
      width: isEraser ? strokeWidth * 3 : isHighlighter ? strokeWidth * 3 : strokeWidth,
      opacity: isHighlighter ? opacity : 1,
      points: [{ x, y, pressure: (isEraser || isHighlighter) ? 1 : initP }], pageIndex,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pos = getPos(e);
    if (tool === 'eraser') setEraserPos(pos); else setEraserPos(null);
    if (!drawingRef.current) return;
    if (tool === 'lasso' && shapeStart.current) {
      setLassoRect({ x: Math.min(shapeStart.current.x, pos.x), y: Math.min(shapeStart.current.y, pos.y), w: Math.abs(pos.x - shapeStart.current.x), h: Math.abs(pos.y - shapeStart.current.y) }); return;
    }
    if ((tool === 'shape' || tool === 'tape') && shapeStart.current) {
      redraw();
      const canvas = canvasRef.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const sx = shapeStart.current.x, sy = shapeStart.current.y, w = pos.x - sx, h = pos.y - sy;
      ctx.save(); ctx.setLineDash([5,4]); ctx.lineCap = 'round';
      if (tool === 'tape') { ctx.globalAlpha = 0.5; ctx.fillStyle = color; ctx.fillRect(Math.min(sx,pos.x), Math.min(sy,pos.y), Math.abs(w), Math.abs(h)); }
      else {
        ctx.strokeStyle = color; ctx.lineWidth = strokeWidth;
        if (shapeType === 'rect') ctx.strokeRect(Math.min(sx,pos.x), Math.min(sy,pos.y), Math.abs(w), Math.abs(h));
        else if (shapeType === 'circle') { ctx.beginPath(); ctx.ellipse(sx+w/2, sy+h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI*2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
      }
      ctx.restore(); return;
    }
    if (!currentStroke.current) return;
    const now = performance.now(); const last = lastMoveRef.current;
    let pressure = 1.0;
    if (e.pressure > 0 && e.pointerType === 'pen') { pressure = e.pressure; }
    else if (tool === 'pen' && last) {
      const dt = Math.max(now - last.time, 1), dx = pos.x - last.x, dy = pos.y - last.y;
      pressure = Math.max(0.25, Math.min(1.0, 1.2 - Math.sqrt(dx*dx+dy*dy)/dt * 0.14));
    }
    lastMoveRef.current = { time: now, x: pos.x, y: pos.y };
    currentStroke.current.points.push({ x: pos.x, y: pos.y, pressure });
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pts = currentStroke.current.points;
    if (pts.length < 2) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; ctx.strokeStyle = '#000'; ctx.lineWidth = currentStroke.current.width; }
    else if (tool === 'highlighter') { ctx.globalAlpha = currentStroke.current.opacity; ctx.strokeStyle = currentStroke.current.color; ctx.lineWidth = currentStroke.current.width; ctx.lineCap = 'square'; }
    else {
      ctx.strokeStyle = currentStroke.current.color;
      const p0 = pts[pts.length-2], p1 = pts[pts.length-1];
      ctx.lineWidth = Math.max(0.5, currentStroke.current.width * ((p0.pressure ?? 0.8) + (p1.pressure ?? 0.8)) / 2);
    }
    ctx.beginPath();
    if (pts.length >= 3) { const p0 = pts[pts.length-3], p1 = pts[pts.length-2], p2 = pts[pts.length-1]; ctx.moveTo((p0.x+p1.x)/2, (p0.y+p1.y)/2); ctx.quadraticCurveTo(p1.x, p1.y, (p1.x+p2.x)/2, (p1.y+p2.y)/2); }
    else { ctx.moveTo(pts[pts.length-2].x, pts[pts.length-2].y); ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y); }
    ctx.stroke(); ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (tool === 'lasso') { setLassoRect(null); shapeStart.current = null; return; }
    if (tool === 'tape' && shapeStart.current) {
      const pos = getPos(e);
      const tape: TapeObj = { id: uuidv4(), x: Math.min(shapeStart.current.x, pos.x), y: Math.min(shapeStart.current.y, pos.y), width: Math.abs(pos.x - shapeStart.current.x), height: Math.abs(pos.y - shapeStart.current.y), color, pageIndex };
      if (tape.width > 5 && tape.height > 5) { onTapesChange([...tapes, tape]); onSnapshot(); }
      shapeStart.current = null; redraw(); return;
    }
    if (tool === 'shape' && shapeStart.current) {
      const pos = getPos(e);
      const shape: ShapeObj = { id: uuidv4(), type: shapeType, x: Math.min(shapeStart.current.x, pos.x), y: Math.min(shapeStart.current.y, pos.y), width: pos.x - shapeStart.current.x, height: pos.y - shapeStart.current.y, color, strokeWidth, filled: false, pageIndex };
      if (Math.abs(shape.width) > 5 || Math.abs(shape.height) > 5) { onShapesChange([...shapes, shape]); onSnapshot(); }
      shapeStart.current = null; redraw(); return;
    }
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      onStrokesChange([...strokes, currentStroke.current]); onSnapshot();
      requestAnimationFrame(() => redraw());
    }
    currentStroke.current = null;
  };

  const handleTextChange = (id: string, text: string) => onTextBoxesChange(textBoxes.map(b => b.id === id ? {...b, text} : b));
  const handleTextBlur = (id: string) => {
    setActiveTextBox(null); onSnapshot();
    const box = textBoxes.find(b => b.id === id);
    if (box && !box.text.trim()) onTextBoxesChange(textBoxes.filter(b => b.id !== id));
  };

  void onImagesChange;
  const eraserSize = strokeWidth * 3;

  return (
    <div className="canvas-container" style={{ position: 'relative', width: PAGE_WIDTH, height: PAGE_HEIGHT }}>
      <canvas ref={canvasRef} width={PAGE_WIDTH} height={PAGE_HEIGHT} className="drawing-canvas"
        style={{ cursor: tool === 'eraser' ? 'none' : tool === 'text' ? 'text' : 'crosshair', display: 'block' }}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp} onPointerLeave={() => setEraserPos(null)} />
      {tool === 'eraser' && eraserPos && (
        <div style={{ position: 'absolute', left: eraserPos.x - eraserSize/2, top: eraserPos.y - eraserSize/2, width: eraserSize, height: eraserSize, border: '1.5px solid rgba(0,0,0,0.4)', borderRadius: '50%', pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(255,255,255,0.7)' }} />
      )}
      {textBoxes.filter(b => b.pageIndex === pageIndex).map(box => (
        <div key={box.id} className="text-box"
          style={{ position: 'absolute', left: box.x, top: box.y, minWidth: box.width, color: box.color, fontSize: box.fontSize, fontFamily: box.fontFamily, fontWeight: box.bold ? 'bold' : 'normal', fontStyle: box.italic ? 'italic' : 'normal', pointerEvents: tool === 'text' || activeTextBox === box.id ? 'auto' : 'none' }}
          onClick={e => e.stopPropagation()}>
          <div contentEditable suppressContentEditableWarning className="text-box-inner"
            onInput={e => handleTextChange(box.id, (e.target as HTMLDivElement).innerText)}
            onBlur={() => handleTextBlur(box.id)} onFocus={() => setActiveTextBox(box.id)} />
        </div>
      ))}
    </div>
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;
