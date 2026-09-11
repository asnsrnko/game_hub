import random
from typing import List, Tuple, Optional

class SudokuGenerator:
    def __init__(self):
        self.board = [[0 for _ in range(9)] for _ in range(9)]
    
    def is_valid(self, board: List[List[int]], num: int, pos: Tuple[int, int]) -> bool:
        """Проверяет, можно ли поставить число num в позицию pos"""
        row, col = pos
        
        # Проверяем строку
        for i in range(9):
            if board[row][i] == num and i != col:
                return False
        
        # Проверяем столбец
        for i in range(9):
            if board[i][col] == num and i != row:
                return False
        
        # Проверяем квадрат 3x3
        box_row, box_col = row // 3 * 3, col // 3 * 3
        for i in range(box_row, box_row + 3):
            for j in range(box_col, box_col + 3):
                if board[i][j] == num and (i, j) != pos:
                    return False
        
        return True
    
    def solve(self, board: List[List[int]]) -> bool:
        """Решает судоку используя backtracking"""
        # Находим пустую клетку
        for i in range(9):
            for j in range(9):
                if board[i][j] == 0:
                    row, col = i, j
                    
                    # Пробуем все числа от 1 до 9
                    for num in range(1, 10):
                        if self.is_valid(board, num, (row, col)):
                            board[row][col] = num
                            
                            if self.solve(board):
                                return True
                            
                            board[row][col] = 0
                    
                    return False
        
        return True
    
    def generate_full_board(self) -> List[List[int]]:
        """Генерирует полностью заполненную доску"""
        # Начинаем с пустой доски
        self.board = [[0 for _ in range(9)] for _ in range(9)]
        
        # Заполняем диагональные квадраты 3x3
        for i in range(0, 9, 3):
            nums = list(range(1, 10))
            random.shuffle(nums)
            for row in range(3):
                for col in range(3):
                    self.board[i + row][i + col] = nums[row * 3 + col]
        
        # Заполняем остальное
        self.solve(self.board)
        return self.board
    
    def count_solutions(self, board: List[List[int]], count: int = 0) -> int:
        """Подсчитывает количество решений (останавливается на 2)"""
        for i in range(9):
            for j in range(9):
                if board[i][j] == 0:
                    for num in range(1, 10):
                        if self.is_valid(board, num, (i, j)):
                            board[i][j] = num
                            count = self.count_solutions(board, count)
                            if count >= 2:
                                return count
                            board[i][j] = 0
                    return count
        
        return count + 1
    
    def create_puzzle(self, difficulty: str = "easy") -> Tuple[List[List[int]], List[List[int]]]:
        """
        Создает головоломку указанной сложности.
        Возвращает (головоломка, решение)
        """
        # Генерируем полную доску
        solution = self.generate_full_board()
        puzzle = [row[:] for row in solution]
        
        # Определяем количество клеток для удаления
        cells_to_remove = {
            "easy": 40,
            "medium": 50,
            "hard": 55
        }.get(difficulty, 40)
        
        # Удаляем клетки
        positions = [(i, j) for i in range(9) for j in range(9)]
        random.shuffle(positions)
        
        removed = 0
        for row, col in positions:
            if removed >= cells_to_remove:
                break
            
            backup = puzzle[row][col]
            puzzle[row][col] = 0
            
            # Проверяем, что решение осталось единственным
            test_board = [r[:] for r in puzzle]
            if self.count_solutions(test_board) == 1:
                removed += 1
            else:
                puzzle[row][col] = backup
        
        return puzzle, solution
    
    def check_board(self, board: List[List[int]]) -> List[Tuple[int, int]]:
        """Проверяет доску на ошибки"""
        errors = []
        for i in range(9):
            for j in range(9):
                if board[i][j] != 0:
                    temp = board[i][j]
                    board[i][j] = 0
                    if not self.is_valid(board, temp, (i, j)):
                        errors.append((i, j))
                    board[i][j] = temp
        return errors