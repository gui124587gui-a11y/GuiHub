import React, { useState } from 'react';
import { HardDrive, Plus, Trash2, Play, Clock, FolderOpen, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function Backup() {
  const { 
    backupProfiles, 
    addBackupProfile, 
    updateBackupProfile, 
    deleteBackupProfile, 
    addHistoryItem 
  } = useAppStore();
  
  const [isRunning, setIsRunning] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const name = profileName.trim();
    if (!name) return;

    addBackupProfile({
      name,
      folders: [],
      lastBackup: 'Nunca',
      size: '0 GB',
      status: 'idle',
      progress: 0,
    });

    addHistoryItem({
      type: 'workspace',
      title: name,
      description: 'Criou perfil de backup',
    });
    setProfileName('');
    setIsCreateModalOpen(false);
  };

  const deleteProfile = (profileId: string) => {
    const profile = backupProfiles.find(p => p.id === profileId);
    if (profile) {
      deleteBackupProfile(profileId);
      addHistoryItem({
        type: 'workspace',
        title: profile.name,
        description: 'Removeu perfil de backup',
      });
    }
  };

  const addFolderToProfile = async (profileId: string) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const selectedPath = await (window as any).electronAPI.selectDirectory();
      if (selectedPath) {
        const currentProfile = backupProfiles.find(p => p.id === profileId);
        if (currentProfile) {
          updateBackupProfile(profileId, {
            folders: [...currentProfile.folders, selectedPath]
          });
        }
      }
    }
  };

  const startBackup = (id: string) => {
    setIsRunning(id);
    updateBackupProfile(id, { status: 'running', progress: 0 });

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        updateBackupProfile(id, { status: 'completed', progress: 100, lastBackup: 'Agora' });
        setIsRunning(null);
        const profile = backupProfiles.find(p => p.id === id);
        if (profile) {
          addHistoryItem({
            type: 'workspace',
            title: profile.name,
            description: 'Backup concluído',
          });
        }
      } else {
        updateBackupProfile(id, { progress: Math.round(progress) });
      }
    }, 500);
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Backup</h1>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl transition-all neon-glow">
          <Plus size={20} />
          Criar Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-green-500/20">
              <CheckCircle2 size={24} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-textPrimary">Último Backup</h3>
              <p className="text-textSecondary">Hoje, 14:30</p>
            </div>
          </div>
          <p className="text-textSecondary">Total: 12.5 GB</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Clock size={24} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-textPrimary">Próximo Backup</h3>
              <p className="text-textSecondary">Amanhã, 02:00</p>
            </div>
          </div>
          <p className="text-textSecondary">Agendado diariamente</p>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-textPrimary">Novo Perfil de Backup</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-textSecondary hover:text-textPrimary">✕</button>
            </div>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-sm text-textSecondary mb-2">Nome</label>
                <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-card/40 border border-primary/20 text-textPrimary" placeholder="Ex: Backup Documentos" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl glass text-textSecondary">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-textPrimary mb-4">Perfis de Backup</h2>
      <div className="space-y-6">
        {backupProfiles.map((profile) => (
          <div key={profile.id} className="glass rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <HardDrive size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-textPrimary">{profile.name}</h3>
                  <p className="text-sm text-textSecondary">{profile.folders.length} pasta(s)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startBackup(profile.id)}
                  disabled={isRunning === profile.id}
                  className={`p-2 rounded-lg transition-all ${
                    isRunning === profile.id
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  <Play size={18} className="text-white" />
                </button>
                <button onClick={() => deleteProfile(profile.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-textSecondary hover:text-red-400 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-textSecondary flex items-center gap-2">
                  <FolderOpen size={16} />
                  Pastas
                </p>
                <button 
                  onClick={() => addFolderToProfile(profile.id)}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <Plus size={14} /> Adicionar Pasta
                </button>
              </div>
              {profile.folders.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.folders.map((folder, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-lg bg-cardHover text-xs text-textSecondary truncate max-w-full">
                      {folder}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-textSecondary/70 mb-2">Nenhuma pasta selecionada</p>
              )}
              <div className="flex items-center justify-between text-sm text-textSecondary">
                <span>Último backup: {profile.lastBackup}</span>
                <span>Tamanho: {profile.size}</span>
              </div>
            </div>

            {profile.status === 'running' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-textSecondary">Progresso</span>
                  <span className="text-sm font-semibold text-primary">{profile.progress}%</span>
                </div>
                <div className="w-full h-2 bg-cardHover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                    style={{ width: `${profile.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {profile.status === 'completed' && (
              <div className="mt-4 flex items-center gap-2 text-green-400">
                <CheckCircle2 size={18} />
                <span className="text-sm">Backup concluído com sucesso!</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
