import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getGame,
  getAnswers,
  submitAnswer,
  judgeAnswers,
} from '../api';
import type { Game, JudgeResult } from '../api';
import './QuestionPlay.css';

const RANKS_CONFIG = [
  { id: 0, name: '一流芸能人' },
  { id: 1, name: '普通芸能人' },
  { id: 2, name: '二流芸能人' },
  { id: 3, name: '三流芸能人' },
  { id: 4, name: 'そっくりさん' },
  { id: 5, name: '映す価値なし' },
];

export default function QuestionPlay() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [teamAnswers, setTeamAnswers] = useState<Record<number, string>>({});
  const [judgeResults, setJudgeResults] = useState<JudgeResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [judging, setJudging] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadGame();
  }, [gameId]);

  useEffect(() => {
    if (game && game.questions[currentQuestionIndex]) {
      loadAnswers(game.questions[currentQuestionIndex].id);
    }
  }, [game, currentQuestionIndex]);

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

  const loadAnswers = async (questionId: number) => {
    try {
      const response = await getAnswers(questionId);
      // 保存済み回答をフォームに反映
      const answerMap: Record<number, string> = {};
      response.data.forEach((a) => {
        answerMap[a.team_id] = a.answer;
      });
      setTeamAnswers(answerMap);
    } catch (error) {
      console.error('Failed to load answers:', error);
    }
  };

  const handleAnswerChange = async (teamId: number, answer: string) => {
    setTeamAnswers((prev) => ({ ...prev, [teamId]: answer }));
    
    if (!game) return;
    const question = game.questions[currentQuestionIndex];
    if (!question) return;
    
    try {
      await submitAnswer(question.id, teamId, answer);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handleJudge = async () => {
    if (!game) return;
    const question = game.questions[currentQuestionIndex];
    if (!question) return;

    setJudging(true);
    try {
      const response = await judgeAnswers(question.id);
      setJudgeResults(response.data);
      setShowResults(true);
      // ゲーム情報を再読み込み（ランク更新のため）
      await loadGame();
    } catch (error) {
      console.error('Failed to judge:', error);
    } finally {
      setJudging(false);
    }
  };

  const handleNextQuestion = () => {
    if (!game) return;
    if (currentQuestionIndex < game.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setJudgeResults(null);
      setShowResults(false);
      setTeamAnswers({});
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setJudgeResults(null);
      setShowResults(false);
      setTeamAnswers({});
    }
  };

  if (loading) {
    return (
      <div className="page-container play-page">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page-container play-page">
        <div className="loading">ゲームが見つかりません</div>
      </div>
    );
  }

  if (game.questions.length === 0) {
    return (
      <div className="page-container play-page">
        <div className="play-header">
          <button className="btn btn-dark" onClick={() => navigate(`/game/${gameId}/setup`)}>
            ← 設定に戻る
          </button>
        </div>
        <div className="no-questions">
          <p>問題が登録されていません</p>
          <button className="btn btn-gold" onClick={() => navigate(`/game/${gameId}/setup`)}>
            問題を追加する
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = game.questions[currentQuestionIndex];

  return (
    <div className="page-container play-page">
      <div className="play-header">
        <button className="btn btn-dark" onClick={() => navigate(`/game/${gameId}/setup`)}>
          ← 設定
        </button>
        <h1 className="title-jp play-title">{game.name}</h1>
        <button className="btn btn-gold" onClick={() => navigate(`/game/${gameId}/board`)}>
          ボード表示
        </button>
      </div>

      <div className="play-content">
        {/* 問題ナビゲーション */}
        <div className="question-nav">
          <button
            className="btn btn-dark"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            ← 前の問題
          </button>
          <span className="question-indicator">
            第{currentQuestion.question_number}問 / 全{game.questions.length}問
          </span>
          <button
            className="btn btn-dark"
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === game.questions.length - 1}
          >
            次の問題 →
          </button>
        </div>

        {/* 問題表示 */}
        <div className="question-display gold-frame">
          <div className="gold-frame-inner question-inner">
            <h2 className="question-title">第{currentQuestion.question_number}問</h2>
            <p className="question-text">{currentQuestion.title || '（問題文未設定）'}</p>
            <div className="question-choices">
              {currentQuestion.choices.map((choice) => (
                <span key={choice} className="choice-badge">
                  {choice}
                </span>
              ))}
            </div>
            <p className="correct-answer">
              正解: <strong>{currentQuestion.correct_answer}</strong>
            </p>
          </div>
        </div>

        {/* 回答入力エリア */}
        <div className="answers-section gold-frame">
          <div className="gold-frame-inner answers-inner">
            <h3>チームの回答</h3>
            <div className="team-answers">
              {game.teams.map((team) => {
                const result = judgeResults?.find((r) => r.team_id === team.id);
                return (
                  <div key={team.id} className="team-answer-row">
                    <div className="team-info">
                      <span className="team-name-label">{team.name}</span>
                      <span className="team-rank-label">
                        {RANKS_CONFIG[team.rank]?.name}
                      </span>
                    </div>
                    <div className="answer-choices">
                      {currentQuestion.choices.map((choice) => (
                        <button
                          key={choice}
                          className={`answer-btn ${
                            teamAnswers[team.id] === choice ? 'selected' : ''
                          } ${
                            showResults && result
                              ? result.answer === choice
                                ? result.is_correct
                                  ? 'correct'
                                  : 'incorrect'
                                : ''
                              : ''
                          }`}
                          onClick={() => handleAnswerChange(team.id, choice)}
                          disabled={showResults}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                    {showResults && result && (
                      <motion.div
                        className={`result-badge ${result.is_correct ? 'correct' : 'incorrect'}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                      >
                        {result.is_correct ? '正解！' : '不正解...'}
                        {result.rank_changed && (
                          <span className="rank-down">ランクダウン！</span>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {!showResults ? (
              <button
                className="btn btn-gold judge-btn"
                onClick={handleJudge}
                disabled={judging || Object.keys(teamAnswers).length === 0}
              >
                {judging ? '判定中...' : '正誤判定'}
              </button>
            ) : (
              <div className="after-judge-actions">
                <button
                  className="btn btn-gold"
                  onClick={() => {
                    setShowResults(false);
                    setJudgeResults(null);
                  }}
                >
                  回答を修正
                </button>
                {currentQuestionIndex < game.questions.length - 1 && (
                  <button className="btn btn-gold" onClick={handleNextQuestion}>
                    次の問題へ →
                  </button>
                )}
                <button
                  className="btn btn-dark"
                  onClick={() => navigate(`/game/${gameId}/board`)}
                >
                  ボードを確認
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}