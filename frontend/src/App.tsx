import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { StartPage } from './pages/StartPage';
import { MainMenu } from './pages/MainMenu';
import { AIGamePage } from './pages/AIGamePage';
import { AITrainingPage } from './pages/AITrainingPage';
import { OnlineGamePage } from './pages/OnlineGamePage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { ChallengesPage } from './pages/ChallengesPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailsPage from './pages/TournamentDetailsPage';
import PuzzlePage from './pages/PuzzlePage';
import PuzzleStatsPage from './pages/PuzzleStatsPage';

import { wakeLockService } from './services/wakeLockService';
import {useEffect} from 'react';


function AppRoutes() {
  // Theme is initialized in main.tsx via telegramThemeService
  const location = useLocation();
  useEffect(() => {
    const pathsThatNeedWakeLock = [
      '/main',
      '/ai-game',
      '/ai-training',
      '/online-game',
    ];

    const shouldKeepAwake = pathsThatNeedWakeLock.some((path) =>
      location.pathname.startsWith(path),
    );

    console.log('[WakeLock][App] route:', location.pathname, '→ keepAwake:', shouldKeepAwake);

    if (shouldKeepAwake) {
      wakeLockService.acquire();
    } else {
      wakeLockService.release();
    }

  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/main" element={<MainMenu />} />
      <Route path="/ai-game" element={<AIGamePage />} />
      <Route path="/ai-training" element={<AITrainingPage />} />
      <Route path="/online-game/:gameId" element={<OnlineGamePage />} />
      <Route path="/join/:inviteCode" element={<OnlineGamePage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/challenges" element={<ChallengesPage />} />
      <Route path="/tournaments" element={<TournamentsPage />} />
      <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
      <Route path="/puzzles" element={<PuzzlePage />} />
      <Route path="/puzzles/stats" element={<PuzzleStatsPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <div className="App min-h-[100dvh] w-full flex flex-col">
        <AppRoutes />
      </div>
    </Router>
)
}
