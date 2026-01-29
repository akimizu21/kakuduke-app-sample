import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Rank {
  id: number;
  name: string;
  color: string;
  bgColor: string;
}

export interface Team {
  id: number;
  name: string;
  rank: number;
  row_position: number;
}

export interface Question {
  id: number;
  question_number: number;
  title: string;
  correct_answer: string;
  choices: string[];
}

export interface Game {
  id: number;
  name: string;
  teams: Team[];
  questions: Question[];
}

export interface Answer {
  id: number;
  team_id: number;
  team_name: string;
  answer: string;
  is_correct: boolean | null;
}

export interface JudgeResult {
  team_id: number;
  team_name: string;
  answer: string;
  is_correct: boolean;
  new_rank: number;
  rank_changed: boolean;
}

// Games
export const getGames = () => api.get<Game[]>('/games');
export const getGame = (id: number) => api.get<Game>(`/games/${id}`);
export const createGame = (name: string) => api.post<Game>('/games', { name });
export const deleteGame = (id: number) => api.delete(`/games/${id}`);
export const resetGame = (id: number) => api.post(`/games/${id}/reset`);

// Teams
export const createTeam = (gameId: number, name: string) => 
  api.post<Team>(`/games/${gameId}/teams`, { name });
export const updateTeam = (teamId: number, data: Partial<Team>) => 
  api.put<Team>(`/teams/${teamId}`, data);
export const deleteTeam = (teamId: number) => 
  api.delete(`/teams/${teamId}`);
export const rankDownTeam = (teamId: number) => 
  api.post<Team>(`/teams/${teamId}/rank-down`);

// Questions
export const createQuestion = (gameId: number, data: Partial<Question>) => 
  api.post<Question>(`/games/${gameId}/questions`, data);
export const updateQuestion = (questionId: number, data: Partial<Question>) => 
  api.put<Question>(`/questions/${questionId}`, data);
export const deleteQuestion = (questionId: number) => 
  api.delete(`/questions/${questionId}`);

// Answers
export const getAnswers = (questionId: number) => 
  api.get<Answer[]>(`/questions/${questionId}/answers`);
export const submitAnswer = (questionId: number, teamId: number, answer: string) => 
  api.post<Answer>(`/questions/${questionId}/answers`, { team_id: teamId, answer });
export const judgeAnswers = (questionId: number) => 
  api.post<JudgeResult[]>(`/questions/${questionId}/judge`);

// Board
export const getBoard = (gameId: number) => api.get(`/games/${gameId}/board`);
export const getRanks = () => api.get<Rank[]>('/ranks');

export default api;