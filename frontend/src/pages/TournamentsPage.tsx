import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentList } from '../hooks/useTournament';

const TournamentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'upcoming' | 'active' | 'finished'>('upcoming');
  const { tournaments, loading, error } = useTournamentList({ status: filter });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeControlLabel = (timeControl: string) => {
    const labels: Record<string, string> = {
      bullet: '⚡ Пуля',
      blitz: '⚔️ Блиц',
      rapid: '🎯 Рапид',
      classical: '♟️ Классика',
    };
    return labels[timeControl] || timeControl;
  };

  const getTournamentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      arena: '🏟️ Арена',
      swiss: '🇨🇭 Швейцарка',
      knockout: '🏆 Плей-офф',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка турниров...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" style={{ paddingTop: 'max(env(safe-area-inset-top), 60px)' }}>
      {/* Header */}
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">🏆 Турниры</h1>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300'
            }`}
          >
            Предстоящие
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300'
            }`}
          >
            В процессе
          </button>
          <button
            onClick={() => setFilter('finished')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === 'finished'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-800 text-gray-300'
            }`}
          >
            Завершённые
          </button>
        </div>

        {/* Tournament List */}
        {tournaments.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-lg">
              {filter === 'upcoming'
                ? 'Нет предстоящих турниров'
                : filter === 'active'
                ? 'Нет активных турниров'
                : 'Нет завершённых турниров'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
                className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold">{tournament.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {tournament.description}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      tournament.status === 'upcoming'
                        ? 'bg-blue-600'
                        : tournament.status === 'active'
                        ? 'bg-green-600'
                        : 'bg-gray-600'
                    }`}
                  >
                    {tournament.status === 'upcoming'
                      ? 'Скоро'
                      : tournament.status === 'active'
                      ? 'Идёт'
                      : 'Закончен'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 mt-3 text-sm">
                  <span className="bg-gray-700 px-3 py-1 rounded">
                    {getTournamentTypeLabel(tournament.type)}
                  </span>
                  <span className="bg-gray-700 px-3 py-1 rounded">
                    {getTimeControlLabel(tournament.time_control)}
                  </span>
                  <span className="bg-gray-700 px-3 py-1 rounded">
                    {tournament.time_limit / 60}+{tournament.time_increment}
                  </span>
                  {tournament.type === 'swiss' && tournament.rounds && (
                    <span className="bg-gray-700 px-3 py-1 rounded">
                      {tournament.rounds} раундов
                    </span>
                  )}
                  {tournament.type === 'arena' && tournament.duration && (
                    <span className="bg-gray-700 px-3 py-1 rounded">
                      {tournament.duration} мин
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
                  <span>📅 {formatDate(tournament.start_time)}</span>
                  {tournament.max_players && (
                    <span>👥 Макс: {tournament.max_players}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Tournament Button */}
        <button
          onClick={() => navigate('/tournaments/create')}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg text-2xl"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default TournamentsPage;
