import React, { useState } from 'react';
import { Layers, Plus, Play, Pause, Trash2, Edit2, FolderOpen, Terminal, Globe, Settings, GripVertical } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const colors = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4'];

export default function Workspaces() {
  const { workspaces, addWorkspace, updateWorkspace, deleteWorkspace, addHistoryItem } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', description: 'Workspace criado pelo usuário', icon: '📁', color: colors[0] });
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [currentWorkspaceForItem, setCurrentWorkspaceForItem] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ type: 'app', name: '', value: '', delay: 0, runAsAdmin: false });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    const name = workspaceForm.name.trim();
    if (!name) return;

    addWorkspace({
      name,
      color: workspaceForm.color,
      icon: workspaceForm.icon,
      description: workspaceForm.description.trim() || 'Workspace criado pelo usuário',
      items: [],
    });
    addHistoryItem({
      type: 'workspace',
      title: name,
      description: 'Criou um novo workspace',
    });
    setWorkspaceForm({ name: '', description: 'Workspace criado pelo usuário', icon: '📁', color: colors[0] });
    setIsCreateModalOpen(false);
  };

  const handleDeleteWorkspace = (id: string) => {
    const current = workspaces.find((ws) => ws.id === id);
    if (!current) return;

    deleteWorkspace(id);
    addHistoryItem({
      type: 'workspace',
      title: current.name,
      description: 'Removeu um workspace',
    });
  };

  const runWorkspace = async (id: string) => {
    const current = workspaces.find((ws) => ws.id === id);
    if (!current || !(window as any).electronAPI) return;

    setIsRunning(id);
    try {
      const sortedItems = [...current.items].sort((a, b) => (a.delay || 0) - (b.delay || 0));

      for (const item of sortedItems) {
        if (item.delay) {
          await new Promise((resolve) => setTimeout(resolve, item.delay));
        }

        if (item.type === 'url' && item.url) {
          await (window as any).electronAPI.openExternal(item.url);
        } else if (item.type === 'folder' && item.path) {
          await (window as any).electronAPI.openPath(item.path);
        } else if (item.type === 'command' && item.command) {
          await (window as any).electronAPI.executeCommand(item.command);
        } else if (item.path) {
          if (item.path.includes('://')) {
            await (window as any).electronAPI.openExternal(item.path);
          } else {
            await (window as any).electronAPI.executeCommand(`Start-Process "${item.path}"`);
          }
        }
      }

      addHistoryItem({
        type: 'workspace',
        title: current.name,
        description: 'Executou o workspace',
      });
    } catch (error) {
      console.error('Erro ao executar workspace:', error);
    } finally {
      setIsRunning(null);
    }
  };

  const addItem = (workspaceId: string) => {
    setCurrentWorkspaceForItem(workspaceId);
    setItemForm({ type: 'app', name: '', value: '', delay: 0, runAsAdmin: false });
    setIsItemModalOpen(true);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceForItem) return;
    const current = workspaces.find((ws) => ws.id === currentWorkspaceForItem);
    if (!current) return;

    const id = `${current.id}-${Date.now()}`;
    const delay = Number.isFinite(Number(itemForm.delay)) ? Number(itemForm.delay) : 0;

    const newItem = {
      id,
      type: itemForm.type as any,
      name: itemForm.name || 'Novo Item',
      path: itemForm.type === 'app' || itemForm.type === 'folder' ? itemForm.value : undefined,
      url: itemForm.type === 'url' ? itemForm.value : undefined,
      command: itemForm.type === 'command' ? itemForm.value : undefined,
      delay,
      runAsAdmin: itemForm.runAsAdmin,
    };

    updateWorkspace(currentWorkspaceForItem, {
      items: [...current.items, newItem],
    });

    addHistoryItem({
      type: 'workspace',
      title: current.name,
      description: `Adicionou o item ${newItem.name}`,
    });

    setIsItemModalOpen(false);
    setCurrentWorkspaceForItem(null);
  };

  const handlePickPath = async () => {
    if (!itemForm.type) return;
    try {
      if (itemForm.type === 'folder') {
        const dir = await (window as any).electronAPI.selectDirectory();
        if (dir) setItemForm((prev) => ({ ...prev, value: dir }));
      } else if (itemForm.type === 'app') {
        const files = await (window as any).electronAPI.selectFile();
        if (files && files.length > 0) setItemForm((prev) => ({ ...prev, value: files[0] }));
      }
    } catch (err) {
      console.error('Erro ao selecionar caminho:', err);
    }
  };

  const removeItem = (workspaceId: string, itemId: string) => {
    const current = workspaces.find((ws) => ws.id === workspaceId);
    if (!current) return;

    updateWorkspace(workspaceId, {
      items: current.items.filter((item) => item.id !== itemId),
    });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'app': return <Terminal size={20} />;
      case 'url': return <Globe size={20} />;
      case 'folder': return <FolderOpen size={20} />;
      case 'command': return <Settings size={20} />;
      default: return <FolderOpen size={20} />;
    }
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Workspaces</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl transition-all neon-glow"
        >
          <Plus size={20} />
          Novo Workspace
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {workspaces.map((workspace) => (
          <div key={workspace.id} className="glass rounded-2xl p-6 hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${workspace.color}20` }}
                >
                  {workspace.icon}
                </div>
                <div>
                  {editingId === workspace.id ? (
                    <input
                      type="text"
                      value={workspace.name}
                      onChange={(e) => updateWorkspace(workspace.id, { name: e.target.value })}
                      className="bg-transparent text-xl font-bold text-textPrimary border-b border-primary/30 focus:outline-none"
                      onBlur={() => setEditingId(null)}
                      autoFocus
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-textPrimary">{workspace.name}</h3>
                  )}
                  <p className="text-textSecondary">{workspace.items.length} itens</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(editingId === workspace.id ? null : workspace.id)}
                  className="p-2 rounded-lg hover:bg-cardHover transition-colors text-textSecondary"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteWorkspace(workspace.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-textSecondary hover:text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {workspace.items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-cardHover">
                  <GripVertical size={18} className="text-textSecondary/50" />
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${workspace.color}20` }}
                  >
                    {getIconForType(item.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-textPrimary">{item.name}</p>
                    {item.delay && item.delay > 0 && (
                      <p className="text-xs text-textSecondary">Delay: {item.delay}ms</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {item.runAsAdmin && (
                      <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-medium">Admin</span>
                    )}
                    <button
                      onClick={() => removeItem(workspace.id, item.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-textSecondary hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => addItem(workspace.id)}
                className="flex-1 py-3 rounded-xl glass hover:bg-cardHover transition-all text-textSecondary flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Adicionar Item
              </button>
              <button
                onClick={() => runWorkspace(workspace.id)}
                disabled={isRunning === workspace.id}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 transition-all text-white font-medium flex items-center justify-center gap-2 neon-glow"
              >
                {isRunning === workspace.id ? (
                  <>
                    <Pause size={18} fill="white" />
                    Abrindo...
                  </>
                ) : (
                  <>
                    <Play size={18} fill="white" className="ml-1" />
                    Executar Workspace
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">Novo Workspace</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-textSecondary hover:text-textPrimary">✕</button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-sm text-textSecondary mb-2">Nome</label>
                <input
                  value={workspaceForm.name}
                  onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary"
                  placeholder="Ex: Trabalho"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Descrição</label>
                <input
                  value={workspaceForm.description}
                  onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary"
                  placeholder="Descrição opcional"
                />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Ícone</label>
                <input
                  value={workspaceForm.icon}
                  onChange={(e) => setWorkspaceForm((prev) => ({ ...prev, icon: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary"
                  placeholder="📁"
                />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setWorkspaceForm((prev) => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${workspaceForm.color === color ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl glass text-textSecondary">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white">Criar Workspace</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">Adicionar Item</h2>
              <button onClick={() => setIsItemModalOpen(false)} className="text-textSecondary hover:text-textPrimary">✕</button>
            </div>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-sm text-textSecondary mb-2">Tipo</label>
                <select value={itemForm.type} onChange={(e) => setItemForm((prev) => ({ ...prev, type: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary">
                  <option value="app">Aplicativo</option>
                  <option value="url">URL</option>
                  <option value="folder">Pasta</option>
                  <option value="command">Comando</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Nome</label>
                <input value={itemForm.name} onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" required />
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Valor (caminho, url ou comando)</label>
                <div className="flex gap-2">
                  <input value={itemForm.value} onChange={(e) => setItemForm((prev) => ({ ...prev, value: e.target.value }))} className="flex-1 px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" />
                  {(itemForm.type === 'app' || itemForm.type === 'folder') && (
                    <button type="button" onClick={handlePickPath} className="px-3 py-2 rounded-xl bg-primary text-white">Escolher</button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-textSecondary mb-2">Delay (ms)</label>
                <input type="number" value={itemForm.delay} onChange={(e) => setItemForm((prev) => ({ ...prev, delay: Number(e.target.value) }))} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-textSecondary"><input type="checkbox" checked={itemForm.runAsAdmin} onChange={(e) => setItemForm((prev) => ({ ...prev, runAsAdmin: e.target.checked }))} /> Executar como administrador</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-3 rounded-xl glass text-textSecondary">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {workspaces.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Layers size={48} className="text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-textPrimary mb-3">Nenhum Workspace ainda</h3>
          <p className="text-textSecondary max-w-md mx-auto mb-8">Crie seu primeiro workspace para organizar apps, sites, pastas e comandos</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 rounded-2xl transition-all neon-glow text-white font-medium text-lg"
          >
            <Plus size={24} />
            Criar Primeiro Workspace
          </button>
        </div>
      )}
    </div>
  );
}
