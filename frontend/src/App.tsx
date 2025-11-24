import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StartPage } from './pages/StartPage';
import { MainMenu } from './pages/MainMenu';
import { AIGamePage } from './pages/AIGamePage';
import { OnlineGamePage } from './pages/OnlineGamePage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailsPage from './pages/TournamentDetailsPage';
import PuzzlePage from './pages/PuzzlePage';
import PuzzleStatsPage from './pages/PuzzleStatsPage';
import { telegramService } from './services/telegramService';

function App() {
  useEffect(() => {
    // Initialize Telegram WebApp theme
    const webApp = telegramService.getWebApp();
    if (webApp) {
      // Set up theme colors
      const themeParams = webApp.themeParams;
      if (themeParams.bg_color) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
      }
      if (themeParams.text_color) {
        document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color);
      }
      if (themeParams.hint_color) {
        document.documentElement.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
      }
      if (themeParams.link_color) {
        document.documentElement.style.setProperty('--tg-theme-link-color', themeParams.link_color);
      }
      if (themeParams.button_color) {
        document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color);
      }
      if (themeParams.button_text_color) {
        document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
      }
      if (themeParams.secondary_bg_color) {
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
      }

      // Set up back button
      webApp.BackButton?.onClick(() => {
        window.history.back();
      });
    }
  }, []);

  return (
    <Router>
      <div className="App" style={{ paddingTop: '60px' }}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/main" element={<MainMenu />} />
          <Route path="/ai-game" element={<AIGamePage />} />
          <Route path="/online-game/:gameId" element={<OnlineGamePage />} />
          <Route path="/join/:inviteCode" element={<OnlineGamePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
          <Route path="/puzzles" element={<PuzzlePage />} />
          <Route path="/puzzles/stats" element={<PuzzleStatsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;