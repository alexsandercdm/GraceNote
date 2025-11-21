import React from 'react';
import { DevotionalNote } from '../types';
import { TrashIcon } from './Icons';

export const NoteCard: React.FC<{ note: DevotionalNote; onClick: () => void; onDelete?: (id: string) => void }> = ({ note, onClick, onDelete }) => {
  const date = new Date(note.createdAt);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);

  return (
    <div 
      onClick={onClick}
      className="group bg-white p-5 pr-12 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-brand-100 active:scale-95 relative"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{formattedDate}</span>
        {note.mood && <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{note.mood}</span>}
      </div>
      <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">{note.title || "Sem Título"}</h3>
      {note.content && <p className="text-slate-500 text-sm line-clamp-2 mb-3">{note.content}</p>}
      {note.drawingData && (
        <div className="h-24 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100 relative">
             <img src={note.drawingData} className="w-full h-full object-contain opacity-80" alt="Drawing preview" />
             <div className="absolute bottom-1 right-1 bg-white/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500">DESENHO</div>
        </div>
      )}
      
      <div className="flex gap-2 mt-3 flex-wrap pr-2">
        {note.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] bg-brand-50 text-brand-600 px-2 py-1 rounded-md">#{tag}</span>
        ))}
      </div>

      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
          title="Excluir"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
