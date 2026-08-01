export const spotifyService = {
  api: async (endpoint: string, method: string = 'GET', body?: any) => {
    if (typeof window === 'undefined' || !window.electronAPI) return null;
    return window.electronAPI.spotifyApi({ endpoint, method, body });
  },

  getCurrentUser: async () => {
    return await spotifyService.api('/me');
  },

  getTopItems: async (type: 'artists' | 'tracks', timeRange: 'short_term' | 'medium_term' | 'long_term' = 'short_term', limit = 20, offset = 0) => {
    return await spotifyService.api(`/me/top/${type}?time_range=${timeRange}&limit=${limit}&offset=${offset}`);
  },

  getUser: async (userId: string) => {
    return await spotifyService.api(`/users/${userId}`);
  },

  getPlayer: async () => {
    return await spotifyService.api('/me/player');
  },

  transferPlayback: async (deviceId: string, play: boolean = true) => {
    return await spotifyService.api('/me/player', 'PUT', { device_ids: [deviceId], play });
  },

  getDevices: async () => {
    return await spotifyService.api('/me/player/devices');
  },

  getCurrentlyPlaying: async () => {
    return await spotifyService.api('/me/player/currently-playing');
  },

  play: async (body?: any) => {
    return await spotifyService.api('/me/player/play', 'PUT', body);
  },

  pause: async () => {
    return await spotifyService.api('/me/player/pause', 'PUT');
  },

  next: async () => {
    return await spotifyService.api('/me/player/next', 'POST');
  },

  previous: async () => {
    return await spotifyService.api('/me/player/previous', 'POST');
  },

  seek: async (positionMs: number) => {
    return await spotifyService.api(`/me/player/seek?position_ms=${positionMs}`, 'PUT');
  },

  setRepeat: async (state: 'off' | 'context' | 'track') => {
    return await spotifyService.api(`/me/player/repeat?state=${state}`, 'PUT');
  },

  setVolume: async (volumePercent: number) => {
    return await spotifyService.api(`/me/player/volume?volume_percent=${volumePercent}`, 'PUT');
  },

  setShuffle: async (state: boolean) => {
    return await spotifyService.api(`/me/player/shuffle?state=${state}`, 'PUT');
  },

  getRecentlyPlayed: async (limit = 20) => {
    return await spotifyService.api(`/me/player/recently-played?limit=${limit}`);
  },

  getQueue: async () => {
    return await spotifyService.api('/me/player/queue');
  },

  addToQueue: async (uri: string, deviceId?: string) => {
    const query = [`uri=${encodeURIComponent(uri)}`];
    if (deviceId) query.push(`device_id=${encodeURIComponent(deviceId)}`);
    return await spotifyService.api(`/me/player/queue?${query.join('&')}`, 'POST');
  },

  getRecommendations: async (seedParams: Record<string, string | number> = {}) => {
    const params = new URLSearchParams();
    Object.entries(seedParams).forEach(([key, value]) => params.set(key, String(value)));
    return await spotifyService.api(`/recommendations?${params.toString()}`);
  },

  search: async (query: string, type: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({ q: query, type, limit: String(limit), offset: String(offset) });
    return await spotifyService.api(`/search?${params.toString()}`);
  },

  getSavedAlbums: async (limit = 20, offset = 0) => {
    return await spotifyService.api(`/me/albums?limit=${limit}&offset=${offset}`);
  },

  saveAlbums: async (ids: string[]) => {
    return await spotifyService.api(`/me/albums`, 'PUT', { ids });
  },

  removeAlbums: async (ids: string[]) => {
    return await spotifyService.api(`/me/albums?ids=${ids.join(',')}`, 'DELETE');
  },

  checkAlbumsSaved: async (ids: string[]) => {
    return await spotifyService.api(`/me/albums/contains?ids=${ids.join(',')}`);
  },

  getSavedAudiobooks: async (limit = 20, offset = 0) => {
    return await spotifyService.api(`/me/audiobooks?limit=${limit}&offset=${offset}`);
  },

  saveAudiobooks: async (ids: string[]) => {
    return await spotifyService.api(`/me/audiobooks`, 'PUT', { ids });
  },

  removeAudiobooks: async (ids: string[]) => {
    return await spotifyService.api(`/me/audiobooks?ids=${ids.join(',')}`, 'DELETE');
  },

  checkAudiobooksSaved: async (ids: string[]) => {
    return await spotifyService.api(`/me/audiobooks/contains?ids=${ids.join(',')}`);
  },

  getSavedEpisodes: async (limit = 20, offset = 0) => {
    return await spotifyService.api(`/me/episodes?limit=${limit}&offset=${offset}`);
  },

  saveEpisodes: async (ids: string[]) => {
    return await spotifyService.api(`/me/episodes`, 'PUT', { ids });
  },

  removeEpisodes: async (ids: string[]) => {
    return await spotifyService.api(`/me/episodes?ids=${ids.join(',')}`, 'DELETE');
  },

  checkEpisodesSaved: async (ids: string[]) => {
    return await spotifyService.api(`/me/episodes/contains?ids=${ids.join(',')}`);
  },

  getSavedShows: async (limit = 20, offset = 0) => {
    return await spotifyService.api(`/me/shows?limit=${limit}&offset=${offset}`);
  },

  saveShows: async (ids: string[]) => {
    return await spotifyService.api(`/me/shows`, 'PUT', { ids });
  },

  removeShows: async (ids: string[]) => {
    return await spotifyService.api(`/me/shows?ids=${ids.join(',')}`, 'DELETE');
  },

  checkShowsSaved: async (ids: string[]) => {
    return await spotifyService.api(`/me/shows/contains?ids=${ids.join(',')}`);
  },

  getSavedTracks: async (limit = 20, offset = 0) => {
    return await spotifyService.api(`/me/tracks?limit=${limit}&offset=${offset}`);
  },

  saveTracks: async (ids: string[]) => {
    return await spotifyService.api(`/me/tracks`, 'PUT', { ids });
  },

  removeTracks: async (ids: string[]) => {
    return await spotifyService.api(`/me/tracks?ids=${ids.join(',')}`, 'DELETE');
  },

  checkTracksSaved: async (ids: string[]) => {
    return await spotifyService.api(`/me/tracks/contains?ids=${ids.join(',')}`);
  },

  getTrack: async (id: string) => {
    return await spotifyService.api(`/tracks/${id}`);
  },

  getTracks: async (ids: string[]) => {
    return await spotifyService.api(`/tracks?ids=${ids.join(',')}`);
  },

  getAudioFeatures: async (id: string) => {
    return await spotifyService.api(`/audio-features/${id}`);
  },

  getAudioFeaturesForTracks: async (ids: string[]) => {
    return await spotifyService.api(`/audio-features?ids=${ids.join(',')}`);
  },

  getAudioAnalysis: async (id: string) => {
    return await spotifyService.api(`/audio-analysis/${id}`);
  },

  followPlaylist: async (id: string, publicPlaylist = false) => {
    return await spotifyService.api(`/playlists/${id}/followers`, 'PUT', { public: publicPlaylist });
  },

  unfollowPlaylist: async (id: string) => {
    return await spotifyService.api(`/playlists/${id}/followers`, 'DELETE');
  },

  getFollowedArtists: async (type: 'artist' = 'artist', limit = 20, after?: string) => {
    const query = [`type=${type}`, `limit=${limit}`];
    if (after) query.push(`after=${after}`);
    return await spotifyService.api(`/me/following?${query.join('&')}`);
  },

  followArtistsOrUsers: async (type: 'artist' | 'user', ids: string[]) => {
    return await spotifyService.api(`/me/following?type=${type}`, 'PUT', { ids });
  },

  unfollowArtistsOrUsers: async (type: 'artist' | 'user', ids: string[]) => {
    return await spotifyService.api(`/me/following?type=${type}`, 'DELETE', { ids });
  },

  checkFollowing: async (type: 'artist' | 'user', ids: string[]) => {
    return await spotifyService.api(`/me/following/contains?type=${type}&ids=${ids.join(',')}`);
  },

  checkPlaylistFollowers: async (playlistId: string, userIds: string[]) => {
    return await spotifyService.api(`/playlists/${playlistId}/followers/contains?ids=${userIds.join(',')}`);
  },
};
