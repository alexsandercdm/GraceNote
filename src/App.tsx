import React, { useState, useEffect, useMemo } from 'react';
import { DevotionalNote, ViewMode } from './types';
import { CalendarIcon, PlusIcon, SearchIcon, BookOpenIcon, SignOutIcon } from './components/Icons';
import { NoteCard } from './components/NoteCard';
import { ConfirmDialog } from './components/ConfirmDialog';
import { SidebarItem } from './components/SidebarItem';
import { Editor } from './components/Editor';
import { Login } from './components/Login';
import { MOODS } from './constants';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { db } from './services/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';

// --- Main App Component (Authenticated) ---

const MainApp = () => {
  const { user, signOut } = useAuth();
  const [notes, setNotes] = useState<DevotionalNote[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [currentNote, setCurrentNote] = useState<DevotionalNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'notes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DevotionalNote[];
      setNotes(notesData);
    });

    return unsubscribe;
  }, [user]);

  // Migration Check (Local -> Firestore)
  useEffect(() => {
    if (!user) return;
    
    const migrateNotes = async () => {
      const localNotes = localStorage.getItem('devo_notes');
      if (localNotes) {
        try {
          const parsedNotes: DevotionalNote[] = JSON.parse(localNotes);
          if (parsedNotes.length > 0) {
            const batch = writeBatch(db);
            parsedNotes.forEach(note => {
              const docRef = doc(collection(db, 'notes'));
              batch.set(docRef, { ...note, userId: user.uid, id: docRef.id }); // Ensure new ID and userId
            });
            await batch.commit();
            localStorage.removeItem('devo_notes');
            console.log("Migrated local notes to Firestore");
          }
        } catch (e) {
          console.error("Migration failed", e);
        }
      }
    };

    migrateNotes();
  }, [user]);

  // Filtering Logic
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = (note.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            note.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesMood = filterMood ? note.mood === filterMood : true;
      return matchesSearch && matchesMood;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, searchQuery, filterMood]);

  // Grouping by Date
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
      id: 'temp-id', // Will be replaced by Firestore ID
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      mood: MOODS[0],
      userId: user?.uid
    };
    setCurrentNote(newNote);
    setViewMode('EDITOR');
  };

  const handleSaveNote = async (updatedNote: DevotionalNote) => {
    if (!user) return;

    try {
      if (updatedNote.id === 'temp-id') {
        // Prevent duplicate creation if already saving
        if (currentNote?.id !== 'temp-id') return;

        // Create
        const { id, ...data } = updatedNote;
        const docRef = await addDoc(collection(db, 'notes'), { ...data, userId: user.uid });
        
        // Update local state immediately with the real ID
        const newNote = { ...updatedNote, id: docRef.id };
        setCurrentNote(newNote); 
        // setNotes(prev => [newNote, ...prev]); // Removed to avoid duplicate key error (snapshot handles it)
      } else {
        // Update
        const noteRef = doc(db, 'notes', updatedNote.id);
        await updateDoc(noteRef, { ...updatedNote, updatedAt: Date.now() });
      }
    } catch (e: any) {
      console.error("Error saving note:", e);
      // Only alert if it's NOT a permission error (which happens during typing if rules aren't set)
      if (e.code !== 'permission-denied') {
         alert("Erro ao salvar nota. Verifique sua conexão.");
      }
    }
  };
  
  const handleDeleteNote = (id: string) => {
    setNoteToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'notes', noteToDelete));
      if (currentNote?.id === noteToDelete) {
        setViewMode('LIST');
        setCurrentNote(null);
      }
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (e) {
      console.error("Error deleting note:", e);
      alert("Erro ao excluir nota.");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Navigation Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 p-6 bg-slate-50 border-r border-slate-200 justify-between">
        <div>
            <div className="flex items-center gap-2 mb-10 px-2">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
                    <BookOpenIcon className="w-5 h-5" />
                </div>
                <h1 className="font-bold text-xl text-slate-800 tracking-tight">Grace Note</h1>
            </div>
            
            <nav className="space-y-2">
                <SidebarItem active={viewMode === 'LIST'} icon={<CalendarIcon />} label="Meus Devocionais" onClick={() => setViewMode('LIST')} />
            </nav>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-brand-500/20">
              <p className="text-xs font-medium opacity-80 mb-1">Versículo do Dia</p>
              <p className="font-serif italic text-sm mb-2">"Lâmpada para os meus pés é a tua palavra."</p>
              <p className="text-xs font-bold text-right opacity-80">- Salmos 119:105</p>
          </div>

          <button onClick={signOut} className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors px-2 text-sm font-medium">
            <SignOutIcon className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {viewMode === 'LIST' && (
          <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
            {/* Header Mobile */}
            <div className="md:hidden flex items-center justify-between p-6 pb-2">
                <h1 className="font-bold text-2xl text-slate-800">Grace Note</h1>
                <div className="flex gap-2">
                  <button onClick={signOut} className="p-2 text-slate-500">
                    <SignOutIcon className="w-6 h-6" />
                  </button>
                  <button onClick={createNote} className="bg-brand-600 text-white p-2 rounded-full shadow-lg">
                      <PlusIcon className="w-6 h-6" />
                  </button>
                </div>
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
                {(Object.entries(groupedNotes) as [string, DevotionalNote[]][]).map(([group, groupNotes]) => (
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
                                        onDelete={handleDeleteNote}
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

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Excluir Devocional"
        message="Tem certeza que deseja excluir este devocional? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setNoteToDelete(null);
        }}
      />
    </div>
  );
};

// --- Root Component ---

export default function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

const AuthWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return user ? <MainApp /> : <Login />;
};