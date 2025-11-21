export enum NoteType {
  TEXT = 'TEXT',
  DRAWING = 'DRAWING',
  HYBRID = 'HYBRID' // Contains both
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawingLine {
  points: Point[];
  color: string;
  width: number;
}

export interface DevotionalNote {
  id: string;
  title: string; // Could be the Bible verse reference
  content: string; // Text content
  drawingData?: string; // Base64 data URL of the drawing
  createdAt: number; // Timestamp
  updatedAt: number;
  tags: string[];
  mood?: string; // E.g., 'Grato', 'Reflexivo', 'Triste'
  userId?: string;
}

export type ViewMode = 'LIST' | 'EDITOR';
export type EditorMode = 'WRITE' | 'DRAW';

export interface IconProps {
  className?: string;
}