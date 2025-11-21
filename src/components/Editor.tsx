import React, { useState, useEffect } from 'react';
import { DevotionalNote, EditorMode } from '../types';
import { ChevronLeftIcon, TrashIcon, SparklesIcon } from './Icons';
import { Canvas } from './Canvas';
import { generateDevotionalInsight, suggestTags } from '../services/geminiService';

const MOODS = ['🙏 Grato', '🤔 Reflexivo', '😔 Triste', '🔥 Zeloso', '🕊️ Em Paz'];

interface EditorProps {
    initialNote: DevotionalNote;
    onSave: (note: DevotionalNote) => void;
    onBack: () => void;
    onDelete: () => void;
}

export const Editor: React.FC<EditorProps> = ({ initialNote, onSave, onBack, onDelete }) => {
    const [note, setNote] = useState(initialNote);
    const [mode, setMode] = useState<EditorMode>('WRITE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);

    // Sync note when initialNote changes (e.g., when temp-id becomes real ID)
    useEffect(() => {
        if (initialNote.id !== note.id) {
            setNote(initialNote);
        }
    }, [initialNote.id]);

    // Debounced Auto-save
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (
                note.title !== initialNote.title || 
                note.content !== initialNote.content || 
                note.drawingData !== initialNote.drawingData ||
                note.mood !== initialNote.mood ||
                JSON.stringify(note.tags) !== JSON.stringify(initialNote.tags)
            ) {
                onSave(note);
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [note.title, note.content, note.drawingData, note.mood, note.tags]); 

    const handleAiAssist = async () => {
        if (!note.title && !note.content) return alert("Escreva algo primeiro para a IA te ajudar!");
        setIsGenerating(true);
        
        // Generate Insight
        const insight = await generateDevotionalInsight(note.title, note.content);
        setAiInsight(insight);

        // Suggest Tags if empty
        if (note.tags.length === 0 && note.content.length > 20) {
            const tags = await suggestTags(note.content);
            if (tags.length > 0) {
                setNote(prev => ({ ...prev, tags: [...prev.tags, ...tags] }));
            }
        }

        setIsGenerating(false);
    };

    return (
        <div className="flex flex-col h-full bg-white md:rounded-l-3xl shadow-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 bg-white shrink-0">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setMode('WRITE')} 
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'WRITE' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Texto
                    </button>
                    <button 
                        onClick={() => setMode('DRAW')} 
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'DRAW' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Papel
                    </button>
                </div>

                <div className="flex gap-2">
                    <button onClick={onDelete} className="p-2 text-red-400 hover:bg-red-50 rounded-full hidden md:block">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Metadata Row */}
            <div className="px-4 md:px-8 py-4 flex flex-wrap gap-4 items-center border-b border-slate-50 bg-slate-50/50 shrink-0">
                <select 
                    value={note.mood} 
                    onChange={(e) => setNote(prev => ({ ...prev, mood: e.target.value }))}
                    className="bg-white border border-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20">
                    <span className="text-slate-400 text-sm mr-2">#</span>
                    <input 
                        type="text" 
                        placeholder="Adicionar tags (separadas por vírgula)"
                        className="w-full text-sm focus:outline-none text-slate-600 placeholder:text-slate-300"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = e.currentTarget.value.trim();
                                if(val) {
                                    setNote(prev => ({ ...prev, tags: [...prev.tags, ...val.split(',').map(t => t.trim())] }));
                                    e.currentTarget.value = '';
                                }
                            }
                        }}
                    />
                </div>
                
                {/* Tags Display */}
                <div className="flex gap-2 flex-wrap">
                    {note.tags.map(tag => (
                         <span key={tag} className="text-[10px] bg-brand-100 text-brand-700 px-2 py-1 rounded-md flex items-center gap-1">
                            {tag}
                            <button onClick={() => setNote(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))} className="hover:text-brand-900">×</button>
                         </span>
                    ))}
                </div>
            </div>

            {/* AI Insight Banner */}
            {aiInsight && (
                <div className="bg-gradient-to-r from-indigo-50 to-brand-50 p-4 px-8 border-b border-brand-100 flex gap-4 animate-fade-in shrink-0">
                    <div className="bg-white p-2 rounded-full h-fit shadow-sm text-brand-500">
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-brand-600 uppercase mb-1">Insight do Assistente</p>
                        <p className="text-sm text-slate-700 italic leading-relaxed">{aiInsight}</p>
                    </div>
                    <button onClick={() => setAiInsight(null)} className="text-slate-400 hover:text-slate-600 h-fit">×</button>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {mode === 'WRITE' ? (
                    <div className="h-full overflow-y-auto p-6 md:p-12 max-w-3xl mx-auto">
                        <input 
                            type="text" 
                            placeholder="Título ou Versículo..." 
                            value={note.title}
                            onChange={(e) => setNote(prev => ({ ...prev, title: e.target.value, updatedAt: Date.now() }))}
                            className="w-full text-3xl md:text-4xl font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none mb-6 bg-transparent"
                        />
                        <textarea 
                            placeholder="O que Deus falou ao seu coração hoje?"
                            value={note.content}
                            onChange={(e) => setNote(prev => ({ ...prev, content: e.target.value, updatedAt: Date.now() }))}
                            className="w-full h-[calc(100%-100px)] resize-none text-lg text-slate-600 leading-relaxed focus:outline-none bg-transparent font-serif placeholder:font-sans placeholder:text-slate-300"
                        />
                    </div>
                ) : (
                    <div className="h-full w-full p-4 bg-slate-100">
                         <div className="h-full w-full bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
                            <Canvas 
                                initialImage={note.drawingData} 
                                onSave={(dataUrl) => setNote(prev => ({ ...prev, drawingData: dataUrl, updatedAt: Date.now() }))} 
                            />
                         </div>
                    </div>
                )}

                {/* AI FAB */}
                {mode === 'WRITE' && (
                    <button 
                        onClick={handleAiAssist}
                        disabled={isGenerating}
                        className="absolute bottom-8 right-8 bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 px-5 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <span className="animate-pulse">Pensando...</span>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                <span className="font-medium">Insights</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
