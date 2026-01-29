import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import GameSetup from './pages/GameSetup';
import GameBoard from './pages/GameBoard';
import QuestionPlay from './pages/QuestionPlay';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId/setup" element={<GameSetup />} />
        <Route path="/game/:gameId/board" element={<GameBoard />} />
        <Route path="/game/:gameId/play" element={<QuestionPlay />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;