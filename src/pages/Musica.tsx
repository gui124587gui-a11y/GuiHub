import { useState, useEffect } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, LogOut, Search, ListMusic, Sparkles, Disc3, Library } from 'lucide-react';
import { buildRecommendationSeed, getArtistsLabel } from '@/lib/spotifyUtils';

export default function Musica() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatState, setRepeatState] = useState<'off' | 'context' | 'track'>('off');
  const [shuffleState, setShuffleState] = useState(false);
  const [volume, setVolume] = useState(50);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [albumDetails, setAlbumDetails] = useState<any>(null);
  const [albumSaved, setAlbumSaved] = useState(false);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onSpotifyAuthSuccess(() => {
        checkConnection();
      });
    }

    const interval = setInterval(() => {
      if (isConnected) {
        fetchCurrentPlayback();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const tokens = await (window as any).electronAPI.spotifyGetTokens();
      if (tokens.accessToken) {
        setIsConnected(true);
        await Promise.all([fetchCurrentPlayback(), loadDevices(), loadTopStats()]);
      }
    }
  };

  const fetchCurrentPlayback = async () => {
    try {
      const electronApi = (window as any).electronAPI;
      const data = await electronApi.spotifyApi({ endpoint: '/me/player/currently-playing' });
      if (data && data.item) {
        setCurrentTrack(data.item);
        setIsPlaying(data.is_playing);
        setRepeatState(data.repeat_state || 'off');
        setShuffleState(data.shuffle_state || false);
        setProgressMs(data.progress_ms || 0);
        setDurationMs(data.item.duration_ms || 0);
        await loadRecommendations(data.item);
      } else {
        setCurrentTrack(null);
        setRecommendations([]);
        setAlbumDetails(null);
      }
    } catch (err) {
      console.error('Erro ao buscar faixa atual:', err);
      setStatusMessage('Não foi possível carregar a reprodução atual do Spotify.');
    }
  };

  const toggleShuffle = async () => {
    try {
      const electronApi = (window as any).electronAPI;
      const nextState = !shuffleState;
      await electronApi.spotifyApi({ endpoint: `/me/player/shuffle?state=${nextState}`, method: 'PUT' });
      setShuffleState(nextState);
      setStatusMessage(nextState ? 'Reprodução aleatória ativada.' : 'Reprodução aleatória desativada.');
    } catch (err) {
      console.error('Erro ao alternar shuffle:', err);
      setStatusMessage('Não foi possível alternar a reprodução aleatória.');
    }
  };

  const cycleRepeat = async () => {
    try {
      const electronApi = (window as any).electronAPI;
      const nextState = repeatState === 'off' ? 'context' : repeatState === 'context' ? 'track' : 'off';
      await electronApi.spotifyApi({ endpoint: `/me/player/repeat?state=${nextState}`, method: 'PUT' });
      setRepeatState(nextState);
      setStatusMessage(nextState === 'off' ? 'Repetição desligada.' : nextState === 'context' ? 'Repetir álbum/contexto.' : 'Repetir faixa.');
    } catch (err) {
      console.error('Erro ao alternar repetição:', err);
      setStatusMessage('Não foi possível alterar o modo de repetição.');
    }
  };

  const loadDevices = async () => {
    try {
      const electronApi = (window as any).electronAPI;
      const data = await electronApi.spotifyApi({ endpoint: '/me/player/devices' });
      setDevices(data?.devices || []);
    } catch (err) {
      console.error('Erro ao buscar dispositivos:', err);
    }
  };

  const loadTopStats = async () => {
    try {
      const electronApi = (window as any).electronAPI;
      const [tracksResponse, artistsResponse] = await Promise.all([
        electronApi.spotifyApi({ endpoint: '/me/top/tracks?limit=5&time_range=short_term' }),
        electronApi.spotifyApi({ endpoint: '/me/top/artists?limit=5&time_range=short_term' }),
      ]);
      setTopTracks(tracksResponse?.items || []);
      setTopArtists(artistsResponse?.items || []);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      setStatusMessage('Não foi possível carregar as estatísticas do Spotify.');
    }
  };

  const loadRecommendations = async (track: any) => {
    try {
      const electronApi = (window as any).electronAPI;
      const seed = buildRecommendationSeed(track);
      const params = new URLSearchParams({ limit: '5' });

      if ((seed as any).seed_tracks) {
        params.set('seed_tracks', (seed as any).seed_tracks.join(','));
      }

      if ((seed as any).seed_artists) {
        params.set('seed_artists', (seed as any).seed_artists.join(','));
      }

      const data = await electronApi.spotifyApi({ endpoint: `/recommendations?${params.toString()}` });
      setRecommendations(data?.tracks || []);
    } catch (err) {
      console.error('Erro ao buscar recomendações:', err);
      setRecommendations([]);
    }
  };

  const togglePlay = async () => {
    try {
      const electronApi = (window as any).electronAPI;
      if (isPlaying) {
        await electronApi.spotifyApi({ endpoint: '/me/player/pause', method: 'PUT' });
        setIsPlaying(false);
      } else {
        await electronApi.spotifyApi({ endpoint: '/me/player/play', method: 'PUT' });
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Erro ao controlar reprodução:', err);
      setStatusMessage('Não foi possível controlar a reprodução.');
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const electronApi = (window as any).electronAPI;
      const res = await electronApi.spotifyApi({ endpoint: `/search?q=${encodeURIComponent(searchQuery.trim())}&type=track&limit=20` });
      const tracks = res?.tracks?.items || [];
      setSearchResults(tracks);
    } catch (err) {
      console.error('Erro na busca por músicas:', err);
      setSearchResults([]);
      setStatusMessage('Não foi possível buscar músicas no Spotify.');
    }
  };

  const playTrackByUri = async (uri: string) => {
    try {
      const electronApi = (window as any).electronAPI;
      await electronApi.spotifyApi({ endpoint: '/me/player/play', method: 'PUT', body: { uris: [uri] } });
      setTimeout(fetchCurrentPlayback, 700);
    } catch (err) {
      console.error('Erro ao reproduzir faixa:', err);
      setStatusMessage('Não foi possível iniciar a reprodução.');
    }
  };

  const nextTrack = async () => {
    try {
      const electronApi = (window as any).electronAPI;
      await electronApi.spotifyApi({ endpoint: '/me/player/next', method: 'POST' });
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para próxima faixa:', err);
      setStatusMessage('Não foi possível avançar para a próxima faixa.');
    }
  };

  const previousTrack = async () => {
    try {
      const electronApi = (window as any).electronAPI;
      await electronApi.spotifyApi({ endpoint: '/me/player/previous', method: 'POST' });
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para faixa anterior:', err);
      setStatusMessage('Não foi possível voltar para a faixa anterior.');
    }
  };

  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    try {
      const electronApi = (window as any).electronAPI;
      await electronApi.spotifyApi({ endpoint: `/me/player/volume?volume_percent=${value}`, method: 'PUT' });
    } catch (err) {
      console.error('Erro ao alterar volume:', err);
      setStatusMessage('Não foi possível ajustar o volume do Spotify.');
    }
  };

  const transferPlayback = async (deviceId: string) => {
    try {
      const electronApi = (window as any).electronAPI;
      await electronApi.spotifyApi({ endpoint: '/me/player', method: 'PUT', body: { device_ids: [deviceId] } });
      setStatusMessage('Reprodução transferida para o dispositivo selecionado.');
    } catch (err) {
      console.error('Erro ao transferir reprodução:', err);
      setStatusMessage('Não foi possível transferir a reprodução.');
    }
  };

  const viewAlbum = async (albumId?: string) => {
    if (!albumId) return;

    setAlbumLoading(true);
    try {
      const electronApi = (window as any).electronAPI;
      const [albumResponse, savedResponse] = await Promise.all([
        electronApi.spotifyApi({ endpoint: `/albums/${albumId}` }),
        electronApi.spotifyApi({ endpoint: `/me/albums/contains?ids=${albumId}` }),
      ]);
      setAlbumDetails(albumResponse);
      setAlbumSaved(savedResponse?.[0] || false);
    } catch (err) {
      console.error('Erro ao carregar álbum:', err);
      setStatusMessage('Não foi possível carregar os detalhes do álbum.');
    } finally {
      setAlbumLoading(false);
    }
  };

  const toggleAlbumLibrary = async (save: boolean) => {
    if (!albumDetails?.id) return;

    try {
      const electronApi = (window as any).electronAPI;
      await electronApi.spotifyApi({ endpoint: `/me/albums?ids=${albumDetails.id}`, method: save ? 'PUT' : 'DELETE' });
      setAlbumSaved(save);
      setStatusMessage(save ? 'Álbum salvo na sua biblioteca.' : 'Álbum removido da biblioteca.');
    } catch (err) {
      console.error('Erro ao atualizar álbum:', err);
      setStatusMessage('Não foi possível atualizar o álbum na biblioteca.');
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
      setDevices([]);
      setTopTracks([]);
      setTopArtists([]);
      setRecommendations([]);
      setAlbumDetails(null);
      setAlbumSaved(false);
      setStatusMessage('Desconectado do Spotify.');
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 overflow-y-auto h-[calc(100vh-80px)] fade-in">
      <div className="max-w-6xl mx-auto">
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

        {statusMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {statusMessage}
          </div>
        )}

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
          <div className="space-y-6">
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
                  <button
                    onClick={() => viewAlbum(currentTrack.album.id)}
                    className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.01]"
                  >
                    <img
                      src={currentTrack.album.images[0]?.url}
                      alt={currentTrack.album.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl font-bold text-textPrimary mb-2">{currentTrack.name}</h2>
                    <button
                      onClick={() => viewAlbum(currentTrack.album.id)}
                      className="text-lg text-textSecondary hover:text-emerald-400 transition-colors"
                    >
                      {currentTrack.artists.map((a: any) => a.name).join(', ')} • {currentTrack.album.name}
                    </button>
                    <div className="mb-6 mt-6">
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
                      <button
                        onClick={toggleShuffle}
                        className={`p-3 rounded-full transition-all ${shuffleState ? 'bg-emerald-500/20 text-emerald-300' : 'text-textSecondary hover:text-textPrimary'}`}
                        title="Reprodução aleatória"
                      >
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
                      <button
                        onClick={cycleRepeat}
                        className={`p-3 rounded-full transition-all ${repeatState !== 'off' ? 'bg-emerald-500/20 text-emerald-300' : 'text-textSecondary hover:text-textPrimary'}`}
                        title="Repetir reprodução"
                      >
                        <Repeat size={24} />
                      </button>
                    </div>

                    <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
                          <Disc3 size={16} className="text-emerald-400" />
                          Dispositivos
                        </div>
                        <span className="text-xs text-textSecondary">Transferir reprodução</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {devices.length > 0 ? devices.map((device) => (
                          <button
                            key={device.id}
                            onClick={() => transferPlayback(device.id)}
                            className={`rounded-full px-3 py-2 text-sm transition-all ${device.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' : 'bg-cardHover text-textSecondary border border-white/10'}`}
                          >
                            {device.name}
                          </button>
                        )) : (
                          <span className="text-sm text-textSecondary">Nenhum dispositivo encontrado.</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <VolumeX size={20} className="text-textSecondary" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
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

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass rounded-3xl p-6">
                <div className="flex items-center gap-2 text-lg font-semibold text-textPrimary mb-4">
                  <ListMusic size={18} className="text-emerald-400" />
                  Top 5 Músicas
                </div>
                <div className="space-y-3">
                  {topTracks.length > 0 ? topTracks.map((track, index) => (
                    <div key={track.id} className="flex items-center gap-3 rounded-2xl bg-cardHover px-3 py-2">
                      <span className="text-sm font-semibold text-emerald-400">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-textPrimary">{track.name}</p>
                        <p className="truncate text-xs text-textSecondary">{getArtistsLabel(track.artists)}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-textSecondary">As suas músicas mais ouvidas aparecerão aqui.</p>
                  )}
                </div>
              </div>

              <div className="glass rounded-3xl p-6">
                <div className="flex items-center gap-2 text-lg font-semibold text-textPrimary mb-4">
                  <Sparkles size={18} className="text-emerald-400" />
                  Top 5 Artistas
                </div>
                <div className="space-y-3">
                  {topArtists.length > 0 ? topArtists.map((artist, index) => (
                    <div key={artist.id} className="flex items-center gap-3 rounded-2xl bg-cardHover px-3 py-2">
                      <span className="text-sm font-semibold text-emerald-400">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-textPrimary">{artist.name}</p>
                        <p className="truncate text-xs text-textSecondary">{artist.genres?.slice(0, 2).join(', ') || 'Artista em destaque'}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-textSecondary">Os seus artistas mais ouvidos aparecerão aqui.</p>
                  )}
                </div>
              </div>
            </div>

            {recommendations.length > 0 && (
              <div className="glass rounded-3xl p-6">
                <div className="flex items-center gap-2 text-lg font-semibold text-textPrimary mb-4">
                  <Sparkles size={18} className="text-emerald-400" />
                  Gostando desta faixa? Experimente estas:
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {recommendations.map((track) => (
                    <div key={track.id} className="rounded-2xl border border-white/10 bg-cardHover p-3">
                      <div className="flex items-center gap-3">
                        <img src={track.album?.images?.[0]?.url} alt={track.name} className="h-12 w-12 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-textPrimary">{track.name}</p>
                          <p className="truncate text-xs text-textSecondary">{getArtistsLabel(track.artists)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {albumDetails && (
              <div className="glass rounded-3xl p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-textPrimary mb-2">
                      <Library size={18} className="text-emerald-400" />
                      Detalhes do álbum
                    </div>
                    <p className="text-sm text-textSecondary">{albumDetails.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAlbumLibrary(true)}
                      className="rounded-2xl bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400 transition-all hover:bg-emerald-500/30"
                    >
                      Salvar álbum
                    </button>
                    <button
                      onClick={() => toggleAlbumLibrary(false)}
                      className="rounded-2xl bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-all hover:bg-red-500/30"
                    >
                      Remover da biblioteca
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-4 lg:flex-row">
                  <div className="w-full max-w-[220px] rounded-2xl overflow-hidden">
                    <img src={albumDetails.images?.[0]?.url} alt={albumDetails.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-textSecondary mb-3">{albumDetails.artists?.map((artist:any) => artist.name).join(', ')}</p>
                    <div className="space-y-2">
                      {albumDetails.tracks?.items?.map((track:any, index:number) => (
                        <div key={track.id} className="flex items-center justify-between rounded-2xl bg-cardHover px-3 py-2 text-sm">
                          <span className="text-textPrimary">{index + 1}. {track.name}</span>
                          <span className="text-textSecondary">{Math.floor(track.duration_ms / 60000)}:{Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {albumLoading && <p className="mt-4 text-sm text-textSecondary">Carregando álbum...</p>}
                <p className="mt-4 text-xs text-textSecondary">{albumSaved ? 'Este álbum já está salvo na sua biblioteca.' : 'Ainda não está na sua biblioteca.'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
