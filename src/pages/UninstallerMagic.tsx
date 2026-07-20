import React, { useState, useEffect, useRef } from 'react';
import { Trash2, CheckCircle, AlertCircle, Sparkles, Loader2, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusUpdate {
  step: number;
  totalSteps: number;
  text: string;
  status: 'in-progress' | 'success' | 'error' | 'warning';
  progress?: number; // 0-100 for uninstall step
  type?: 'prompt-sent' | 'ai-response';
  content?: string | Record<string, string>;
}

export default function UninstallerMagic() {
  const [softwareName, setSoftwareName] = useState('');
  const [statusLogs, setStatusLogs] = useState<StatusUpdate[]>([]);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [detectedSoftware, setDetectedSoftware] = useState<string>('');
  const statusEndRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(5);
  const [uninstallProgress, setUninstallProgress] = useState(0);

  // Scroll to bottom of status log
  useEffect(() => {
    statusEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statusLogs]);

  // Listen for status updates and manual uninstall signal
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.uninstallerOnStatus?.((newStatus: StatusUpdate) => {
        setStatusLogs((prev) => [...prev, newStatus]);
        setCurrentStep(newStatus.step);
        setTotalSteps(newStatus.totalSteps);
        if (newStatus.progress !== undefined) {
          setUninstallProgress(newStatus.progress);
        }
      });

      window.electronAPI.uninstallerOnNeedsManual?.(() => {
        setShowManualModal(true);
      });

      window.electronAPI.uninstallerOnDetected?.((detected: string) => {
        setDetectedSoftware(detected);
        setShowConfirmModal(true);
      });
    }
  }, []);

  const handleUninstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!softwareName.trim() || isUninstalling) return;

    setIsUninstalling(true);
    setStatusLogs([]);
    setCurrentStep(0);
    setUninstallProgress(0);
    setShowConfirmModal(false);
    setShowManualModal(false);

    try {
      // Chama IA para detectar o software correto
      const detected = await window.electronAPI?.uninstallerDetect(softwareName.trim());
      if (detected) {
        setDetectedSoftware(detected);
        setShowConfirmModal(true);
      } else {
        throw new Error('Software não detectado');
      }
    } catch (err) {
      console.error('Uninstall detect error:', err);
      setStatusLogs((prev) => [
        ...prev,
        {
          step: 1,
          totalSteps: 5,
          text: `Erro ao detectar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          status: 'error'
        }
      ]);
      setIsUninstalling(false);
    }
  };

  const handleConfirmUninstall = async () => {
    try {
      setShowConfirmModal(false);
      // Inicia desinstalação em modo silencioso
      await window.electronAPI?.uninstallerStart(detectedSoftware);
    } catch (err) {
      console.error('Uninstall start error:', err);
    } finally {
      setIsUninstalling(false);
    }
  };

  const handleRejectUninstall = () => {
    setShowConfirmModal(false);
    setIsUninstalling(false);
    setStatusLogs([]);
    setSoftwareName('');
    setDetectedSoftware('');
  };

  const handleManualConfirm = async () => {
    try {
      const confirmed = await window.electronAPI?.uninstallerConfirmComplete();
      if (confirmed !== false) {
        setStatusLogs((prev) => [
          ...prev,
          {
            step: 5,
            totalSteps: 5,
            text: 'Desinstalação manual confirmada. Limpeza concluída.',
            status: 'success'
          }
        ]);
      }
    } catch (err) {
      console.error('Manual confirm error:', err);
    } finally {
      setShowManualModal(false);
      setIsUninstalling(false);
    }
  };

  const handleRejectManual = () => {
    setShowManualModal(false);
    setIsUninstalling(false);
  };

  // Calculate overall progress
  const overallProgress = Math.min(
    Math.round(((currentStep - 1 + (uninstallProgress / 100)) / totalSteps) * 100),
    100
  );

  // Status icon mapping
  const getStatusIcon = (status: StatusUpdate['status'], type?: StatusUpdate['type']) => {
    if (type === 'prompt-sent') return <Send size={18} className="text-blue-400" />;
    if (type === 'ai-response') return <MessageSquare size={18} className="text-purple-400" />;
    
    switch (status) {
      case 'in-progress':
        return <Loader2 size={18} className="text-primary animate-spin" />;
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertCircle size={18} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const renderLogContent = (log: StatusUpdate) => {
    if (log.type === 'prompt-sent' && log.content) {
      const content = log.content as Record<string, string>;
      return (
        <div className="mt-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-xs font-semibold text-blue-400 mb-2">Prompt Sistema:</p>
          <pre className="text-xs text-textSecondary whitespace-pre-wrap mb-2">{content.system}</pre>
          <p className="text-xs font-semibold text-blue-400 mb-2">Prompt Usuário:</p>
          <pre className="text-xs text-textPrimary whitespace-pre-wrap">{content.user}</pre>
        </div>
      );
    }
    if (log.type === 'ai-response' && log.content) {
      return (
        <div className="mt-2 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <p className="text-xs font-semibold text-purple-400 mb-2">Resposta IA:</p>
          <pre className="text-xs text-textPrimary whitespace-pre-wrap">{typeof log.content === 'string' ? log.content : JSON.stringify(log.content, null, 2)}</pre>
        </div>
      );
    }
    return <span className="text-textPrimary">{log.text}</span>;
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20">
              <Sparkles size={48} className="text-red-500" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-textPrimary mb-2">Desinstalador Inteligente</h1>
          <p className="text-textSecondary text-lg">Digite o nome do software e deixe o resto com a gente</p>
        </div>

        <div className="glass rounded-3xl p-8 mb-8">
          <form onSubmit={handleUninstall} className="flex flex-col gap-6">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Ex: Chrome, Discord, VS Code, Node..."
                value={softwareName}
                onChange={(e) => setSoftwareName(e.target.value)}
                disabled={isUninstalling}
                className="flex-1 px-6 py-4 rounded-2xl bg-card/30 border border-red-500/20 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-red-500 transition-all"
              />
              <button
                type="submit"
                disabled={!softwareName.trim() || isUninstalling}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-semibold flex items-center gap-2 transition-all neon-glow"
              >
                <Trash2 size={20} />
                {isUninstalling ? 'Processando...' : 'Desinstalar'}
              </button>
            </div>

            {/* Progress Bar */}
            {statusLogs.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Progresso</span>
                  <span className="text-textPrimary font-semibold">{Math.max(0, overallProgress)}%</span>
                </div>
                <div className="h-3 bg-card/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-600 transition-all duration-300"
                    style={{ width: `${Math.max(0, overallProgress)}%` }}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Status Log */}
        {statusLogs.length > 0 && (
          <div className="glass rounded-3xl p-6">
            <h3 className="text-xl font-semibold text-textPrimary mb-4 flex items-center gap-2">
              <CheckCircle size={24} className="text-red-500" />
              Log de Desinstalação
            </h3>
            <div className="bg-card/40 rounded-2xl p-4 max-h-[500px] overflow-y-auto">
              {statusLogs.map((log, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex items-start gap-3 mb-4 pl-2 border-l-2 last:mb-0",
                    log.type === 'prompt-sent' && "border-blue-500",
                    log.type === 'ai-response' && "border-purple-500",
                    !log.type && log.status === 'success' && "border-green-500",
                    !log.type && log.status === 'error' && "border-red-500",
                    !log.type && log.status === 'warning' && "border-yellow-500",
                    !log.type && log.status === 'in-progress' && "border-red-500"
                  )}
                >
                  {getStatusIcon(log.status, log.type)}
                  <div className="flex-1">
                    {renderLogContent(log)}
                  </div>
                </div>
              ))}
              <div ref={statusEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Confirm Uninstall Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle size={40} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-textPrimary mb-2">Confirmar Desinstalação</h3>
              <p className="text-textSecondary mb-4">
                Você deseja desinstalar:
              </p>
              <p className="text-xl font-semibold text-red-400 bg-red-500/10 rounded-xl p-3 mb-4">
                {detectedSoftware}
              </p>
              <p className="text-sm text-textSecondary">
                A IA detectou este programa. Se estiver correto, confirme para continuar.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRejectUninstall}
                className="flex-1 py-3 bg-card/30 hover:bg-card/50 rounded-xl text-textPrimary font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUninstall}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-xl text-white font-semibold transition-all neon-glow"
              >
                Sim, Desinstalar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Uninstall Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                <AlertCircle size={40} className="text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold text-textPrimary mb-2">Modo Manual Necessário</h3>
              <p className="text-textSecondary">
                A desinstalação silenciosa falhou. O desinstalador foi aberto — por favor, complete manualmente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRejectManual}
                className="flex-1 py-3 bg-card/30 hover:bg-card/50 rounded-xl text-textPrimary font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleManualConfirm}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-xl text-white font-semibold transition-all neon-glow"
              >
                Confirmar Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}