import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor, Edit3 } from 'lucide-react';
import {
  getGame,
  createTeam,
  updateTeam,
  deleteTeam,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  resetGame,
} from '../api';
import type { Game, Question } from '../api';
import './GameSetup.css';

export default function GameSetup() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    correct_answer: 'A',
    choices: ['A', 'B'],
  });

  useEffect(() => {
    loadGame();
  }, [gameId]);

  const loadGame = async () => {
    if (!gameId) return;
    try {
      const response = await getGame(parseInt(gameId));
      setGame(response.data);
    } catch (error) {
      console.error('Failed to load game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!gameId || !newTeamName.trim()) return;
    try {
      await createTeam(parseInt(gameId), newTeamName);
      setNewTeamName('');
      loadGame();
    } catch (error) {
      console.error('Failed to add team:', error);
    }
  };

  const handleUpdateTeam = async (teamId: number) => {
    if (!editTeamName.trim()) return;
    try {
      await updateTeam(teamId, { name: editTeamName });
      setEditingTeam(null);
      loadGame();
    } catch (error) {
      console.error('Failed to update team:', error);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('このチームを削除しますか？')) return;
    try {
      await deleteTeam(teamId);
      loadGame();
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const handleAddQuestion = async () => {
    if (!gameId || !newQuestion.title.trim()) return;
    try {
      await createQuestion(parseInt(gameId), newQuestion);
      setNewQuestion({ title: '', correct_answer: 'A', choices: ['A', 'B'] });
      loadGame();
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  };

  const handleUpdateQuestion = async (questionId: number, data: Partial<Question>) => {
    try {
      await updateQuestion(questionId, data);
      loadGame();
    } catch (error) {
      console.error('Failed to update question:', error);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('この問題を削除しますか？')) return;
    try {
      await deleteQuestion(questionId);
      loadGame();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const handleResetGame = async () => {
    if (!gameId) return;
    if (!confirm('全チームのランクをリセットしますか？')) return;
    try {
      await resetGame(parseInt(gameId));
      loadGame();
    } catch (error) {
      console.error('Failed to reset game:', error);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading">読み込み中...</div></div>;
  }

  if (!game) {
    return <div className="page-container"><div className="loading">ゲームが見つかりません</div></div>;
  }

  return (
    <div className="page-container setup-page">
      <div className="setup-header">
        <button className="btn btn-dark btn-with-icon" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          戻る
        </button>
        <h1 className="title-jp">{game.name} - 設定</h1>
        <div className="header-actions">
          <button className="btn btn-primary-action" onClick={() => window.open(`/game/${gameId}/board`, '_blank')}>
            <Monitor size={18} />
            ランキング表示
          </button>
          <button className="btn btn-primary-action" onClick={() => navigate(`/game/${gameId}/play`)}>
            <Edit3 size={18} />
            回答記入
          </button>
        </div>
      </div>

      <div className="setup-content">
        {/* チーム管理 */}
        <section className="setup-section gold-frame">
          <div className="gold-frame-inner section-inner">
            <h2>チーム管理</h2>
            
            <div className="add-form">
              <input
                type="text"
                placeholder="チーム名を入力"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
              />
              <button className="btn btn-gold" onClick={handleAddTeam}>
                追加
              </button>
            </div>

            <div className="team-list">
              {game.teams
                .slice()
                .sort((a, b) => a.id - b.id)
                .map((team, index) => (
                <div key={team.id} className="team-item">
                  <span className="team-number">{index + 1}</span>
                  {editingTeam === team.id ? (
                    <input
                      type="text"
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateTeam(team.id)}
                      autoFocus
                    />
                  ) : (
                    <span className="team-name">{team.name}</span>
                  )}
                  <div className="team-actions">
                    {editingTeam === team.id ? (
                      <>
                        <button className="btn btn-gold btn-sm" onClick={() => handleUpdateTeam(team.id)}>
                          保存
                        </button>
                        <button className="btn btn-dark btn-sm" onClick={() => setEditingTeam(null)}>
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-dark btn-sm"
                          onClick={() => {
                            setEditingTeam(team.id);
                            setEditTeamName(team.name);
                          }}
                        >
                          編集
                        </button>
                        <button className="btn btn-red btn-sm" onClick={() => handleDeleteTeam(team.id)}>
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {game.teams.length === 0 && (
                <p className="empty-message">チームがありません</p>
              )}
            </div>

            {game.teams.length > 0 && (
              <button className="btn btn-red reset-btn" onClick={handleResetGame}>
                全チームのランクをリセット
              </button>
            )}
          </div>
        </section>

        {/* 問題管理 */}
        <section className="setup-section gold-frame">
          <div className="gold-frame-inner section-inner">
            <h2>問題管理 ({game.questions.length}/6)</h2>

            {game.questions.length < 6 && (
              <div className="add-question-form">
                <input
                  type="text"
                  placeholder="問題タイトル"
                  value={newQuestion.title}
                  onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                />
                <div className="choice-row">
                  <label>選択肢:</label>
                  <input
                    type="text"
                    placeholder="A,B,C..."
                    value={newQuestion.choices.join(',')}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        choices: e.target.value.split(',').map((c) => c.trim()),
                      })
                    }
                  />
                </div>
                <div className="choice-row">
                  <label>正解:</label>
                  <select
                    value={newQuestion.correct_answer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                  >
                    {newQuestion.choices.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-gold" onClick={handleAddQuestion}>
                  問題を追加
                </button>
              </div>
            )}

            <div className="question-list">
              {game.questions.map((question) => (
                <div key={question.id} className="question-item">
                  <div className="question-header">
                    <span className="question-number">第{question.question_number}問</span>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      削除
                    </button>
                  </div>
                  <input
                    type="text"
                    value={question.title}
                    onChange={(e) => handleUpdateQuestion(question.id, { title: e.target.value })}
                    placeholder="問題タイトル"
                  />
                  <div className="question-details">
                    <div className="choice-row">
                      <label>選択肢:</label>
                      <input
                        type="text"
                        value={question.choices.join(',')}
                        onChange={(e) =>
                          handleUpdateQuestion(question.id, {
                            choices: e.target.value.split(',').map((c) => c.trim()),
                          })
                        }
                      />
                    </div>
                    <div className="choice-row">
                      <label>正解:</label>
                      <select
                        value={question.correct_answer}
                        onChange={(e) =>
                          handleUpdateQuestion(question.id, { correct_answer: e.target.value })
                        }
                      >
                        {question.choices.map((choice) => (
                          <option key={choice} value={choice}>
                            {choice}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {game.questions.length === 0 && (
                <p className="empty-message">問題がありません</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}