import React, { useState, useEffect, useMemo } from 'react';
import { DevotionalNote, ViewMode, EditorMode } from './types';
import { CalendarIcon, PlusIcon, SearchIcon, BookOpenIcon, SparklesIcon, ChevronLeftIcon, TrashIcon } from './components/Icons';
import { Canvas } from './components/Canvas';
import { generateDevotionalInsight, suggestTags } from './geminiService';

// --- Constants ---
const MOODS = ['🙏 Grato', '🤔 Reflexivo', '😔 Triste', '🔥 Zeloso', '🕊️ Em Paz'];

// --- Helper Components ---

const NoteCard = ({ note, onClick }: { note: DevotionalNote; onClick: () => void }) => {
  const date = new Date(note.createdAt);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);

  return (
    <div 
      onClick={onClick}
      className="group bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-brand-100 active:scale-95"
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
      
      <div className="flex gap-2 mt-3 flex-wrap">
        {note.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] bg-brand-50 text-brand-600 px-2 py-1 rounded-md">#{tag}</span>
        ))}
      </div>
    </div>
  );
};

const SidebarItem = ({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}
  >
    <div className="w-6 h-6">{icon}</div>
    <span className="font-medium hidden md:block">{label}</span>
  </button>
);

// --- Main Component ---

export default function App() {
  // State
  const [notes, setNotes] = useState<DevotionalNote[]>(() => {
    const saved = localStorage.getItem('devo_notes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [currentNote, setCurrentNote] = useState<DevotionalNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<string | null>(null);

  // Save notes effect
  useEffect(() => {
    localStorage.setItem('devo_notes', JSON.stringify(notes));
  }, [notes]);

  // Filtering Logic
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = (note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesMood = filterMood ? note.mood === filterMood : true;
      return matchesSearch && matchesMood;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, searchQuery, filterMood]);

  // Grouping by Date (Simple: Recent, This Month, Older)
  const groupedNotes = useMemo(() => {
    const now = new Date();
    const groups: Record<string, DevotionalNote[]> = {
      'Esta Semana': [],
      'Este Mês': [],
      'Antigos': []
    };

    filteredNotes.forEach(note => {
      const date = new Date(note.createdAt);
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        groups['Esta Semana'].push(note);
      } else if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        groups['Este Mês'].push(note);
      } else {
        groups['Antigos'].push(note);
      }
    });
    return groups;
  }, [filteredNotes]);

  // Handlers
  const createNote = () => {
    const newNote: DevotionalNote = {
      id: Date.now().toString(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      mood: MOODS[0]
    };
    setCurrentNote(newNote);
    setViewMode('EDITOR');
  };

  const handleSaveNote = (updatedNote: DevotionalNote) => {
    setNotes(prev => {
      const exists = prev.find(n => n.id === updatedNote.id);
      if (exists) {
        return prev.map(n => n.id === updatedNote.id ? updatedNote : n);
      }
      return [updatedNote, ...prev];
    });
    // Do not close automatically to allow further editing
  };
  
  const handleDeleteNote = (id: string) => {
      if(confirm('Tem certeza que deseja excluir este devocional?')) {
          setNotes(prev => prev.filter(n => n.id !== id));
          if (currentNote?.id === id) {
              setViewMode('LIST');
              setCurrentNote(null);
          }
      }
  }

  // Render
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Navigation Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 p-6 bg-slate-50 border-r border-slate-200 justify-between">
        <div>
            <div className="flex items-center gap-2 mb-10 px-2">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
                    <BookOpenIcon className="w-5 h-5" />
                </div>
                <h1 className="font-bold text-xl text-slate-800 tracking-tight">DevoNote</h1>
            </div>
            
            <nav className="space-y-2">
                <SidebarItem active={viewMode === 'LIST'} icon={<CalendarIcon />} label="Meus Devocionais" onClick={() => setViewMode('LIST')} />
                {/* Future categories could go here */}
            </nav>
        </div>

        <div className="bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-brand-500/20">
            <p className="text-xs font-medium opacity-80 mb-1">Versículo do Dia</p>
            <p className="font-serif italic text-sm mb-2">"Lâmpada para os meus pés é a tua palavra."</p>
            <p className="text-xs font-bold text-right opacity-80">- Salmos 119:105</p>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {viewMode === 'LIST' && (
          <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
            {/* Header Mobile */}
            <div className="md:hidden flex items-center justify-between p-6 pb-2">
                <h1 className="font-bold text-2xl text-slate-800">DevoNote</h1>
                <button onClick={createNote} className="bg-brand-600 text-white p-2 rounded-full shadow-lg">
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Search & Filter */}
            <div className="px-6 py-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por palavra chave..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm shadow-sm transition-all"
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                        <button onClick={() => setFilterMood(null)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium border transition-all ${!filterMood ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>Todos</button>
                        {MOODS.map(m => (
                            <button key={m} onClick={() => setFilterMood(m)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium border transition-all ${filterMood === m ? 'bg-brand-100 text-brand-700 border-brand-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notes Grid */}
            <div className="flex-1 overflow-y-auto px-6 pb-20 md:pb-6 no-scrollbar">
                {Object.entries(groupedNotes).map(([group, groupNotes]) => (
                    groupNotes.length > 0 && (
                        <div key={group} className="mb-8">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                {group}
                                <span className="h-px flex-1 bg-slate-200"></span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupNotes.map(note => (
                                    <NoteCard 
                                        key={note.id} 
                                        note={note} 
                                        onClick={() => { setCurrentNote(note); setViewMode('EDITOR'); }} 
                                    />
                                ))}
                            </div>
                        </div>
                    )
                ))}
                
                {filteredNotes.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center">
                        <BookOpenIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>Nenhum devocional encontrado.</p>
                        <button onClick={createNote} className="mt-4 text-brand-600 font-medium hover:underline">Começar um novo?</button>
                    </div>
                )}
            </div>

            {/* FAB Desktop */}
            <button 
                onClick={createNote}
                className="hidden md:flex absolute bottom-8 right-8 bg-brand-600 hover:bg-brand-700 text-white px-6 py-4 rounded-full shadow-lg shadow-brand-500/40 items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95"
            >
                <PlusIcon className="w-6 h-6" />
                <span>Novo Devocional</span>
            </button>
          </div>
        )}

        {viewMode === 'EDITOR' && currentNote && (
          <Editor 
            initialNote={currentNote} 
            onSave={handleSaveNote} 
            onBack={() => setViewMode('LIST')} 
            onDelete={() => handleDeleteNote(currentNote.id)}
          />
        )}
      </main>
    </div>
  );
}

// --- Editor Component ---

interface EditorProps {
    initialNote: DevotionalNote;
    onSave: (note: DevotionalNote) => void;
    onBack: () => void;
    onDelete: () => void;
}

const Editor: React.FC<EditorProps> = ({ initialNote, onSave, onBack, onDelete }) => {
    const [note, setNote] = useState(initialNote);
    const [mode, setMode] = useState<EditorMode>('WRITE');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);

    // Auto-save debounce could be added here, but manual save on change for now
    useEffect(() => {
        // Basic sync
        onSave(note);
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