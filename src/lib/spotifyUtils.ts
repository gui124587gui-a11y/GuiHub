export interface SpotifyArtistLike {
  id?: string;
  name?: string;
}

export interface SpotifyTrackLike {
  id?: string;
  artists?: SpotifyArtistLike[];
}

export function buildRecommendationSeed(currentTrack?: SpotifyTrackLike) {
  if (currentTrack?.id) {
    return { seed_tracks: [currentTrack.id] };
  }

  const artistIds = currentTrack?.artists?.map((artist) => artist.id).filter(Boolean) as string[];
  if (artistIds.length > 0) {
    return { seed_artists: artistIds.slice(0, 3) };
  }

  return {};
}

export function getArtistsLabel(artists?: SpotifyArtistLike[]) {
  return artists?.map((artist) => artist.name).filter(Boolean).join(', ') || 'Artista desconhecido';
}
