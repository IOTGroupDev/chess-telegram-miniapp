import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePuzzle } from '../hooks/usePuzzle';

const PuzzleStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { statistics, loading, fetchStatistics } = usePuzzle();

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-white text-xl">Loading statistics...</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-white text-xl">No statistics available</div>
      </div>
    );
  }

  const winRate = statistics.total_attempts > 0
    ? Math.round((statistics.total_solved / statistics.total_attempts) * 100)
    : 0;

  return (
    <div className="min-h-screen text-white p-4" style={{ backgroundColor: '#1e293b' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button onClick={() => navigate('/main')} className="text-blue-400 mb-4">
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-6">🧩 Puzzle Statistics</h1>

        {/* Rating Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-6">
          <div className="text-gray-200 text-sm mb-1">Puzzle Rating</div>
          <div className="text-5xl font-bold mb-2">{statistics.average_rating}</div>
          <div className="text-gray-200">
            Keep solving puzzles to improve your rating!
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Total Solved</div>
            <div className="text-3xl font-bold text-green-400">
              {statistics.total_solved}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Accuracy</div>
            <div className="text-3xl font-bold text-blue-400">
              {statistics.accuracy}%
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Current Streak</div>
            <div className="text-3xl font-bold text-orange-400">
              {statistics.current_streak}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Best Streak</div>
            <div className="text-3xl font-bold text-purple-400">
              {statistics.best_streak}
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📊 Overall Progress</h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Win Rate</span>
                <span>{winRate}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${winRate}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-700">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {statistics.total_solved}
                </div>
                <div className="text-gray-400 text-xs">Solved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {statistics.total_failed}
                </div>
                <div className="text-gray-400 text-xs">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {statistics.total_attempts}
                </div>
                <div className="text-gray-400 text-xs">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Themes Mastered */}
        {Object.keys(statistics.themes_mastered).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">🎯 Themes Mastered</h2>

            <div className="space-y-2">
              {Object.entries(statistics.themes_mastered)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([theme, count]) => (
                  <div
                    key={theme}
                    className="flex justify-between items-center p-3 bg-gray-700 rounded-lg"
                  >
                    <span className="capitalize">{theme.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-bold text-blue-400">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => navigate('/puzzles')}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg"
        >
          Solve More Puzzles →
        </button>
      </div>
    </div>
  );
};

export default PuzzleStatsPage;
