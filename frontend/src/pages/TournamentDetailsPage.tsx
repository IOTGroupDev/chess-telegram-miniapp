import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../hooks/useTournament';

const TournamentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    tournament,
    standings,
    participants,
    isParticipant,
    loading,
    error,
    joinTournament,
    leaveTournament,
  } = useTournament(id);

  const [activeTab, setActiveTab] = useState<'standings' | 'info'>('standings');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-white text-xl">Загрузка турнира...</div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1e293b' }}>
        <div className="text-red-500 text-xl">
          Ошибка: {error || 'Турнир не найден'}
        </div>
      </div>
    );
  }

  const canJoin =
    tournament.status === 'upcoming' &&
    (!tournament.max_players || participants.length < tournament.max_players);

  const canLeave = tournament.status === 'upcoming' && isParticipant;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <div className="bg-gray-800 p-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/tournaments')}
          className="text-blue-400 mb-2"
        >
          ← Назад к турнирам
        </button>
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        {tournament.description && (
          <p className="text-gray-400 mt-1">{tournament.description}</p>
        )}

        {/* Status Badge */}
        <span
          className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
            tournament.status === 'upcoming'
              ? 'bg-blue-600'
              : tournament.status === 'active'
              ? 'bg-green-600'
              : 'bg-gray-600'
          }`}
        >
          {tournament.status === 'upcoming'
            ? 'Предстоящий'
            : tournament.status === 'active'
            ? 'Идёт сейчас'
            : 'Завершён'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 sticky top-[120px] bg-gray-900 z-10">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-3 ${
            activeTab === 'standings'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-400'
          }`}
        >
          Турнирная таблица
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 ${
            activeTab === 'info'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-400'
          }`}
        >
          Информация
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'standings' ? (
          <div>
            <h2 className="text-xl font-bold mb-4">
              🏆 Участники ({standings.length})
            </h2>

            {standings.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">Участников пока нет</p>
              </div>
            ) : (
              <div className="space-y-2">
                {standings.map((standing) => (
                  <div
                    key={standing.user_id}
                    className={`bg-gray-800 rounded-lg p-4 ${
                      standing.rank === 1
                        ? 'border-2 border-yellow-500'
                        : standing.rank === 2
                        ? 'border-2 border-gray-400'
                        : standing.rank === 3
                        ? 'border-2 border-orange-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold w-8">
                          {standing.rank === 1
                            ? '🥇'
                            : standing.rank === 2
                            ? '🥈'
                            : standing.rank === 3
                            ? '🥉'
                            : `${standing.rank}.`}
                        </span>
                        <div>
                          <div className="font-semibold">
                            {standing.username}
                          </div>
                          <div className="text-sm text-gray-400">
                            Рейтинг: {standing.rating}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-400">
                          {standing.score} очков
                        </div>
                        <div className="text-sm text-gray-400">
                          {standing.wins}W {standing.draws}D {standing.losses}L
                        </div>
                      </div>
                    </div>

                    {tournament.type === 'swiss' && standing.buchholz && (
                      <div className="mt-2 text-xs text-gray-500">
                        Buchholz: {standing.buchholz.toFixed(1)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-4">ℹ️ Информация</h2>

            <div className="bg-gray-800 rounded-lg p-4 space-y-4">
              <div>
                <div className="text-gray-400 text-sm">Тип турнира</div>
                <div className="font-semibold">
                  {tournament.type === 'arena'
                    ? '🏟️ Арена'
                    : tournament.type === 'swiss'
                    ? '🇨🇭 Швейцарская система'
                    : '🏆 Плей-офф'}
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">Контроль времени</div>
                <div className="font-semibold">
                  {tournament.time_limit / 60} мин + {tournament.time_increment}{' '}
                  сек
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">Начало</div>
                <div className="font-semibold">
                  {formatDate(tournament.start_time)}
                </div>
              </div>

              {tournament.type === 'arena' && tournament.duration && (
                <div>
                  <div className="text-gray-400 text-sm">Длительность</div>
                  <div className="font-semibold">{tournament.duration} минут</div>
                </div>
              )}

              {tournament.type === 'swiss' && (
                <>
                  <div>
                    <div className="text-gray-400 text-sm">Раундов</div>
                    <div className="font-semibold">{tournament.rounds}</div>
                  </div>
                  {tournament.current_round !== undefined && (
                    <div>
                      <div className="text-gray-400 text-sm">Текущий раунд</div>
                      <div className="font-semibold">
                        {tournament.current_round} / {tournament.rounds}
                      </div>
                    </div>
                  )}
                </>
              )}

              {tournament.min_rating && (
                <div>
                  <div className="text-gray-400 text-sm">Мин. рейтинг</div>
                  <div className="font-semibold">{tournament.min_rating}</div>
                </div>
              )}

              {tournament.max_rating && (
                <div>
                  <div className="text-gray-400 text-sm">Макс. рейтинг</div>
                  <div className="font-semibold">{tournament.max_rating}</div>
                </div>
              )}

              {tournament.max_players && (
                <div>
                  <div className="text-gray-400 text-sm">
                    Максимум участников
                  </div>
                  <div className="font-semibold">
                    {participants.length} / {tournament.max_players}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(canJoin || canLeave) && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4">
          {isParticipant ? (
            <button
              onClick={leaveTournament}
              disabled={!canLeave}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg"
            >
              {canLeave ? 'Покинуть турнир' : 'Нельзя покинуть'}
            </button>
          ) : (
            <button
              onClick={joinTournament}
              disabled={!canJoin}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg"
            >
              {canJoin ? 'Присоединиться' : 'Регистрация закрыта'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentDetailsPage;
