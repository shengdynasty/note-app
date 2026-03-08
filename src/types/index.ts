export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'text' | 'lasso' | 'shape' | 'tape';

export type ShapeType = 'rect' | 'circle' | 'arrow' | 'line';

export type PageBackground = 'blank' | 'ruled' | 'grid' | 'dotted';

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  width: number;
  opacity: number;
  points: { x: number; y: number; pressure?: number }[];
  pageIndex: number;
}

export interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  pageIndex: number;
}

export interface ImageObj {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  pageIndex: number;
}

export interface TapeObj {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  pageIndex: number;
}

export interface ShapeObj {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
  pageIndex: number;
}

export interface Page {
  id: string;
  background: PageBackground;
  bookmarked: boolean;
}

export interface AudioSegment {
  id: string;
  startTime: number;  // ms into the recording
  text: string;       // transcript text
  timestamp: number;  // wall-clock when written
}

export interface Attachment {
  id: string;
  name: string;
  type: string;      // MIME type
  size: number;      // bytes
  data: string;      // base64 data URL
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  subjectId: string;
  createdAt: number;
  updatedAt: number;
  favorited: boolean;
  pages: Page[];
  strokes: Stroke[];
  textBoxes: TextBox[];
  images: ImageObj[];
  tapes: TapeObj[];
  shapes: ShapeObj[];
  audioSegments: AudioSegment[];
  attachments: Attachment[];
  thumbnail?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  dividerId: string;
}

export interface Divider {
  id: string;
  name: string;
}
