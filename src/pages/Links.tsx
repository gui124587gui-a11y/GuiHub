import React, { useState } from 'react';
import { Link as LinkIcon, Plus, Trash2, Edit2, Search, Star, Globe } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const categories = ['Todos', 'Desenvolvimento', 'Entretenimento', 'Produtividade', 'Outros'];

export default function Links() {
  const { links, addLink, updateLink, deleteLink, addHistoryItem } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ name: '', url: 'https://', category: 'Outros' });

  const filteredLinks = links.filter(link => {
    const matchesCategory = selectedCategory === 'Todos' || link.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFavorite = (id: string) => {
    const current = links.find((link) => link.id === id);
    if (!current) return;

    updateLink(id, { favorite: !current.favorite });
  };

  const handleDeleteLink = (id: string) => {
    const current = links.find((link) => link.id === id);
    if (!current) return;

    deleteLink(id);
    addHistoryItem({
      type: 'link',
      title: current.name,
      description: 'Removeu um link salvo',
    });
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  };

  const handleOpenLink = async (name: string, url: string) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
      await (window as any).electronAPI.openExternal(url);
      addHistoryItem({
        type: 'link',
        title: name,
        description: `Abriu ${url}`,
      });
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const name = linkForm.name.trim();
    const url = linkForm.url.trim();
    if (!name || !url) return;

    addLink({
      name,
      url,
      icon: 'Globe',
      category: linkForm.category,
      favorite: false,
    });
    addHistoryItem({
      type: 'link',
      title: name,
      description: 'Adicionou um novo link',
    });
    setLinkForm({ name: '', url: 'https://', category: 'Outros' });
    setIsCreateModalOpen(false);
  };

  const handleEditLink = (id: string) => {
    const current = links.find((link) => link.id === id);
    if (!current) return;

    const name = window.prompt('Editar nome:', current.name);
    if (!name?.trim()) return;

    const url = window.prompt('Editar URL:', current.url);
    if (!url?.trim()) return;

    const category = window.prompt('Editar categoria:', current.category) || current.category;
    updateLink(id, {
      name: name.trim(),
      url: url.trim(),
      category,
    });
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Links</h1>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl transition-all neon-glow">
          <Plus size={20} />
          Adicionar Link
        </button>
      </div>

      <div className="mb-8">
        <div className="relative mb-4">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Pesquisar links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3 rounded-2xl glass text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2 rounded-xl transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'glass hover:bg-cardHover text-textSecondary'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">Novo Link</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-textSecondary hover:text-textPrimary">✕</button>
            </div>
            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="block text-sm text-textSecondary mb-2">Nome</label>
                <input value={linkForm.name} onChange={(e) => setLinkForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">URL</label>
                <input value={linkForm.url} onChange={(e) => setLinkForm((prev) => ({ ...prev, url: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Categoria</label>
                <input value={linkForm.category} onChange={(e) => setLinkForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" />
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
        {filteredLinks.map((link) => (
          <div key={link.id} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cardHover flex items-center justify-center overflow-hidden">
                  {getFaviconUrl(link.url) ? (
                    <img src={getFaviconUrl(link.url)} alt="" className="w-8 h-8" onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }} />
                  ) : (
                    <Globe size={24} className="text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-textPrimary">{link.name}</h3>
                  <p className="text-sm text-textSecondary truncate max-w-[200px]">{link.url}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFavorite(link.id)}
                  className="p-2 rounded-lg hover:bg-cardHover transition-colors"
                >
                  <Star size={16} className={link.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-textSecondary'} />
                </button>
                <button onClick={() => handleEditLink(link.id)} className="p-2 rounded-lg hover:bg-cardHover transition-colors text-textSecondary">
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-textSecondary hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                {link.category}
              </span>
              <button
                onClick={() => handleOpenLink(link.name, link.url)}
                className="text-primary hover:text-secondary transition-colors flex items-center gap-1 text-sm"
              >
                Abrir <LinkIcon size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <div className="text-center py-12">
          <Globe size={64} className="mx-auto mb-4 text-textSecondary/30" />
          <h3 className="text-xl font-semibold text-textPrimary mb-2">Nenhum link encontrado</h3>
          <p className="text-textSecondary">Adicione novos links para começar</p>
        </div>
      )}
    </div>
  );
}
