import React, { useState } from 'react';
import { Star, Folder, Terminal, Globe, Plus, Trash2, Edit2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function Favoritos() {
  const { favorites, addFavorite, updateFavorite, deleteFavorite, addHistoryItem } = useAppStore();
  const [selectedType, setSelectedType] = useState<'all' | 'folder' | 'program' | 'website'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [favoriteForm, setFavoriteForm] = useState({ type: 'website' as 'folder' | 'program' | 'website', name: '', value: '' });

  const filteredFavorites = selectedType === 'all'
    ? favorites
    : favorites.filter(fav => fav.type === selectedType);

  const getIcon = (type: string) => {
    switch (type) {
      case 'folder': return <Folder size={24} className="text-yellow-400" />;
      case 'program': return <Terminal size={24} className="text-blue-400" />;
      case 'website': return <Globe size={24} className="text-green-400" />;
      default: return <Star size={24} />;
    }
  };

  const handleAddFavorite = (e: React.FormEvent) => {
    e.preventDefault();
    const name = favoriteForm.name.trim();
    const value = favoriteForm.value.trim();
    if (!name || !value) return;

    addFavorite({
      type: favoriteForm.type,
      name,
      path: favoriteForm.type !== 'website' ? value : undefined,
      url: favoriteForm.type === 'website' ? value : undefined,
    });
    addHistoryItem({
      type: 'favorite',
      title: name,
      description: 'Adicionou um favorito',
    });
    setFavoriteForm({ type: 'website', name: '', value: '' });
    setIsCreateModalOpen(false);
  };

  const handleDeleteFavorite = (id: string) => {
    const current = favorites.find((item) => item.id === id);
    if (!current) return;

    deleteFavorite(id);
    addHistoryItem({
      type: 'favorite',
      title: current.name,
      description: 'Removeu um favorito',
    });
  };

  const handleOpenFavorite = async (fav: typeof favorites[number]) => {
    if (typeof window === 'undefined' || !(window as any).electronAPI) return;

    if (fav.url) {
      await (window as any).electronAPI.openExternal(fav.url);
    } else if (fav.type === 'program' && fav.path) {
      await (window as any).electronAPI.executeCommand(fav.path);
    } else if (fav.path) {
      await (window as any).electronAPI.openPath(fav.path);
    }
  };

  const handleEditFavorite = (favId: string) => {
    const current = favorites.find((item) => item.id === favId);
    if (!current) return;

    const name = window.prompt('Editar nome:', current.name);
    if (!name?.trim()) return;

    const value = window.prompt(current.type === 'website' ? 'Editar URL:' : 'Editar caminho/comando:', current.url || current.path || '');
    if (!value?.trim()) return;

    updateFavorite(favId, {
      name: name.trim(),
      path: current.type !== 'website' ? value.trim() : undefined,
      url: current.type === 'website' ? value.trim() : undefined,
    });
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Favoritos</h1>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl transition-all neon-glow">
          <Plus size={20} />
          Adicionar Favorito
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        {['all', 'folder', 'program', 'website'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type as any)}
            className={`px-6 py-2 rounded-xl transition-all ${
              selectedType === type
                ? 'bg-primary text-white'
                : 'glass hover:bg-cardHover text-textSecondary'
            }`}
          >
            {type === 'all' ? 'Todos' :
             type === 'folder' ? 'Pastas' :
             type === 'program' ? 'Programas' : 'Sites'}
          </button>
        ))}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">Novo Favorito</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-textSecondary hover:text-textPrimary">✕</button>
            </div>
            <form onSubmit={handleAddFavorite} className="space-y-4">
              <div>
                <label className="block text-sm text-textSecondary mb-2">Tipo</label>
                <select value={favoriteForm.type} onChange={(e) => setFavoriteForm((prev) => ({ ...prev, type: e.target.value as 'folder' | 'program' | 'website' }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary">
                  <option value="folder">Pasta</option>
                  <option value="program">Programa</option>
                  <option value="website">Site</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Nome</label>
                <input value={favoriteForm.name} onChange={(e) => setFavoriteForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Valor</label>
                <input value={favoriteForm.value} onChange={(e) => setFavoriteForm((prev) => ({ ...prev, value: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" placeholder={favoriteForm.type === 'website' ? 'https://...' : 'Caminho ou comando'} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl glass text-textSecondary">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFavorites.map((fav) => (
          <div key={fav.id} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-cardHover">
                {getIcon(fav.type)}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditFavorite(fav.id)} className="p-2 rounded-lg hover:bg-cardHover transition-colors text-textSecondary hover:text-yellow-400">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDeleteFavorite(fav.id)} className="p-2 rounded-lg hover:bg-cardHover transition-colors text-textSecondary hover:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">{fav.name}</h3>
            {fav.path && <p className="text-sm text-textSecondary">{fav.path}</p>}
            {fav.url && <p className="text-sm text-textSecondary">{fav.url}</p>}
            <button onClick={() => handleOpenFavorite(fav)} className="mt-4 w-full py-2 rounded-xl bg-primary hover:bg-primary/90 transition-all">
              Abrir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
