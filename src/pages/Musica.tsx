import { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, LogOut, Search, ListMusic, Sparkles, Disc3, Library } from 'lucide-react';
import { buildRecommendationSeed, getArtistsLabel } from '@/lib/spotifyUtils';
import { spotifyService } from '@/lib/spotifyService';

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
  const [searchType, setSearchType] = useState<'track' | 'album' | 'artist' | 'playlist'>('track');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [albumDetails, setAlbumDetails] = useState<any>(null);
  const [albumSaved, setAlbumSaved] = useState(false);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [scopeWarning, setScopeWarning] = useState<string | null>(null);
  // Playlists
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistActionMsg, setPlaylistActionMsg] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [viewingPlaylist, setViewingPlaylist] = useState<any | null>(null);
  const [addMenuTrackUri, setAddMenuTrackUri] = useState<string | null>(null);
  const [addMenuTrackName, setAddMenuTrackName] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalCreating, setModalCreating] = useState(false);
  const [modalAdding, setModalAdding] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [playlistsTracksMap, setPlaylistsTracksMap] = useState<Record<string, any[]>>({});
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});
  const [viewingArtist, setViewingArtist] = useState<any | null>(null);
  const [artistTopTracks, setArtistTopTracks] = useState<any[]>([]);
  const lastTrackIdRef = useRef<string | null>(null);

  const getLastSpotifyError = async (): Promise<any> => {
    try {
      return await (window as any).electronAPI.spotifyGetLastLog();
    } catch {
      return null;
    }
  };

  const spotifyBodyMessage = (body: string): string => {
    try {
      const parsed = JSON.parse(body);
      return parsed?.error?.message || parsed?.message || '';
    } catch {
      return '';
    }
  };

  const describeSpotifyError = (last: any, actionLabel: string): string => {
    const generic = `Não foi possível ${actionLabel}.`;
    if (!last) return `${generic} Verifique sua conexão (veja console).`;
    const body = typeof last.body === 'string' ? last.body : '';
    const reason = spotifyBodyMessage(body);
    if (last.status === 403) {
      return `${generic} Acesso negado pelo Spotify.${reason ? ` Motivo: ${reason}.` : ''} Refaça a conexão (Desconectar → Conectar) para conceder as permissões necessárias.`;
    }
    if (last.status === 401) {
      return `${generic} Sessão do Spotify expirada. Desconecte e conecte novamente.`;
    }
    if (last.status === 400 && /device/i.test(body)) {
      return `Nenhum dispositivo ativo no Spotify. Abra o Spotify e toque uma música, ou selecione um dispositivo para ${actionLabel}.`;
    }
    return `${generic} Erro ${last.status}${last.statusText ? ` ${last.statusText}` : ''}${body ? `: ${body.slice(0, 140)}` : ''}`;
  };

  // Tenta reproduzir e, se não houver dispositivo ativo, transfere para o primeiro disponível e tenta de novo
  const tryPlayWithFallback = async (body?: any): Promise<any> => {
    let res = await spotifyService.play(body);
    if (res === null && devices.length > 0) {
      const active = devices.find((d) => d.is_active) || devices[0];
      if (active?.id) {
        await spotifyService.transferPlayback(active.id).catch(() => {});
        await new Promise((r) => setTimeout(r, 400));
        res = await spotifyService.play(body);
      }
    }
    return res;
  };

  // Contagem de faixas de uma playlist: prefere as faixas já carregadas quando o total da API vier zerado/ausente
  const getPlaylistTrackCount = (pl: any) => {
    const loaded = playlistsTracksMap[pl.id]?.length;
    if (loaded && loaded > 0) return loaded;
    return pl.tracks?.total || 0;
  };

  const openAddMenu = (uri: string, name?: string) => {
    setAddMenuTrackUri(uri);
    setAddMenuTrackName(name || null);
    setModalSearch('');
    setPlaylistActionMsg(null);
  };

  const closeAddMenu = () => {
    setAddMenuTrackUri(null);
    setAddMenuTrackName(null);
  };

  // Fecha o modal com a tecla Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAddMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    checkConnection();

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onSpotifyAuthSuccess(() => {
        checkConnection();
      });
      // Sessão expirada/revogada no meio da execução: desloga e avisa o usuário
      (window as any).electronAPI.onSpotifyAuthLost(() => {
        setIsConnected(false);
        setCurrentTrack(null);
        lastTrackIdRef.current = null;
        setStatusMessage('Sessão do Spotify expirada. Conecte novamente para continuar.');
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
        // Conexões feitas antes da v1.0.23 não têm permissão de editar playlists — avisa para reconectar
        const scopes = tokens.scopes ? String(tokens.scopes).split(/\s+/) : [];
        const missingPlaylistScope = scopes.length > 0
          ? !['playlist-modify-public', 'playlist-modify-private'].some((s) => scopes.includes(s))
          : false;
        setScopeWarning(missingPlaylistScope
          ? 'Sua conexão não tem permissão de editar playlists (conexão antiga). Desconecte e conecte novamente para conceder as permissões atuais do Spotify.'
          : null);
        await Promise.all([fetchCurrentPlayback(), loadDevices(), loadTopStats(), loadPlaylists()]);
      }
    }
  };

  const fetchCurrentPlayback = async () => {
    try {
      const data = await spotifyService.getCurrentlyPlaying();
      if (data && data.item) {
        setCurrentTrack(data.item);
        setIsPlaying(data.is_playing);
        setRepeatState(data.repeat_state || 'off');
        setShuffleState(data.shuffle_state || false);
        setProgressMs(data.progress_ms || 0);
        setDurationMs(data.item.duration_ms || 0);
        // Só busca recomendações quando a faixa muda (evita chamadas repetidas a cada segundo)
        if (lastTrackIdRef.current !== data.item.id) {
          lastTrackIdRef.current = data.item.id;
          await loadRecommendations(data.item);
        }
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
      const nextState = !shuffleState;
      let res = await spotifyService.setShuffle(nextState);
      if (res === null) {
        // Se não houver dispositivo ativo, tenta apontar para o dispositivo disponível
        const target = devices.find((d) => d.is_active) || devices[0];
        if (target?.id) {
          await spotifyService.transferPlayback(target.id).catch(() => {});
          await new Promise((r) => setTimeout(r, 400));
          res = await spotifyService.setShuffle(nextState);
        }
      }
      if (res === null) {
        const last = await getLastSpotifyError();
        console.error('toggleShuffle failed, last log:', last);
        setStatusMessage(describeSpotifyError(last, 'alternar a reprodução aleatória'));
        return;
      }
      setShuffleState(nextState);
      setStatusMessage(nextState ? 'Reprodução aleatória ativada.' : 'Reprodução aleatória desativada.');
    } catch (err) {
      console.error('Erro ao alternar shuffle:', err);
      setStatusMessage('Não foi possível alternar a reprodução aleatória.');
    }
  };

  const cycleRepeat = async () => {
    try {
      const nextState = repeatState === 'off' ? 'context' : repeatState === 'context' ? 'track' : 'off';
      let res = await spotifyService.setRepeat(nextState);
      if (res === null) {
        const target = devices.find((d) => d.is_active) || devices[0];
        if (target?.id) {
          await spotifyService.transferPlayback(target.id).catch(() => {});
          await new Promise((r) => setTimeout(r, 400));
          res = await spotifyService.setRepeat(nextState);
        }
      }
      if (res === null) {
        const last = await getLastSpotifyError();
        console.error('cycleRepeat failed, last log:', last);
        setStatusMessage(describeSpotifyError(last, 'alterar o modo de repetição'));
        return;
      }
      setRepeatState(nextState);
      setStatusMessage(nextState === 'off' ? 'Repetição desligada.' : nextState === 'context' ? 'Repetir álbum/contexto.' : 'Repetir faixa.');
    } catch (err) {
      console.error('Erro ao alternar repetição:', err);
      setStatusMessage('Não foi possível alterar o modo de repetição.');
    }
  };

  const loadDevices = async () => {
    try {
      const data = await spotifyService.getDevices();
      setDevices(data?.devices || []);
    } catch (err) {
      console.error('Erro ao buscar dispositivos:', err);
    }
  };

  const loadTopStats = async () => {
    try {
      const [tracksResponse, artistsResponse] = await Promise.all([
        spotifyService.getTopItems('tracks', 'short_term', 5),
        spotifyService.getTopItems('artists', 'short_term', 5),
      ]);
      setTopTracks(tracksResponse?.items || tracksResponse || []);
      setTopArtists(artistsResponse?.items || artistsResponse || []);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      setStatusMessage('Não foi possível carregar as estatísticas do Spotify.');
    }
  };

  const loadPlaylists = async () => {
    try {
      const res = await spotifyService.getMyPlaylists(50, 0);
      setPlaylists(res?.items || res || []);
    } catch (err) {
      console.error('Erro ao carregar playlists:', err);
      setPlaylistActionMsg('Não foi possível carregar suas playlists.');
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return setPlaylistActionMsg('Nome da playlist não pode ser vazio.');
    try {
      const me = await spotifyService.getCurrentUser();
      if (!me || !me.id) {
        setPlaylistActionMsg('Não foi possível obter informações do usuário. Refaça a conexão.');
        return;
      }
      const body = { name: newPlaylistName, public: false, description: 'Criada pelo GuiHub' };
      const res = await spotifyService.createPlaylist(me.id, body);
      if (!res) {
        const last = await getLastSpotifyError();
        console.error('createPlaylist failed, last log:', last);
        setPlaylistActionMsg(describeSpotifyError(last, 'criar a playlist'));
        return;
      }
      setNewPlaylistName('');
      setPlaylistActionMsg('Playlist criada.');
      // prepend the new playlist to UI and reload
      await loadPlaylists();
      // open the newly created playlist
      if (res.id) {
        const newly = res;
        setViewingPlaylist(newly);
        await loadPlaylistTracks(newly.id);
      }
    } catch (err) {
      console.error('Erro ao criar playlist:', err);
      setPlaylistActionMsg('Não foi possível criar a playlist.');
    }
  };

  const addTrackToPlaylist = async (playlistId: string, uri: string): Promise<boolean> => {
    try {
      const res = await spotifyService.addPlaylistTracks(playlistId, [uri]);
      if (res === null) {
        const last = await getLastSpotifyError();
        console.error('addTrackToPlaylist failed, last log:', last);
        setPlaylistActionMsg(describeSpotifyError(last, 'adicionar a faixa'));
        return false;
      }
      setPlaylistActionMsg('Faixa adicionada à playlist.');
      // refresh playlist view if it's open
      if (viewingPlaylist?.id === playlistId) await loadPlaylistTracks(playlistId);
      // refresh map for expanded playlist
      if (expandedPlaylists[playlistId]) await loadPlaylistTracks(playlistId);
      return true;
    } catch (err) {
      console.error('Erro ao adicionar faixa à playlist:', err);
      setPlaylistActionMsg('Não foi possível adicionar a faixa.');
      return false;
    }
  };

  const loadPlaylistTracks = async (playlistId: string) => {
    try {
      const res = await spotifyService.getPlaylistTracks(playlistId, 100, 0);
      if (res === null) {
        const last = await getLastSpotifyError();
        console.error('loadPlaylistTracks failed, last log:', last);
        setPlaylistTracks([]);
        setPlaylistsTracksMap(prev => ({ ...prev, [playlistId]: [] }));
        setPlaylistActionMsg(describeSpotifyError(last, 'carregar as faixas da playlist'));
        return;
      }
      const items = res?.items || res || [];
      setPlaylistTracks(items);
      setPlaylistsTracksMap(prev => ({ ...prev, [playlistId]: items }));
      // Se a playlist está aberta e a API retornou total zerado/ausente, atualiza o total com o que foi carregado
      if (viewingPlaylist?.id === playlistId && items.length > 0 && items.length < 100 && !viewingPlaylist.tracks?.total) {
        setViewingPlaylist(prev => prev ? { ...prev, tracks: { ...(prev.tracks || {}), total: items.length } } : prev);
      }
    } catch (err) {
      console.error('Erro ao carregar faixas da playlist:', err);
      setPlaylistActionMsg(describeSpotifyError(await getLastSpotifyError().catch(() => null), 'carregar as faixas da playlist'));
    }
  };

  const openPlaylist = async (pl: any) => {
    setViewingPlaylist(pl);
    await loadPlaylistTracks(pl.id);
  };

  const toggleExpandPlaylist = async (pl: any) => {
    const currently = !!expandedPlaylists[pl.id];
    const next = { ...expandedPlaylists, [pl.id]: !currently };
    setExpandedPlaylists(next);
    if (!currently) {
      // load tracks if not loaded
      if (!playlistsTracksMap[pl.id]) await loadPlaylistTracks(pl.id);
    }
  };

  const playPlaylist = async (playlistId: string) => {
    try {
      const res = await tryPlayWithFallback({ context_uri: `spotify:playlist:${playlistId}` });
      if (res === null) {
        const last = await getLastSpotifyError();
        console.error('playPlaylist failed, last log:', last);
        setStatusMessage(describeSpotifyError(last, 'reproduzir a playlist'));
        return;
      }
      setStatusMessage('Reproduzindo playlist.');
      setTimeout(fetchCurrentPlayback, 700);
    } catch (err) {
      console.error('Erro ao tocar playlist:', err);
      setStatusMessage('Não foi possível tocar a playlist.');
    }
  };

  const playTrackInPlaylist = async (playlistId: string, trackUri: string) => {
    try {
      const body = { context_uri: `spotify:playlist:${playlistId}`, offset: { uri: trackUri } };
      const res = await tryPlayWithFallback(body);
      if (res === null) {
        const last = await getLastSpotifyError();
        console.error('playTrackInPlaylist failed, last log:', last);
        setStatusMessage(describeSpotifyError(last, 'reproduzir a faixa'));
        return;
      }
      setStatusMessage('Reproduzindo seleção da playlist.');
      setTimeout(fetchCurrentPlayback, 700);
    } catch (err) {
      console.error('Erro ao tocar faixa na playlist:', err);
      setStatusMessage('Não foi possível reproduzir a faixa.');
    }
  };

  const enqueueTrack = async (trackUri: string) => {
    try {
      let res = await spotifyService.addToQueue(trackUri);
      if (res === null) {
        // Fallback: tenta enfileirar apontando para o dispositivo ativo (ou o primeiro disponível)
        const target = devices.find((d) => d.is_active) || devices[0];
        if (target?.id) {
          res = await spotifyService.addToQueue(trackUri, target.id);
        }
      }
      if (res === null) {
        const last = await getLastSpotifyError();
        console.error('enqueueTrack failed, last log:', last);
        setStatusMessage(describeSpotifyError(last, 'enfileirar a faixa'));
        return;
      }
      setStatusMessage('Faixa adicionada à fila.');
    } catch (err) {
      console.error('Erro ao enfileirar faixa:', err);
      setStatusMessage('Não foi possível adicionar à fila.');
    }
  };

  const viewArtist = async (artistId: string) => {
    try {
      const [artistResp, topResp] = await Promise.all([
        spotifyService.getArtist(artistId),
        spotifyService.getArtistTopTracks(artistId),
      ]);
      setViewingArtist(artistResp);
      setArtistTopTracks(topResp?.tracks || topResp || []);
    } catch (err) {
      console.error('Erro ao carregar artista:', err);
      setStatusMessage('Não foi possível carregar o artista.');
    }
  };

  const loadRecommendations = async (track: any) => {
    try {
      const seed = buildRecommendationSeed(track);
      const params: Record<string, string | number> = { limit: '5' };
      if ((seed as any).seed_tracks) params.seed_tracks = (seed as any).seed_tracks.join(',');
      if ((seed as any).seed_artists) params.seed_artists = (seed as any).seed_artists.join(',');
      const data = await spotifyService.getRecommendations(params);
      setRecommendations(data?.tracks || []);
    } catch (err) {
      console.error('Erro ao buscar recomendações:', err);
      setRecommendations([]);
    }
  };

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await spotifyService.pause();
        setIsPlaying(false);
      } else {
        await spotifyService.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Erro ao controlar reprodução:', err);
      setStatusMessage('Não foi possível controlar a reprodução.');
    }
  };

  const handleSearch = async (e?: React.FormEvent, typeOverride?: string) => {
    if (e) e.preventDefault();
    const type = typeOverride || searchType;
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setStatusMessage(null);

    try {
      console.log('Spotify search:', { q: searchQuery.trim(), type });
      let res = null;
      let lastLog = null;
      const tryLimits = [20, 10, 1];
      for (let i = 0; i < tryLimits.length; i++) {
        const limit = tryLimits[i];
        console.log('Spotify search attempt limit=', limit);
        res = await spotifyService.search(searchQuery.trim(), type, limit);
        console.log('Spotify search response (attempt):', res);
        if (res !== null) break;
        try {
          lastLog = await (window as any).electronAPI.spotifyGetLastLog();
          console.log('Último log do main (search null):', lastLog);
          if (lastLog && lastLog.status === 403) break;
        } catch (e) {
          console.error('Erro ao obter último log do main:', e);
        }
      }

      if (res === null) {
        if (lastLog && lastLog.status === 403) {
          setStatusMessage('Acesso negado (403). Refaça a conexão ao Spotify para conceder permissões necessárias (Desconectar → Conectar).');
        } else if (lastLog && lastLog.status === 400) {
          setStatusMessage(`Erro na busca: ${lastLog.statusText} - ${lastLog.body || ''}`);
        } else {
          setStatusMessage('Erro ao consultar a API do Spotify. Verifique se está conectado (veja console).');
        }
        setSearchResults([]);
        return;
      }
      const results = res?.[type === 'track' ? 'tracks' : `${type}s`]?.items || [];
      setSearchResults(results);
      if (results.length === 0) {
        setStatusMessage('Nenhum resultado encontrado para essa busca.');
      }
    } catch (err) {
      console.error('Erro na busca por músicas:', err);
      setSearchResults([]);
      setStatusMessage('Não foi possível buscar no Spotify.');
    } finally {
      setSearchLoading(false);
    }
  };

  const playTrackByUri = async (uri: string) => {
    try {
      const res = await tryPlayWithFallback({ uris: [uri] });
      if (res === null) {
        const last = await getLastSpotifyError();
        console.error('playTrackByUri failed, last log:', last);
        setStatusMessage(describeSpotifyError(last, 'reproduzir a faixa'));
        return;
      }
      setTimeout(fetchCurrentPlayback, 700);
    } catch (err) {
      console.error('Erro ao reproduzir faixa:', err);
      setStatusMessage('Não foi possível iniciar a reprodução.');
    }
  };

  const nextTrack = async () => {
    try {
      await spotifyService.next();
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para próxima faixa:', err);
      setStatusMessage('Não foi possível avançar para a próxima faixa.');
    }
  };

  const previousTrack = async () => {
    try {
      await spotifyService.previous();
      setTimeout(fetchCurrentPlayback, 500);
    } catch (err) {
      console.error('Erro ao ir para faixa anterior:', err);
      setStatusMessage('Não foi possível voltar para a faixa anterior.');
    }
  };

  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    try {
      await spotifyService.setVolume(value);
    } catch (err) {
      console.error('Erro ao alterar volume:', err);
      setStatusMessage('Não foi possível ajustar o volume do Spotify.');
    }
  };

  const transferPlayback = async (deviceId: string) => {
    try {
      await spotifyService.transferPlayback(deviceId);
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
      const [albumResponse, savedResponse] = await Promise.all([
        spotifyService.getAlbum(albumId),
        spotifyService.checkAlbumsSaved([albumId]),
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
      if (save) await spotifyService.saveAlbums([albumDetails.id]);
      else await spotifyService.removeAlbums([albumDetails.id]);
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
      lastTrackIdRef.current = null;
      setDevices([]);
      setTopTracks([]);
      setTopArtists([]);
      setRecommendations([]);
      setAlbumDetails(null);
      setAlbumSaved(false);
      setScopeWarning(null);
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
          {isConnected && (
            <button
              onClick={async () => {
                // diagnostic check
                try {
                  const electronApi = (window as any).electronAPI;
                  console.log('Diagnóstico Spotify: obtendo tokens...');
                  const tokens = await electronApi.spotifyGetTokens();
                  console.log('Diagnóstico tokens:', tokens);
                  setStatusMessage('Executando diagnóstico do Spotify (ver console para detalhes)...');

                  // Escopos concedidos ao token atual
                  const scopes = tokens?.scopes ? String(tokens.scopes).split(/\s+/) : [];
                  console.log('Diagnóstico scopes concedidos:', scopes);
                  const hasPlaylistModify = scopes.some((s: string) => s === 'playlist-modify-public' || s === 'playlist-modify-private');
                  const hasPlaylistRead = scopes.some((s: string) => s === 'playlist-read-private' || s === 'playlist-read-collaborative');

                  // try /me
                  const me = await spotifyService.getCurrentUser();
                  console.log('Diagnóstico /me response:', me);

                  // try a simple search
                  const testSearch = await spotifyService.search('test', 'track', 1);
                  console.log('Diagnóstico search response:', testSearch);

                  // Testa carregar as faixas de uma playlist pública (funciona com qualquer token válido)
                  let tracksTest: any = 'não executado';
                  if (testSearch) {
                    const plSearch = await spotifyService.search('playlist', 'playlist', 1);
                    const pl = plSearch?.playlists?.items?.[0];
                    if (pl) {
                      const plTracks = await spotifyService.getPlaylistTracks(pl.id, 5, 0);
                      tracksTest = plTracks ? `ok (${(plTracks.items || []).length} faixas em "${pl.name}")` : 'FALHOU (null)';
                    }
                  }
                  console.log('Diagnóstico getPlaylistTracks:', tracksTest);

                  if (!me) setStatusMessage('Diagnóstico: /me retornou null (problema de autenticação).');
                  else if (!testSearch) {
                    // try get last main log
                    const last = await electronApi.spotifyGetLastLog();
                    console.log('Último log do main:', last);
                    setStatusMessage(last ? `Diagnóstico: busca retornou null. Último erro: ${last.status} ${last.statusText}` : 'Diagnóstico: busca retornou null (sem log disponível).');
                  } else {
                    const scopesMsg = scopes.length > 0 ? `${scopes.length} escopos (${hasPlaylistModify ? 'playlist-modify ✓' : 'playlist-modify ✗'}, ${hasPlaylistRead ? 'playlist-read ✓' : 'playlist-read ✗'})` : 'desconhecidos';
                    setStatusMessage(`Diagnóstico: API OK. Escopos: ${scopesMsg}. Faixas de playlist: ${tracksTest}. Detalhes no console.`);
                  }
                } catch (err) {
                  console.error('Erro no diagnóstico Spotify:', err);
                  setStatusMessage('Erro durante diagnóstico. Ver console para detalhes.');
                }
              }}
              className="ml-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all"
            >
              Verificar Spotify
            </button>
          )}
        </div>

        {statusMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {statusMessage}
          </div>
        )}

        {scopeWarning && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center justify-between gap-3">
            <span>{scopeWarning}</span>
            <button
              onClick={async () => {
                await (window as any).electronAPI?.spotifyLogout();
                setIsConnected(false);
                setCurrentTrack(null);
                lastTrackIdRef.current = null;
                setScopeWarning(null);
                setStatusMessage('Autorize novamente o Spotify para conceder as permissões de playlist.');
                handleLogin();
              }}
              className="shrink-0 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors"
            >
              Reconectar
            </button>
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
              <form onSubmit={handleSearch} className="mb-6 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
                  <div className="flex gap-2 flex-wrap">
                    {['track', 'album', 'artist', 'playlist'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          if (searchType === type) return;
                          setSearchType(type as any);
                          // limpa os resultados antigos (do tipo anterior) e procura de novo automaticamente
                          setSearchResults([]);
                          setStatusMessage(null);
                          if (searchQuery.trim()) {
                            handleSearch(undefined, type as any);
                          }
                        }}
                        className={`rounded-full px-4 py-2 text-sm transition-all ${searchType === type ? 'bg-emerald-500 text-white' : 'bg-cardHover text-textSecondary hover:bg-white/5'}`}
                      >
                        {type === 'track' ? 'Faixas' : type === 'album' ? 'Álbum' : type === 'artist' ? 'Artistas' : 'Playlists'}
                      </button>
                    ))}
                  </div>
                  <button type="submit" className="px-4 py-3 bg-primary rounded-2xl text-white">Buscar</button>
                </div>
                {searchLoading && (
                  <div className="flex items-center gap-3 text-sm text-textSecondary">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Buscando {searchType}...
                  </div>
                )}
              </form>

              {searchResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-textPrimary mb-2">Resultados de {searchType === 'track' ? 'faixas' : searchType === 'album' ? 'álbuns' : searchType === 'artist' ? 'artistas' : 'playlists'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((item) => (
                      <div key={item.id || item.uri} className="p-3 rounded-xl bg-cardHover flex items-center gap-3">
                        {item.images?.[0]?.url || item.album?.images?.[0]?.url ? (
                          <img src={item.images?.[0]?.url || item.album?.images?.[0]?.url} alt={item.name} className="w-12 h-12 rounded" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center text-xs text-textSecondary">N/A</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-textPrimary">{item.name || item.uri}</div>
                          <div className="truncate text-xs text-textSecondary">
                            {searchType === 'track' && item.artists?.map((a:any) => a.name).join(', ')}
                            {searchType === 'album' && item.artists?.map((a:any) => a.name).join(', ')}
                            {searchType === 'artist' && item.genres?.slice(0, 2).join(', ')}
                            {searchType === 'playlist' && item.owner?.display_name}
                          </div>
                        </div>
                        {searchType === 'track' ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => playTrackByUri(item.uri)} className="px-3 py-2 bg-green-500 text-white rounded-xl">Play</button>
                            <button onClick={() => enqueueTrack(item.uri)} className="px-3 py-2 bg-cardHover text-sm rounded">Tocar a seguir</button>
                            <button onClick={() => openAddMenu(item.uri, item.name)} className="px-3 py-2 bg-cardHover text-sm rounded">...</button>
                          </div>
                        ) : searchType === 'album' ? (
                          <button onClick={() => viewAlbum(item.id)} className="px-3 py-2 bg-emerald-500 text-white rounded-xl">Abrir álbum</button>
                        ) : searchType === 'artist' ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => viewArtist(item.id)} className="px-3 py-2 bg-emerald-500 text-white rounded-xl">Abrir artista</button>
                          </div>
                        ) : searchType === 'playlist' ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => openPlaylist(item)} className="px-3 py-2 bg-emerald-500 text-white rounded-xl">Abrir playlist</button>
                          </div>
                        ) : null}
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
                          style={{ width: `${durationMs > 0 ? (progressMs / durationMs) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-4 mb-6">
                    <div className="flex items-center justify-center gap-4">
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
                    <div className="flex items-center gap-4 text-xs text-textSecondary">
                      <span>Shuffle: {shuffleState ? 'ON' : 'OFF'}</span>
                      <span>Repetição: {repeatState === 'off' ? 'Desligado' : repeatState === 'context' ? 'Álbum/Contexto' : 'Faixa'}</span>
                    </div>
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

            {/* Playlists section */}
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-textPrimary">
                  <ListMusic size={18} className="text-emerald-400" />
                  Playlists
                </div>
                <div className="text-sm text-textSecondary">Gerencie suas playlists</div>
              </div>

              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da nova playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="flex-1 pl-4 pr-3 py-2 rounded-2xl glass text-textPrimary placeholder-textSecondary"
                />
                <button
                  onClick={async () => {
                    if (creatingPlaylist) return;
                    setCreatingPlaylist(true);
                    try {
                      await createPlaylist();
                    } finally {
                      setCreatingPlaylist(false);
                    }
                  }}
                  disabled={creatingPlaylist}
                  className="px-4 py-2 rounded-2xl bg-emerald-500 text-white disabled:opacity-50"
                >{creatingPlaylist ? 'Criando...' : 'Criar'}</button>
              </div>

              {playlistActionMsg && <div className="mb-3 text-sm text-textSecondary">{playlistActionMsg}</div>}

              <div className="space-y-2">
                {playlists.length > 0 ? playlists.map((pl:any) => (
                  <div key={pl.id} className="rounded-2xl bg-cardHover px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <button
                          onClick={() => openPlaylist(pl)}
                          title={`Abrir ${pl.name}`}
                          className="truncate w-full text-left font-medium text-textPrimary hover:text-emerald-400 transition-colors"
                        >
                          {pl.name}
                        </button>
                        <div className="truncate text-xs text-textSecondary">{getPlaylistTrackCount(pl)} faixas • por {pl.owner?.display_name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => playPlaylist(pl.id)} className="px-3 py-2 bg-green-500 text-white rounded-xl">Tocar playlist</button>
                        {currentTrack ? (
                          <button onClick={() => addTrackToPlaylist(pl.id, currentTrack.uri)} className="px-3 py-2 bg-emerald-500 text-white rounded-xl">Adicionar faixa atual</button>
                        ) : (
                          <button disabled className="px-3 py-2 bg-cardHover text-textSecondary rounded-xl">Sem faixa</button>
                        )}
                        <button onClick={() => toggleExpandPlaylist(pl)} className="px-3 py-2 bg-cardHover rounded">{expandedPlaylists[pl.id] ? '▾' : '▸'}</button>
                      </div>
                    </div>

                    {expandedPlaylists[pl.id] && (
                      <div className="mt-3 space-y-2">
                        {(playlistsTracksMap[pl.id] || []).length > 0 ? playlistsTracksMap[pl.id].map((p:any, idx:number) => (
                          <div key={p.track?.id || idx} className="flex items-center justify-between rounded-2xl bg-black/10 px-3 py-2">
                              <div className="min-w-0">
                              <div className="truncate font-medium text-textPrimary">{p.track?.name}</div>
                              <div className="truncate text-xs text-textSecondary">{getArtistsLabel(p.track?.artists)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => playTrackInPlaylist(pl.id, p.track.uri)} className="px-3 py-2 bg-green-500 text-white rounded-xl">Play</button>
                              <button onClick={() => enqueueTrack(p.track.uri)} className="px-3 py-2 bg-cardHover text-sm rounded">Tocar a seguir</button>
                              <button onClick={() => openAddMenu(p.track.uri, p.track?.name)} className="px-3 py-2 bg-cardHover text-sm rounded">...</button>
                            </div>
                          </div>
                        )) : <div className="text-sm text-textSecondary">Carregando faixas...</div>}
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-textSecondary">Você não possui playlists ou não foram carregadas.</p>
                )}
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

            {/* Artist view */}
            {viewingArtist && (
              <div className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-textPrimary">
                    <Disc3 size={18} className="text-emerald-400" />
                    Artista: {viewingArtist.name}
                  </div>
                  <div className="text-sm text-textSecondary">Gêneros: {viewingArtist.genres?.slice(0,3).join(', ')}</div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <img src={viewingArtist.images?.[0]?.url} alt={viewingArtist.name} className="w-full max-w-[260px] rounded-lg" />
                  </div>
                  <div>
                    <h4 className="text-sm text-textSecondary mb-2">Top tracks</h4>
                    <div className="space-y-2">
                      {artistTopTracks.map((t) => (
                        <div key={t.id} className="flex items-center justify-between rounded-2xl bg-cardHover px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-textPrimary">{t.name}</div>
                            <div className="truncate text-xs text-textSecondary">{getArtistsLabel(t.artists)}</div>
                          </div>
                          <div>
                            <button onClick={() => playTrackByUri(t.uri)} className="px-3 py-2 bg-green-500 text-white rounded-xl mr-2">Play</button>
                            <button onClick={() => enqueueTrack(t.uri)} className="px-3 py-2 bg-cardHover text-sm rounded">Tocar a seguir</button>
                            <button onClick={() => openAddMenu(t.uri, t.name)} className="px-3 py-2 bg-cardHover text-sm rounded">...</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Playlist view */}
            {viewingPlaylist && (
              <div className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-textPrimary">
                    <ListMusic size={18} className="text-emerald-400" />
                    Playlist: {viewingPlaylist.name}
                  </div>
                  <div className="text-sm text-textSecondary">{playlistTracks.length > 0 ? playlistTracks.length : (viewingPlaylist.tracks?.total || 0)} faixas</div>
                </div>
                <div className="space-y-2">
                  {playlistTracks.length > 0 ? playlistTracks.map((p:any, idx:number) => (
                    <div key={p.track?.id || idx} className="flex items-center justify-between rounded-2xl bg-cardHover px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-textPrimary">{p.track?.name}</div>
                        <div className="truncate text-xs text-textSecondary">{getArtistsLabel(p.track?.artists)}</div>
                      </div>
                      <div>
                        <button onClick={() => playTrackByUri(p.track.uri)} className="px-3 py-2 bg-green-500 text-white rounded-xl">Play</button>
                      </div>
                    </div>
                  )) : <p className="text-sm text-textSecondary">Sem faixas nesta playlist.</p>}
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
                {albumLoading && (
                  <div className="mt-4 flex items-center gap-3 text-sm text-textSecondary">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Carregando álbum...
                  </div>
                )}
                <p className="mt-4 text-xs text-textSecondary">{albumSaved ? 'Este álbum já está salvo na sua biblioteca.' : 'Ainda não está na sua biblioteca.'}</p>
              </div>
            )}
          </div>
        )}
          {/* Modal: adicionar faixa a uma playlist */}
          {addMenuTrackUri && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={(e) => { if (e.target === e.currentTarget) closeAddMenu(); }}
            >
              <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-textPrimary truncate">Adicionar{addMenuTrackName ? `: ${addMenuTrackName}` : ''}</h3>
                  <button onClick={closeAddMenu} className="text-textSecondary hover:text-textPrimary transition-colors" title="Fechar (Esc)">✕</button>
                </div>

                {playlistActionMsg && (
                  <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    {playlistActionMsg}
                  </div>
                )}

                <div className="mb-3">
                  <input
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Filtrar playlists..."
                    className="w-full pl-3 pr-3 py-2 rounded-2xl bg-cardHover text-textPrimary focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Criar nova playlist"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="flex-1 pl-3 pr-3 py-2 rounded-2xl bg-cardHover text-textPrimary focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    disabled={modalCreating || modalAdding}
                  />
                  <button
                    onClick={async () => {
                      if (!newPlaylistName.trim()) return setPlaylistActionMsg('Nome da playlist não pode ser vazio.');
                      try {
                        setModalCreating(true);
                        await createPlaylist();
                      } catch (e) {
                        console.error('Erro ao criar playlist no modal:', e);
                      } finally {
                        setModalCreating(false);
                      }
                    }}
                    className="px-3 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                    disabled={modalCreating || modalAdding}
                  >{modalCreating ? 'Criando...' : 'Criar'}</button>
                </div>

                <div className="space-y-2 max-h-64 overflow-auto mb-4">
                  {(() => {
                    const filtered = playlists.filter((pl:any) => pl.name.toLowerCase().includes(modalSearch.toLowerCase()));
                    return filtered.length > 0 ? filtered.map((pl:any) => (
                      <div key={pl.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5">
                        <div className="truncate">{pl.name}</div>
                        <button
                          onClick={async () => {
                            try {
                              setModalAdding(true);
                              const ok = await addTrackToPlaylist(pl.id, addMenuTrackUri);
                              if (ok) closeAddMenu();
                            } catch (e) {
                              console.error('Erro ao adicionar faixa no modal:', e);
                            } finally {
                              setModalAdding(false);
                            }
                          }}
                          className="px-3 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                          disabled={modalAdding || modalCreating}
                        >{modalAdding ? 'Adicionando...' : 'Adicionar'}</button>
                      </div>
                    )) : (
                      <div className="text-sm text-textSecondary">Nenhuma playlist disponível.</div>
                    );
                  })()}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={closeAddMenu} className="px-4 py-2 rounded-2xl bg-cardHover text-textSecondary hover:text-textPrimary transition-colors">Cancelar</button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
