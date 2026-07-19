import React, { useState } from 'react';
import { History, Clock, Globe, Star, Folder, Music, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function Historico() {
  const { history, removeHistoryItem } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'link' | 'app' | 'folder' | 'music' | 'favorite' | 'shortcut' | 'event' | 'note' | 'workspace'>('all');

  const getIconForType = (type: string) => {
    switch (type) {
      case 'link': return <Globe size={20} />;
      case 'app': return <Folder size={20} />;
      case 'folder': return <Folder size={20} />;
      case 'music': return <Music size={20} />;
      case 'favorite': return <Star size={20} />;
      case 'shortcut': return <Star size={20} />;
      case 'event': return <Clock size={20} />;
      case 'note': return <Folder size={20} />;
      case 'workspace': return <Folder size={20} />;
      default: return <History size={20} />;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'link': return 'bg-blue-500/20 text-blue-400';
      case 'app': return 'bg-purple-500/20 text-purple-400';
      case 'folder': return 'bg-orange-500/20 text-orange-400';
      case 'music': return 'bg-green-500/20 text-green-400';
      case 'favorite': return 'bg-yellow-500/20 text-yellow-400';
      case 'shortcut': return 'bg-cyan-500/20 text-cyan-400';
      case 'event': return 'bg-pink-500/20 text-pink-400';
      case 'note': return 'bg-indigo-500/20 text-indigo-400';
      case 'workspace': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(item => item.type === filter);

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
          <History size={32} />
          Histórico
        </h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'link', label: 'Links' },
          { id: 'app', label: 'Apps' },
          { id: 'folder', label: 'Pastas' },
          { id: 'music', label: 'Música' },
          { id: 'favorite', label: 'Favoritos' },
          { id: 'shortcut', label: 'Atalhos' },
          { id: 'event', label: 'Agenda' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === item.id 
                ? 'bg-primary text-white' 
                : 'glass hover:bg-cardHover text-textSecondary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredHistory.map((item) => (
          <div key={item.id} className="glass rounded-2xl p-4 hover:scale-[1.01] transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${getColorForType(item.type)}`}>
                {getIconForType(item.type)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-textPrimary">{item.title}</p>
                <p className="text-sm text-textSecondary">{item.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-textSecondary">
                  <Clock size={14} />
                  {item.timestamp}
                </div>
                <button onClick={() => removeHistoryItem(item.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-textSecondary hover:text-red-400 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredHistory.length === 0 && (
        <div className="text-center py-16 glass rounded-3xl">
          <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <History size={48} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-textPrimary mb-2">Nenhum item no histórico</h2>
          <p className="text-textSecondary">Suas atividades aparecerão aqui</p>
        </div>
      )}
    </div>
  );
}
