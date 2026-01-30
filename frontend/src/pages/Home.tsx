import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Trash2, Monitor, Edit3 } from 'lucide-react';
import { getGames, createGame, deleteGame } from '../api';
import './Home.css';

interface GameSummary {
  id: number;
  name: string;
  created_at: string;
  team_count: number;
  question_count: number;
}

export default function Home() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const response = await getGames();
      setGames(response.data as unknown as GameSummary[]);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async () => {
    if (!newGameName.trim()) return;
    try {
      const response = await createGame(newGameName);
      navigate(`/game/${response.data.id}/setup`);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  const handleDeleteGame = async (id: number) => {
    if (!confirm('このゲームを削除しますか？')) return;
    try {
      await deleteGame(id);
      loadGames();
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  return (
    <div className="page-container home-page">
      <div className="home-content">
        <h1 className="home-title title-jp">
          <span className="title-main">格付けチェック</span>
          <span className="title-sub">〜 一流芸能人への道 〜</span>
        </h1>

        <div className="create-game-section gold-frame">
          <div className="gold-frame-inner create-form">
            <h2>新規ゲーム作成</h2>
            <div className="form-row">
              <input
                type="text"
                placeholder="ゲーム名を入力"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
              />
              <button className="btn btn-gold" onClick={handleCreateGame}>
                作成
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : games.length > 0 ? (
          <div className="games-list">
            <h2>保存されたゲーム</h2>
            {games.map((game) => (
              <div key={game.id} className="game-card gold-frame">
                <div className="gold-frame-inner game-card-inner">
                  <div className="game-info">
                    <h3>{game.name}</h3>
                    <p>チーム: {game.team_count} / 問題: {game.question_count}</p>
                  </div>
                  <div className="game-actions">
                    {/* 本番用メインボタン */}
                    <div className="main-actions">
                      <button
                        className="btn btn-primary-action"
                        onClick={() => navigate(`/game/${game.id}/board`)}
                      >
                        <Monitor size={20} />
                        ランキング表示
                      </button>
                      <button
                        className="btn btn-primary-action"
                        onClick={() => navigate(`/game/${game.id}/play`)}
                      >
                        <Edit3 size={20} />
                        回答記入
                      </button>
                    </div>
                    {/* 管理用アイコンボタン */}
                    <div className="sub-actions">
                      <button
                        className="btn btn-icon"
                        onClick={() => navigate(`/game/${game.id}/setup`)}
                        title="設定"
                      >
                        <Settings size={20} />
                      </button>
                      <button
                        className="btn btn-icon btn-icon-danger"
                        onClick={() => handleDeleteGame(game.id)}
                        title="削除"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-games">まだゲームがありません</p>
        )}
      </div>
    </div>
  );
}