import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

type Difficulty = 'easy' | 'medium' | 'hard';

function App() {
  const [puzzle, setPuzzle] = useState<number[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [userBoard, setUserBoard] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  // Таймер
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const winCountedRef = useRef(false);

  // Счётчик побед
  const [wins, setWins] = useState<number>(() => {
    const savedWins = localStorage.getItem('wins');
    return savedWins ? parseInt(savedWins, 10) : 0;
  });

  const [winsByDifficulty, setWinsByDifficulty] = useState<{easy: number, medium: number, hard: number}>(() => {
    const savedWinsByDifficulty = localStorage.getItem('winsByDifficulty');
    return savedWinsByDifficulty
      ? JSON.parse(savedWinsByDifficulty)
      : { easy: 0, medium: 0, hard: 0 };
  });

  // Загрузка новой игры
  const fetchNewGame = async (diff: Difficulty = difficulty) => {
    setLoading(true);
    setMessage('');
    setSelectedCell(null);
    setIsSolved(false);
    // Блокируем зачёт победы, пока грузится новая партия
    // (иначе старое решённое поле успевает засчитаться ещё раз)
    winCountedRef.current = true;
    setTimer(0);
    setIsRunning(false);
    setPuzzle([]);
    setSolution([]);
    setUserBoard([]);
    try {
      const response = await axios.post(`${API_URL}/api/sudoku/generate`, {
        difficulty: diff
      });
      setPuzzle(response.data.puzzle);
      setSolution(response.data.solution);
      setUserBoard(response.data.puzzle.map((row: number[]) => [...row]));
      winCountedRef.current = false;
      setIsRunning(true);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setMessage('Ошибка загрузки судоку. Убедитесь, что бэкенд запущен.');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при старте
  useEffect(() => {
    fetchNewGame();
  }, []);

  // Сохранение счётчиков побед
  useEffect(() => {
    localStorage.setItem('wins', wins.toString());
    localStorage.setItem('winsByDifficulty', JSON.stringify(winsByDifficulty));
  }, [wins, winsByDifficulty]);
  
  // Логика таймера
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = window.setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const pad = (value: number) => value.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
    }
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
  };

  // Автопобеда + счётчик (один раз за партию)
  useEffect(() => {
    if (loading || userBoard.length === 0 || solution.length === 0) return;

    const isComplete = userBoard.every((row, i) =>
      row.every((cell, j) => cell !== 0 && cell === solution[i][j])
    );

    if (isComplete) {
      setMessage('🎉 Поздравляем! Судоку решено!');
      setIsRunning(false);
      setIsSolved(true);

      if (!winCountedRef.current) {
        winCountedRef.current = true;
        setWins(prev => prev + 1);
        setWinsByDifficulty(prev => ({
          ...prev,
          [difficulty]: prev[difficulty] + 1
        }));
      }
    } else {
      setIsSolved(false);
      setMessage((prev) => (prev.includes('Поздравляем') ? '' : prev));
    }
  }, [userBoard, solution, difficulty, loading]);

  const resetStats = () => {
    setWins(0);
    setWinsByDifficulty({ easy: 0, medium: 0, hard: 0 });
    localStorage.removeItem('wins');
    localStorage.removeItem('winsByDifficulty');
  };

  const handlePauseClick = () => {
    if (isSolved || loading) return;
    setIsRunning(prev => !prev);
  };

  // Обработка клика по клетке
  const handleCellClick = (row: number, col: number) => {
    if (!isRunning || isSolved) return;
    if (puzzle[row]?.[col] === 0) {
      setSelectedCell({ row, col });
    }
  };

  // Ввод цифры кнопкой (для телефона)
  const handleNumberClick = (num: number) => {
    if (!selectedCell || !isRunning || isSolved) return;

    const { row, col } = selectedCell;
    if (puzzle[row]?.[col] !== 0) return;

    const newBoard = userBoard.map(r => [...r]);
    newBoard[row][col] = num;
    setUserBoard(newBoard);
  };

  // Очистка клетки кнопкой
  const handleClearClick = () => {
    if (!selectedCell || !isRunning || isSolved) return;

    const { row, col } = selectedCell;
    if (puzzle[row]?.[col] !== 0) return;

    const newBoard = userBoard.map(r => [...r]);
    newBoard[row][col] = 0;
    setUserBoard(newBoard);
  };

  // Обработка ввода числа с клавиатуры
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell || !isRunning || isSolved) return;
    
    const { row, col } = selectedCell;
    const isOriginal = puzzle[row]?.[col] !== 0;

    // Цифры и очистка — только для пустых клеток головоломки
    if (!isOriginal) {
      if (e.key >= '1' && e.key <= '9') {
        const newBoard = userBoard.map(r => [...r]);
        newBoard[row][col] = parseInt(e.key);
        setUserBoard(newBoard);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const newBoard = userBoard.map(r => [...r]);
        newBoard[row][col] = 0;
        setUserBoard(newBoard);
      }
    }
    
    // Стрелки для навигации
    if (e.key === 'ArrowUp' && row > 0) setSelectedCell({ row: row - 1, col });
    if (e.key === 'ArrowDown' && row < 8) setSelectedCell({ row: row + 1, col });
    if (e.key === 'ArrowLeft' && col > 0) setSelectedCell({ row, col: col - 1 });
    if (e.key === 'ArrowRight' && col < 8) setSelectedCell({ row, col: col + 1 });
  };

  // Изменение сложности
  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff);
    fetchNewGame(diff);
  };

  // Проверка, является ли клетка частью исходной головоломки
  const isOriginalCell = (row: number, col: number) => {
    return puzzle[row]?.[col] !== 0;
  };

  // Проверка, выбрана ли клетка
  const isSelected = (row: number, col: number) => {
    return selectedCell?.row === row && selectedCell?.col === col;
  };

  // Проверка, в том же ли ряду/столбце/квадрате (кроме самой выбранной)
  const isRelated = (row: number, col: number) => {
    if (!selectedCell) return false;
    if (selectedCell.row === row && selectedCell.col === col) return false;
    
    const sameRow = row === selectedCell.row;
    const sameCol = col === selectedCell.col;
    const sameBox = Math.floor(row / 3) === Math.floor(selectedCell.row / 3) && 
                    Math.floor(col / 3) === Math.floor(selectedCell.col / 3);
    
    return sameRow || sameCol || sameBox;
  };

  // Клетка с ошибкой: пользователь ввёл число, которое не совпадает с решением
  const isErrorCell = (row: number, col: number) => {
    const value = userBoard[row]?.[col];
    if (!value || isOriginalCell(row, col)) return false;
    return value !== solution[row]?.[col];
  };

  return (
    <div className="app" onKeyDown={handleKeyDown} tabIndex={0}>
      <h1>Судоку</h1>

      {/* Статистика по победам */}
      <div className="wins-panel">
        <div className="total-wins">
          🏆 Побед: <strong>{wins}</strong>
        </div>
        <div className="wins-by-difficulty">
          <span className="win-badge easy">Легко: {winsByDifficulty.easy}</span>
          <span className="win-badge medium">Средне: {winsByDifficulty.medium}</span>
          <span className="win-badge hard">Сложно: {winsByDifficulty.hard}</span>
        </div>
        {wins > 0 && (
          <button className="reset-stats" onClick={resetStats} title="Сбросить статистику">
            Сбросить
          </button>
        )}
      </div>     
      {/* Выбор сложности */}
      <div className="difficulty-buttons">
        <button 
          className={difficulty === 'easy' ? 'active' : ''} 
          onClick={() => handleDifficultyChange('easy')}
        >
          Легко
        </button>
        <button 
          className={difficulty === 'medium' ? 'active' : ''} 
          onClick={() => handleDifficultyChange('medium')}
        >
          Средне
        </button>
        <button 
          className={difficulty === 'hard' ? 'active' : ''} 
          onClick={() => handleDifficultyChange('hard')}
        >
          Сложно
        </button>
      </div>

      {/* Таймер */}
      {userBoard.length > 0 && (
        <div className="stats">
          <div className="timer">{formatTime(timer)}</div>
          {isSolved && <div className="progress-info">Решено!</div>}
        </div>
      )}

      {/* Сообщение */}
      {message && <div className="message">{message}</div>}

      {/* Сетка судоку */}
      {userBoard.length > 0 && (
        <div className={`sudoku-wrapper${!isRunning && !isSolved && !loading ? ' paused' : ''}`}>
          <div className="sudoku-grid">
            {userBoard.map((row, rowIndex) => (
              <div key={rowIndex} className="sudoku-row">
                {row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      sudoku-cell
                      ${isOriginalCell(rowIndex, colIndex) ? 'original' : ''}
                      ${isSelected(rowIndex, colIndex) ? 'selected' : ''}
                      ${isRelated(rowIndex, colIndex) ? 'related' : ''}
                      ${isErrorCell(rowIndex, colIndex) ? 'error' : ''}
                      ${colIndex % 3 === 2 && colIndex !== 8 ? 'border-right' : ''}
                      ${rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-bottom' : ''}
                    `}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {cell !== 0 ? cell : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {!isRunning && !isSolved && !loading && (
            <div className="pause-overlay">
              <div className="pause-content">
                <div className="pause-icon">⏸</div>
                <div className="pause-text">Пауза</div>
                <div className="pause-hint">Нажмите «Продолжить», чтобы играть дальше</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Панель цифр для телефона */}
      {userBoard.length > 0 && (
        <div className="keypad">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              type="button"
              className="keypad-btn"
              onClick={() => handleNumberClick(num)}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            className="keypad-btn keypad-clear"
            onClick={handleClearClick}
          >
            Очистить
          </button>
        </div>
      )}

      {/* Кнопки управления */}
      <div className="controls">
        <button onClick={() => fetchNewGame()} disabled={loading}>
          {loading ? 'Загрузка...' : 'Новая игра'}
        </button>
        <button 
          onClick={handlePauseClick} 
          disabled={isSolved || loading}
          className={!isRunning && !isSolved ? 'pause-active' : ''}
        >
          {!isRunning && !isSolved ? '▶ Продолжить' : '⏸ Пауза'}
        </button>
      </div>

      {/* Подсказка по управлению */}
      <div className="hint">
        <p>Выберите клетку и введите цифру с клавиатуры или кнопками ниже</p>
        <p>Стрелки — навигация, Delete / «Очистить» — стереть клетку</p>
      </div>
    </div>
  );
}

export default App;