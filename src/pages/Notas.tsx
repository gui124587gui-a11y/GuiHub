import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Pin, PinOff, Search } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function Notas() {
  const { notes, addNote: createNote, updateNote, deleteNote: removeNote, addHistoryItem } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePin = (id: string) => {
    const current = notes.find((note) => note.id === id);
    if (!current) return;

    updateNote(id, { pinned: !current.pinned });
    addHistoryItem({
      type: 'note',
      title: current.title,
      description: current.pinned ? 'Desfixou a nota' : 'Fixou a nota',
    });
  };

  const handleDeleteNote = (id: string) => {
    const current = notes.find((note) => note.id === id);
    if (!current) return;

    removeNote(id);
    addHistoryItem({
      type: 'note',
      title: current.title,
      description: 'Excluiu a nota',
    });
  };

  const startEdit = (note: { id: string; title: string; content: string }) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const saveEdit = () => {
    if (editingId) {
      updateNote(editingId, { title: editTitle.trim() || 'Sem título', content: editContent });
      addHistoryItem({
        type: 'note',
        title: editTitle.trim() || 'Sem título',
        description: 'Editou a nota',
      });
      setEditingId(null);
      setEditTitle('');
      setEditContent('');
    }
  };

  const handleAddNote = () => {
    const newNote = {
      title: 'Nova Nota',
      content: '',
      pinned: false,
      color: '#3B82F6',
    };
    createNote(newNote);
    addHistoryItem({
      type: 'note',
      title: newNote.title,
      description: 'Criou uma nova nota',
    });
  };

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Notas</h1>
        <button
          onClick={handleAddNote}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl transition-all neon-glow"
        >
          <Plus size={20} />
          Nova Nota
        </button>
      </div>

      <div className="relative mb-8">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Pesquisar notas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-6 py-3 rounded-2xl glass text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary/50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedNotes.map((note) => (
          <div key={note.id} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 relative">
            {editingId === note.id ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-transparent text-xl font-semibold text-textPrimary border-b border-primary/30 pb-2 focus:outline-none"
                  placeholder="Título"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-40 bg-transparent text-textSecondary border border-primary/10 rounded-xl p-3 focus:outline-none resize-none"
                  placeholder="Conteúdo da nota..."
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl bg-cardHover text-textSecondary hover:bg-cardHover transition-all">
                    Cancelar
                  </button>
                  <button onClick={saveEdit} className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all">
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-textPrimary">{note.title}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => togglePin(note.id)} className="p-1 rounded hover:bg-cardHover transition-colors">
                      {note.pinned ? <Pin size={16} className="text-yellow-400" /> : <PinOff size={16} className="text-textSecondary" />}
                    </button>
                    <button onClick={() => startEdit(note)} className="p-1 rounded hover:bg-cardHover transition-colors">
                      <Edit2 size={16} className="text-textSecondary" />
                    </button>
                    <button onClick={() => handleDeleteNote(note.id)} className="p-1 rounded hover:bg-red-500/20 transition-colors">
                      <Trash2 size={16} className="text-textSecondary hover:text-red-400" />
                    </button>
                  </div>
                </div>
                <p className="text-textSecondary whitespace-pre-wrap text-sm mb-4">{note.content}</p>
                <p className="text-xs text-textSecondary">{note.createdAt}</p>
              </div>
            )}
            {note.pinned && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
