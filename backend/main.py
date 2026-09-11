from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sudoku_logic import SudokuGenerator

app = FastAPI()

# CORS для React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

generator = SudokuGenerator()

class GenerateRequest(BaseModel):
    difficulty: str = "easy"

class BoardRequest(BaseModel):
    board: List[List[int]]

@app.get("/")
async def root():
    return {"message": "Sudoku API"}

@app.post("/api/sudoku/generate")
async def generate_sudoku(request: GenerateRequest):
    puzzle, solution = generator.create_puzzle(request.difficulty)
    return {
        "puzzle": puzzle,
        "solution": solution,
        "difficulty": request.difficulty
    }

@app.post("/api/sudoku/check")
async def check_sudoku(request: BoardRequest):
    errors = generator.check_board(request.board)
    
    # Проверяем, заполнена ли доска
    is_full = all(cell != 0 for row in request.board for cell in row)
    
    if errors:
        return {
            "valid": False,
            "errors": errors,
            "message": "Есть ошибки"
        }
    elif is_full:
        return {
            "valid": True,
            "message": "Поздравляем! Судоку решено!"
        }
    else:
        return {
            "valid": True,
            "message": "Ошибок нет, продолжайте"
        }