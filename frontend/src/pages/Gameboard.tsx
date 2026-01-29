import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getGame } from '../api';
import type { Game } from '../api';
import './GameBoard.css';

const RANKS_CONFIG = [
  { id: 0, name: '一流芸能人', color: '#C9A227', bgColor: '#1a1a1a', textColor: '#C9A227' },
  { id: 1, name: '普通芸能人', color: '#333333', bgColor: '#ffffff', textColor: '#333333' },
  { id: 2, name: '二流芸能人', color: '#ffffff', bgColor: '#0088cc', textColor: '#ffffff' },
  { id: 3, name: '三流芸能人', color: '#ffffff', bgColor: '#ff6600', textColor: '#ffffff' },
  { id: 4, name: 'そっくりさん', color: '#333333', bgColor: '#ffcc00', textColor: '#333333' },
  { id: 5, name: '映す価値なし', color: '#ffffff', bgColor: '#1a1a1a', textColor: '#ffffff' },
];

const ROW_HEIGHT = 70;

export default function GameBoard() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevTeamRanks, setPrevTeamRanks] = useState<Record<number, number>>({});
  const [animatingTeams, setAnimatingTeams] = useState<Set<number>>(new Set());

  const loadGame = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await getGame(parseInt(gameId));
      const newGame = response.data;
      
      // 前回のランクと比較してアニメーション対象を決定
      if (game) {
        const newAnimating = new Set<number>();
        newGame.teams.forEach((team: any) => {
          const prevRank = prevTeamRanks[team.id];
          if (prevRank !== undefined && prevRank < team.rank) {
            newAnimating.add(team.id);
          }
        });
        if (newAnimating.size > 0) {
          setAnimatingTeams(newAnimating);
          setTimeout(() => setAnimatingTeams(new Set()), 2000);
        }
      }
      
      // 現在のランクを保存
      const rankMap: Record<number, number> = {};
      newGame.teams.forEach((team: any) => {
        rankMap[team.id] = team.rank;
      });
      setPrevTeamRanks(rankMap);
      
      setGame(newGame);
    } catch (error) {
      console.error('Failed to load game:', error);
    } finally {
      setLoading(false);
    }
  }, [gameId, game, prevTeamRanks]);

  useEffect(() => {
    loadGame();
    // 5秒ごとに自動更新
    const interval = setInterval(loadGame, 5000);
    return () => clearInterval(interval);
  }, []);

  // gameIdが変わったときのみ即座にロード
  useEffect(() => {
    setLoading(true);
    loadGame();
  }, [gameId]);

  if (loading && !game) {
    return (
      <div className="page-container board-page">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page-container board-page">
        <div className="loading">ゲームが見つかりません</div>
      </div>
    );
  }

  const maxRows = Math.max(10, game.teams.length);

  return (
    <div className="page-container board-page">
      <div className="board-header">
        <button className="btn btn-dark" onClick={() => navigate(`/game/${gameId}/setup`)}>
          ← 設定
        </button>
        <h1 className="title-jp board-title">{game.name}</h1>
        <button className="btn btn-gold" onClick={() => navigate(`/game/${gameId}/play`)}>
          プレイ画面
        </button>
      </div>

      <div className="board-container gold-frame">
        <div className="gold-frame-inner board-inner">
          {/* ヘッダー行 */}
          <div className="board-header-row">
            {RANKS_CONFIG.map((rank) => (
              <div
                key={rank.id}
                className="rank-header"
                style={{
                  backgroundColor: rank.bgColor,
                  color: rank.textColor,
                }}
              >
                <span className="rank-name">{rank.name}</span>
              </div>
            ))}
          </div>

          {/* グリッド本体 */}
          <div className="board-grid" style={{ height: maxRows * ROW_HEIGHT }}>
            {/* グリッド線 */}
            {Array.from({ length: maxRows }).map((_, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid-row">
                {RANKS_CONFIG.map((rank) => (
                  <div key={`cell-${rowIndex}-${rank.id}`} className="grid-cell" />
                ))}
              </div>
            ))}

            {/* チーム表示 */}
            <AnimatePresence>
              {game.teams
                .slice() // 元の配列を変更しないようにコピー
                .sort((a, b) => a.id - b.id) // IDで常に同じ順番にソート
                .map((team, index) => {
                const isAnimating = animatingTeams.has(team.id);
                const xPosition = team.rank * (100 / 6);
                // IDでソートした順番で行位置を固定
                const yPosition = index * ROW_HEIGHT + 12;

                return (
                  <motion.div
                    key={team.id}
                    className={`team-badge ${isAnimating ? 'animating' : ''}`}
                    initial={false}
                    animate={{
                      left: `calc(${xPosition}% + 8px)`,
                      top: yPosition,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 50,
                      damping: 15,
                      duration: isAnimating ? 2 : 0.5,
                    }}
                  >
                    {team.name}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="board-legend">
        <p>※ 5秒ごとに自動更新されます</p>
        <button className="btn btn-gold" onClick={loadGame}>
          手動更新
        </button>
      </div>
    </div>
  );
}