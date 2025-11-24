export interface BoardTheme {
  id: string;
  name: string;
  description: string;
  darkSquare: string;
  lightSquare: string;
  glowColor: string;
  emoji: string;
}

export const boardThemes: BoardTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional chess.com colors',
    darkSquare: '#779952',
    lightSquare: '#edeed1',
    glowColor: 'from-green-600 via-blue-600 to-purple-600',
    emoji: '♟️',
  },
  {
    id: 'wood',
    name: 'Wood',
    description: 'Warm wooden board',
    darkSquare: '#b58863',
    lightSquare: '#f0d9b5',
    glowColor: 'from-amber-600 via-orange-600 to-red-600',
    emoji: '🪵',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blue theme',
    darkSquare: '#5b7c99',
    lightSquare: '#abb8c3',
    glowColor: 'from-blue-600 via-cyan-600 to-teal-600',
    emoji: '🌊',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green theme',
    darkSquare: '#4a7c59',
    lightSquare: '#d4e4bc',
    glowColor: 'from-green-600 via-emerald-600 to-lime-600',
    emoji: '🌲',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and pink',
    darkSquare: '#cc7756',
    lightSquare: '#f7d1ba',
    glowColor: 'from-orange-600 via-pink-600 to-purple-600',
    emoji: '🌅',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark purple theme',
    darkSquare: '#4c3b6d',
    lightSquare: '#9b8cb5',
    glowColor: 'from-purple-600 via-indigo-600 to-blue-600',
    emoji: '🌙',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Bright cyberpunk colors',
    darkSquare: '#8b5cf6',
    lightSquare: '#c4b5fd',
    glowColor: 'from-pink-600 via-purple-600 to-blue-600',
    emoji: '⚡',
  },
  {
    id: 'marble',
    name: 'Marble',
    description: 'Elegant gray and white',
    darkSquare: '#999999',
    lightSquare: '#e8e8e8',
    glowColor: 'from-gray-600 via-slate-600 to-zinc-600',
    emoji: '🗿',
  },
];

export const defaultTheme = boardThemes[0]; // Classic
