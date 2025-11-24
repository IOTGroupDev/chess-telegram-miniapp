// Sound configuration for chess game
// Using lichess.org open source sounds (OGG format)
// These are publicly available sounds from lichess

export interface SoundConfig {
  move: string;
  capture: string;
  castle: string;
  check: string;
  promote: string;
  gameStart: string;
  gameEnd: string;
  notify: string;
}

// Lichess sound URLs (public domain)
export const soundUrls: SoundConfig = {
  move: 'https://lichess1.org/assets/sound/standard/Move.ogg',
  capture: 'https://lichess1.org/assets/sound/standard/Capture.ogg',
  castle: 'https://lichess1.org/assets/sound/standard/Move.ogg',
  check: 'https://lichess1.org/assets/sound/standard/Move.ogg',
  promote: 'https://lichess1.org/assets/sound/standard/Move.ogg',
  gameStart: 'https://lichess1.org/assets/sound/standard/GenericNotify.ogg',
  gameEnd: 'https://lichess1.org/assets/sound/standard/GenericNotify.ogg',
  notify: 'https://lichess1.org/assets/sound/standard/GenericNotify.ogg',
};

export type SoundType = keyof SoundConfig;

export const soundDescriptions: Record<SoundType, string> = {
  move: 'Normal move',
  capture: 'Piece captured',
  castle: 'Castling',
  check: 'Check',
  promote: 'Pawn promotion',
  gameStart: 'Game started',
  gameEnd: 'Game ended',
  notify: 'Notification',
};
