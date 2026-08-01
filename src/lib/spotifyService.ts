export const spotifyService = {
  api: async (endpoint: string, method: string = 'GET', body?: any) => {
    if (typeof window === 'undefined' || !window.electronAPI) return null;
    const opts: any = {};
    opts.endpoint = endpoint;
    if (method) opts.method = method;
    if (body !== undefined) opts.body = body;
    // @ts-ignore - ipc payload shape is validated in preload/main; avoid excess prop TS error
    return window.electronAPI.spotifyApi(opts);
  },

  // Users
  getCurrentUser: async () => spotifyService.api('/me'),
  getTopItems: async (type: 'artists' | 'tracks', timeRange: 'short_term' | 'medium_term' | 'long_term' = 'short_term', limit = 20, offset = 0) => spotifyService.api(`/me/top/${type}?time_range=${timeRange}&limit=${limit}&offset=${offset}`),
  getUser: async (userId: string) => spotifyService.api(`/users/${userId}`),
  createPlaylist: async (userId: string, details: { name: string; description?: string; public?: boolean; collaborative?: boolean }) => spotifyService.api(`/users/${userId}/playlists`, 'POST', details),

  // Albums
  getAlbum: async (id: string) => spotifyService.api(`/albums/${id}`),
  getAlbums: async (ids: string[]) => spotifyService.api(`/albums?ids=${ids.join(',')}`),
  getAlbumTracks: async (id: string, limit = 20, offset = 0) => spotifyService.api(`/albums/${id}/tracks?limit=${limit}&offset=${offset}`),

  // Artists
  getArtist: async (id: string) => spotifyService.api(`/artists/${id}`),
  getArtists: async (ids: string[]) => spotifyService.api(`/artists?ids=${ids.join(',')}`),
  getArtistAlbums: async (id: string, includeGroups = 'album,single,appears_on,compilation', limit = 20, offset = 0) => spotifyService.api(`/artists/${id}/albums?include_groups=${encodeURIComponent(includeGroups)}&limit=${limit}&offset=${offset}`),
  getArtistTopTracks: async (id: string, market = 'from_token') => spotifyService.api(`/artists/${id}/top-tracks?market=${market}`),
  getRelatedArtists: async (id: string) => spotifyService.api(`/artists/${id}/related-artists`),

  // Audiobooks
  getAudiobook: async (id: string) => spotifyService.api(`/audiobooks/${id}`),
  getAudiobooks: async (ids: string[]) => spotifyService.api(`/audiobooks?ids=${ids.join(',')}`),
  getAudiobookChapters: async (id: string, limit = 20, offset = 0) => spotifyService.api(`/audiobooks/${id}/chapters?limit=${limit}&offset=${offset}`),

  // Categories
  getCategories: async (country?: string, locale?: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (country) params.set('country', country);
    if (locale) params.set('locale', locale);
    return spotifyService.api(`/browse/categories?${params.toString()}`);
  },
  getCategory: async (id: string, country?: string, locale?: string) => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (locale) params.set('locale', locale);
    return spotifyService.api(`/browse/categories/${id}${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getCategoryPlaylists: async (categoryId: string, country?: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (country) params.set('country', country);
    return spotifyService.api(`/browse/categories/${categoryId}/playlists?${params.toString()}`);
  },
  getFeaturedPlaylists: async (country?: string, locale?: string, timestamp?: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (country) params.set('country', country);
    if (locale) params.set('locale', locale);
    if (timestamp) params.set('timestamp', timestamp);
    return spotifyService.api(`/browse/featured-playlists?${params.toString()}`);
  },

  // Chapters
  getChapter: async (id: string) => spotifyService.api(`/chapters/${id}`),
  getChapters: async (ids: string[]) => spotifyService.api(`/chapters?ids=${ids.join(',')}`),

  // Episodes
  getEpisode: async (id: string, market = 'from_token') => spotifyService.api(`/episodes/${id}?market=${market}`),
  getEpisodes: async (ids: string[], market = 'from_token') => spotifyService.api(`/episodes?ids=${ids.join(',')}&market=${market}`),

  // Markets
  getMarkets: async () => spotifyService.api('/markets'),

  // Player
  getPlayer: async () => spotifyService.api('/me/player'),
  transferPlayback: async (deviceId: string, play: boolean = true) => spotifyService.api('/me/player', 'PUT', { device_ids: [deviceId], play }),
  getDevices: async () => spotifyService.api('/me/player/devices'),
  getCurrentlyPlaying: async () => spotifyService.api('/me/player/currently-playing'),
  play: async (body?: any) => spotifyService.api('/me/player/play', 'PUT', body),
  pause: async () => spotifyService.api('/me/player/pause', 'PUT'),
  next: async () => spotifyService.api('/me/player/next', 'POST'),
  previous: async () => spotifyService.api('/me/player/previous', 'POST'),
  seek: async (positionMs: number) => spotifyService.api(`/me/player/seek?position_ms=${positionMs}`, 'PUT'),
  setRepeat: async (state: 'off' | 'context' | 'track') => spotifyService.api(`/me/player/repeat?state=${state}`, 'PUT'),
  setVolume: async (volumePercent: number) => spotifyService.api(`/me/player/volume?volume_percent=${volumePercent}`, 'PUT'),
  setShuffle: async (state: boolean) => spotifyService.api(`/me/player/shuffle?state=${state}`, 'PUT'),
  getRecentlyPlayed: async (limit = 20) => spotifyService.api(`/me/player/recently-played?limit=${limit}`),
  getQueue: async () => spotifyService.api('/me/player/queue'),
  addToQueue: async (uri: string, deviceId?: string) => {
    const query = [`uri=${encodeURIComponent(uri)}`];
    if (deviceId) query.push(`device_id=${encodeURIComponent(deviceId)}`);
    return spotifyService.api(`/me/player/queue?${query.join('&')}`, 'POST');
  },

  // Playlists
  getPlaylist: async (id: string) => spotifyService.api(`/playlists/${id}`),
  updatePlaylist: async (id: string, details: { name?: string; description?: string; public?: boolean; collaborative?: boolean }) => spotifyService.api(`/playlists/${id}`, 'PUT', details),
  getPlaylistTracks: async (id: string, limit = 20, offset = 0, market?: string) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (market) params.set('market', market);
    return spotifyService.api(`/playlists/${id}/tracks?${params.toString()}`);
  },
  addPlaylistTracks: async (id: string, uris: string[], position?: number) => {
    const query = position !== undefined ? `?position=${position}` : '';
    return spotifyService.api(`/playlists/${id}/tracks${query}`, 'POST', { uris });
  },
  updatePlaylistTracks: async (id: string, body: { range_start: number; insert_before: number; range_length?: number; snapshot_id?: string }) => spotifyService.api(`/playlists/${id}/tracks`, 'PUT', body),
  removePlaylistTracks: async (id: string, tracks: { uri: string; positions?: number[] }[], snapshot_id?: string) => spotifyService.api(`/playlists/${id}/tracks${snapshot_id ? `?snapshot_id=${snapshot_id}` : ''}`, 'DELETE', { tracks }),
  getMyPlaylists: async (limit = 20, offset = 0) => spotifyService.api(`/me/playlists?limit=${limit}&offset=${offset}`),
  getUserPlaylists: async (userId: string, limit = 20, offset = 0) => spotifyService.api(`/users/${userId}/playlists?limit=${limit}&offset=${offset}`),
  getPlaylistImages: async (id: string) => spotifyService.api(`/playlists/${id}/images`),
  uploadPlaylistImage: async (id: string, imageBase64: string) => spotifyService.api(`/playlists/${id}/images`, 'PUT', imageBase64),

  // Shows / Podcasts
  getShow: async (id: string, market = 'from_token') => spotifyService.api(`/shows/${id}?market=${market}`),
  getShows: async (ids: string[], market = 'from_token') => spotifyService.api(`/shows?ids=${ids.join(',')}&market=${market}`),
  getShowEpisodes: async (id: string, market = 'from_token', limit = 20, offset = 0) => spotifyService.api(`/shows/${id}/episodes?market=${market}&limit=${limit}&offset=${offset}`),

  // Recommendations
  getRecommendations: async (seedParams: Record<string, string | number> = {}) => {
    const params = new URLSearchParams();
    Object.entries(seedParams).forEach(([key, value]) => params.set(key, String(value)));
    return spotifyService.api(`/recommendations?${params.toString()}`);
  },

  // Search
  search: async (query: string, type: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({ q: query, type, limit: String(limit), offset: String(offset) });
    return spotifyService.api(`/search?${params.toString()}`);
  },

  // Library
  getSavedAlbums: async (limit = 20, offset = 0) => spotifyService.api(`/me/albums?limit=${limit}&offset=${offset}`),
  saveAlbums: async (ids: string[]) => spotifyService.api(`/me/albums`, 'PUT', { ids }),
  removeAlbums: async (ids: string[]) => spotifyService.api(`/me/albums?ids=${ids.join(',')}`, 'DELETE'),
  checkAlbumsSaved: async (ids: string[]) => spotifyService.api(`/me/albums/contains?ids=${ids.join(',')}`),
  getSavedAudiobooks: async (limit = 20, offset = 0) => spotifyService.api(`/me/audiobooks?limit=${limit}&offset=${offset}`),
  saveAudiobooks: async (ids: string[]) => spotifyService.api(`/me/audiobooks`, 'PUT', { ids }),
  removeAudiobooks: async (ids: string[]) => spotifyService.api(`/me/audiobooks?ids=${ids.join(',')}`, 'DELETE'),
  checkAudiobooksSaved: async (ids: string[]) => spotifyService.api(`/me/audiobooks/contains?ids=${ids.join(',')}`),
  getSavedEpisodes: async (limit = 20, offset = 0) => spotifyService.api(`/me/episodes?limit=${limit}&offset=${offset}`),
  saveEpisodes: async (ids: string[]) => spotifyService.api(`/me/episodes`, 'PUT', { ids }),
  removeEpisodes: async (ids: string[]) => spotifyService.api(`/me/episodes?ids=${ids.join(',')}`, 'DELETE'),
  checkEpisodesSaved: async (ids: string[]) => spotifyService.api(`/me/episodes/contains?ids=${ids.join(',')}`),
  getSavedShows: async (limit = 20, offset = 0) => spotifyService.api(`/me/shows?limit=${limit}&offset=${offset}`),
  saveShows: async (ids: string[]) => spotifyService.api(`/me/shows`, 'PUT', { ids }),
  removeShows: async (ids: string[]) => spotifyService.api(`/me/shows?ids=${ids.join(',')}`, 'DELETE'),
  checkShowsSaved: async (ids: string[]) => spotifyService.api(`/me/shows/contains?ids=${ids.join(',')}`),
  getSavedTracks: async (limit = 20, offset = 0) => spotifyService.api(`/me/tracks?limit=${limit}&offset=${offset}`),
  saveTracks: async (ids: string[]) => spotifyService.api(`/me/tracks`, 'PUT', { ids }),
  removeTracks: async (ids: string[]) => spotifyService.api(`/me/tracks?ids=${ids.join(',')}`, 'DELETE'),
  checkTracksSaved: async (ids: string[]) => spotifyService.api(`/me/tracks/contains?ids=${ids.join(',')}`),

  // Tracks and Audio
  getTrack: async (id: string) => spotifyService.api(`/tracks/${id}`),
  getTracks: async (ids: string[]) => spotifyService.api(`/tracks?ids=${ids.join(',')}`),
  getAudioFeatures: async (id: string) => spotifyService.api(`/audio-features/${id}`),
  getAudioFeaturesForTracks: async (ids: string[]) => spotifyService.api(`/audio-features?ids=${ids.join(',')}`),
  getAudioAnalysis: async (id: string) => spotifyService.api(`/audio-analysis/${id}`),

  // Following
  followPlaylist: async (id: string, publicPlaylist = false) => spotifyService.api(`/playlists/${id}/followers`, 'PUT', { public: publicPlaylist }),
  unfollowPlaylist: async (id: string) => spotifyService.api(`/playlists/${id}/followers`, 'DELETE'),
  getFollowedArtists: async (type: 'artist' = 'artist', limit = 20, after?: string) => {
    const query = [`type=${type}`, `limit=${limit}`];
    if (after) query.push(`after=${after}`);
    return spotifyService.api(`/me/following?${query.join('&')}`);
  },
  followArtistsOrUsers: async (type: 'artist' | 'user', ids: string[]) => spotifyService.api(`/me/following?type=${type}`, 'PUT', { ids }),
  unfollowArtistsOrUsers: async (type: 'artist' | 'user', ids: string[]) => spotifyService.api(`/me/following?type=${type}`, 'DELETE', { ids }),
  checkFollowing: async (type: 'artist' | 'user', ids: string[]) => spotifyService.api(`/me/following/contains?type=${type}&ids=${ids.join(',')}`),
  checkPlaylistFollowers: async (playlistId: string, userIds: string[]) => spotifyService.api(`/playlists/${playlistId}/followers/contains?ids=${userIds.join(',')}`),
};
