import React, { useRef, useEffect, useState } from 'react';
import { EraserIcon, PencilIcon, TrashIcon } from './Icons';

interface CanvasProps {
  initialImage?: string;
  onSave: (dataUrl: string) => void;
  readOnly?: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({ initialImage, onSave, readOnly = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1e1b4b'); // Indigo-950
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Set resolution fix for high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Load initial image if exists
      if (initialImage) {
        const img = new Image();
        img.onload = () => {
            // Draw image fitting the canvas 
            ctx.drawImage(img, 0, 0, container.clientWidth, container.clientHeight);
        };
        img.src = initialImage;
      }
    }
  }, [initialImage]); // Re-run if initialImage changes significantly, though we mostly care on mount

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    
    // Get coordinates
    const { x, y } = getCoordinates(e, canvas);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? 20 : lineWidth;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
        onSave(canvas.toDataURL('image/png'));
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Correctly clear based on scaled size
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    onSave('');
  };

  return (
    <div className="flex flex-col h-full relative">
      {!readOnly && (
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
            {/* Toolbar */}
            <div className="bg-white/90 backdrop-blur-sm shadow-md rounded-full px-4 py-2 flex gap-4 pointer-events-auto border border-indigo-100">
                <button 
                    onClick={() => setIsEraser(false)}
                    className={`p-2 rounded-full transition-colors ${!isEraser ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-500'}`}
                >
                    <PencilIcon className="w-5 h-5" />
                </button>
                
                <div className="w-px h-6 bg-gray-200 my-auto"></div>

                <div className="flex items-center gap-2">
                    <button onClick={() => { setColor('#1e1b4b'); setIsEraser(false); }} className={`w-5 h-5 rounded-full bg-indigo-950 ${color === '#1e1b4b' && !isEraser ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`} />
                    <button onClick={() => { setColor('#dc2626'); setIsEraser(false); }} className={`w-5 h-5 rounded-full bg-red-600 ${color === '#dc2626' && !isEraser ? 'ring-2 ring-offset-2 ring-red-500' : ''}`} />
                    <button onClick={() => { setColor('#2563eb'); setIsEraser(false); }} className={`w-5 h-5 rounded-full bg-blue-600 ${color === '#2563eb' && !isEraser ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} />
                </div>

                <div className="w-px h-6 bg-gray-200 my-auto"></div>

                <button 
                    onClick={() => setIsEraser(true)}
                    className={`p-2 rounded-full transition-colors ${isEraser ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-500'}`}
                >
                    <EraserIcon className="w-5 h-5" />
                </button>
            </div>

            <button 
                onClick={clearCanvas} 
                className="bg-white/90 backdrop-blur-sm shadow-md rounded-full p-3 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all pointer-events-auto border border-red-100"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className={`flex-1 w-full h-full rounded-3xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-white ${!readOnly ? 'cursor-crosshair touch-none' : ''}`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
      {!readOnly && <p className="text-xs text-center text-gray-400 mt-2">Use o mouse ou toque para desenhar ou escrever.</p>}
    </div>
  );
};