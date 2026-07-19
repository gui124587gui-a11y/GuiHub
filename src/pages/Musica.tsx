import React, { useState, useEffect } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, LogOut, Search } from 'lucide-react';

export default function Musica() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    checkConnection();
    // Ouvir evento de sucesso na autenticação
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onSpotifyAuthSuccess(() => {
        checkConnection();
      });
    }

    // Polling para atualizar a faixa atual (a cada 3 segundos)
    const interval = setInterval(() => {
      if (isConnected) {
        fetchCurrentPlayback();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const tokens = await (window as any).electronAPI.spotifyGetTokens();
      if (tokens.accessToken) {
        setIsConnected(true);
        fetchCurrentPlayback();
      }
    }
  };

  const fetchCurrentPlayback = async () => {
    try {
      const data = await (window as any).electronAPI.spotifyApi({ endpoint: '/me/player/currently-playing' });
      if (data && data.item) {
        setCurrentTrack(data.item);
        setIsPlaying(data.is_playing);
        setProgressMs(data.progress_ms || 0);
        setDurationMs(data.item.duration_ms || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar faixa atual:', err);
    }
  };

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await (window as any).electronAPI.spotifyApi({ endpoint: '/me/player/pause', method: 'PUT' });
        setIsPlaying(false);
      } else {
        await (window as any).electronAPI.spotifyApi({ endpoint: '/me/player/play', method: 'PUT' });
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Erro ao controlar reprodução:', err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await (window as any).electronAPI.spotifyApi({ endpoint: `/search?q=${encodeURIComponent(searchQuery.trim())}&type=track&limit=8` });
      const tracks = res?.tracks?.items || [];
      setSearchResults(tracks);
    } catch (err) {
      console.error('Erro na busca por músicas:', err);
      setSearchResults([]);
    }
  };

  const playTrackByUri = async (uri: string) => {
    try {
      await (window as any).electronAPI.spotifyApi({ endpoint: '/me/player/play', method: 'PUT', body: { uris: [uri] } });
      setTimeout(fetchCurrentPlayback, 700);
    } catch (err) {
      console.error('Erro ao reproduzir faixa:', err);
    }
  };

  const nextTrack = async () => {
    try {
      await (window as any).electronAPI.spotifyApi({ endpoint: '/me/player/next', method: 'POST' });
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para próxima faixa:', err);
    }
  };

  const previousTrack = async () => {
    try {
      await (window as any).electronAPI.spotifyApi({ endpoint: '/me/player/previous', method: 'POST' });
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para faixa anterior:', err);
    }
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.spotifyLogin();
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.spotifyLogout();
      setIsConnected(false);
      setCurrentTrack(null);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
            <Music size={32} />
            Música
          </h1>
          {isConnected && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
            >
              <LogOut size={18} />
              Desconectar
            </button>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-16 glass rounded-3xl">
            <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Music size={64} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-textPrimary mb-4">Conectar ao Spotify</h2>
            <p className="text-textSecondary mb-8 max-w-md mx-auto">
              Conecte sua conta Spotify para controlar a reprodução diretamente do GuiHub
            </p>
            <button
              onClick={handleLogin}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-2xl text-white font-semibold text-lg transition-all neon-glow"
            >
              Conectar Spotify
            </button>
          </div>
        ) : (
          <div className="glass rounded-3xl p-8">
            <form onSubmit={handleSearch} className="mb-6 flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary"><Search size={18} /></div>
                <input
                  type="text"
                  placeholder="Buscar música por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl glass text-textPrimary placeholder-textSecondary focus:outline-none"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-primary rounded-2xl text-white">Buscar</button>
            </form>

            {searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-textPrimary mb-2">Resultados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.map((t) => (
                    <div key={t.id} className="p-3 rounded-xl bg-cardHover flex items-center gap-3">
                      <img src={t.album.images[0]?.url} alt={t.name} className="w-12 h-12 rounded" />
                      <div className="flex-1">
                        <div className="font-medium text-textPrimary">{t.name}</div>
                        <div className="text-xs text-textSecondary">{t.artists.map((a:any)=>a.name).join(', ')}</div>
                      </div>
                      <button onClick={() => playTrackByUri(t.uri)} className="px-3 py-2 bg-green-500 text-white rounded-xl">Play</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentTrack ? (
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={currentTrack.album.images[0]?.url}
                    alt={currentTrack.album.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold text-textPrimary mb-2">{currentTrack.name}</h2>
                  <p className="text-lg text-textSecondary mb-6">
                    {currentTrack.artists.map((a: any) => a.name).join(', ')}
                  </p>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-textSecondary">{formatTime(progressMs)}</span>
                      <span className="text-textSecondary">{formatTime(durationMs)}</span>
                    </div>
                    <div className="w-full h-2 bg-card rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                        style={{ width: `${(progressMs / durationMs) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <button className="p-3 rounded-full text-textSecondary hover:text-textPrimary transition-all">
                      <Shuffle size={24} />
                    </button>
                    <button
                      onClick={previousTrack}
                      className="p-4 rounded-full text-textPrimary hover:bg-cardHover transition-all"
                    >
                      <SkipBack size={32} fill="currentColor" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="p-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all neon-glow"
                    >
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                    </button>
                    <button
                      onClick={nextTrack}
                      className="p-4 rounded-full text-textPrimary hover:bg-cardHover transition-all"
                    >
                      <SkipForward size={32} fill="currentColor" />
                    </button>
                    <button className="p-3 rounded-full text-textSecondary hover:text-textPrimary transition-all">
                      <Repeat size={24} />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <VolumeX size={20} className="text-textSecondary" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-48 h-2 bg-card rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #22c55e 0%, #22c55e ${volume}%, rgba(255,255,255,0.1) ${volume}%, rgba(255,255,255,0.1) 100%)`
                      }}
                    />
                    <Volume2 size={20} className="text-textSecondary" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Music size={48} className="text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-textPrimary mb-2">Nenhuma faixa reproduzindo</h3>
                <p className="text-textSecondary">Abra o Spotify e comece a reproduzir uma música!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
