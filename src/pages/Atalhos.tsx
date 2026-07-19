import React from 'react';
import { Zap, Terminal, Globe, Settings, Cpu, Trash2, Database, RefreshCw, Plus, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const iconMap: Record<string, any> = {
  Trash2,
  RefreshCw,
  Globe,
  Terminal,
  Settings,
  Cpu,
  Database,
};

const categories = ['Todos', 'Sistema', 'Windows', 'Rede', 'Ferramentas'];

export default function Atalhos() {
  const { shortcuts, addShortcut, deleteShortcut, addHistoryItem } = useAppStore();
  const [selectedCategory, setSelectedCategory] = React.useState('Todos');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [shortcutForm, setShortcutForm] = React.useState({
    name: '',
    description: 'Atalho criado pelo usuário',
    command: '',
    category: 'Ferramentas',
    icon: 'Terminal',
    color: '#8B5CF6',
  });

  const filteredShortcuts = selectedCategory === 'Todos'
    ? shortcuts
    : shortcuts.filter(s => s.category === selectedCategory);

  const handleRunShortcut = async (shortcut: typeof shortcuts[number]) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.executeCommand) {
      try {
        await (window as any).electronAPI.executeCommand(shortcut.command);
        addHistoryItem({
          type: 'shortcut',
          title: shortcut.name,
          description: 'Executou um atalho do sistema',
        });
      } catch (error) {
        console.error('Erro ao executar atalho:', error);
      }
    }
  };

  const handleAddShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    const name = shortcutForm.name.trim();
    const command = shortcutForm.command.trim();
    if (!name || !command) return;

    addShortcut({
      name,
      description: shortcutForm.description.trim() || 'Atalho criado pelo usuário',
      icon: shortcutForm.icon,
      color: shortcutForm.color,
      category: shortcutForm.category,
      command,
    });
    addHistoryItem({
      type: 'shortcut',
      title: name,
      description: 'Criou um novo atalho',
    });
    setShortcutForm({ name: '', description: 'Atalho criado pelo usuário', command: '', category: 'Ferramentas', icon: 'Terminal', color: '#8B5CF6' });
    setIsAddModalOpen(false);
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Atalhos</h1>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl transition-all neon-glow">
          <Plus size={20} />
          Adicionar Atalho
        </button>
      </div>

      <div className="flex gap-3 mb-8 flex-wrap">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShortcuts.map((shortcut) => (
          <div key={shortcut.id} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${shortcut.color}20` }}
              >
                {React.createElement(iconMap[shortcut.icon] || Terminal, { size: 28, style: { color: shortcut.color } })}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 rounded-lg hover:bg-cardHover transition-colors text-textSecondary" onClick={(e) => { e.stopPropagation(); }}> 
                  <ExternalLink size={16} />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-cardHover transition-colors text-textSecondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    const ok = window.confirm(`Tem certeza que deseja excluir o atalho "${shortcut.name}"?`);
                    if (!ok) return;
                    deleteShortcut(shortcut.id);
                    addHistoryItem({ type: 'shortcut', title: shortcut.name, description: 'Removeu um atalho' });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-textPrimary mb-2">{shortcut.name}</h3>
            <p className="text-sm text-textSecondary mb-6">{shortcut.description}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => handleRunShortcut(shortcut)} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 transition-all text-white font-medium flex items-center justify-center gap-2">
                <Zap size={16} />
                Executar
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">Novo Atalho</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-textSecondary hover:text-textPrimary">✕</button>
            </div>
            <form onSubmit={handleAddShortcut} className="space-y-4">
              <div>
                <label className="block text-sm text-textSecondary mb-2">Nome</label>
                <input value={shortcutForm.name} onChange={(e) => setShortcutForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Descrição</label>
                <input value={shortcutForm.description} onChange={(e) => setShortcutForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Comando</label>
                <input value={shortcutForm.command} onChange={(e) => setShortcutForm((prev) => ({ ...prev, command: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Categoria</label>
                <input value={shortcutForm.category} onChange={(e) => setShortcutForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 rounded-xl glass text-textSecondary">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filteredShortcuts.length === 0 && (
        <div className="text-center py-16">
          <Zap size={64} className="mx-auto mb-6 text-textSecondary/30" />
          <h3 className="text-2xl font-bold text-textPrimary mb-3">Nenhum atalho nesta categoria</h3>
          <p className="text-textSecondary">Adicione novos atalhos para começar</p>
        </div>
      )}
    </div>
  );
}
