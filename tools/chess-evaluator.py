import chess
import chess.pgn
import chess.engine
import sys
import os

# --- CONFIGURATION ---
# 1. Path to your Stockfish engine (UPDATE THIS!)
# Windows Example: r"C:\Users\Tony\Downloads\stockfish\stockfish-windows-x86-64-avx2.exe"
# Mac/Linux Example: "/usr/local/bin/stockfish"
ENGINE_PATH = r"Path_To_Your_Stockfish_Executable_Here"

# 2. File Names
INPUT_PGN = "games.pgn"
OUTPUT_PGN = "analyzed_games.pgn"

# 3. Analysis Settings
TIME_PER_MOVE = 0.1  # Seconds per move. Higher = better analysis but slower script.
DEPTH_LIMIT = 18     # Optional: Depth limit (e.g., 20). Set to None to use time only.

def get_eval_comment(score_cp):
    """Convert centipawn score to annotation symbols."""
    # Perspective is always from the side to move, but swings are absolute logic
    # We need previous score to calculate swings, simpler logic is just raw threshold here
    # For a truly robust annotator, we'd compare current eval vs previous eval.
    return "" 

def analyze_pgn():
    # Check if engine exists
    if not os.path.exists(ENGINE_PATH) and "stockfish" not in ENGINE_PATH.lower():
        print(f"Error: Engine not found at {ENGINE_PATH}")
        return

    print(f"Starting Stockfish from: {ENGINE_PATH}")
    
    try:
        transport, engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)
    except Exception as e:
        print(f"Could not start engine: {e}")
        return

    game_count = 0
    
    with open(INPUT_PGN) as pgn_in:
        with open(OUTPUT_PGN, "w") as pgn_out:
            
            while True:
                # Read game
                game = chess.pgn.read_game(pgn_in)
                if game is None:
                    break
                
                game_count += 1
                headers = game.headers
                white = headers.get("White", "?")
                black = headers.get("Black", "?")
                print(f"Analyzing Game {game_count}: {white} vs {black}...")

                board = game.board()
                node = game
                
                # Track previous score to detect blunders
                prev_score = None 

                while not node.is_end():
                    next_node = node.variation(0)
                    move = next_node.move
                    board.push(move)
                    
                    # ANALYZE POSITION
                    limit = chess.engine.Limit(time=TIME_PER_MOVE, depth=DEPTH_LIMIT)
                    info = engine.analyse(board, limit)
                    
                    # Get Score
                    score_obj = info["score"].white() # Always view from White's perspective for consistency
                    
                    # 1. Add Evaluation Comment [%eval ...]
                    # Mate scores need special handling like #3
                    if score_obj.is_mate():
                        eval_str = f"#{score_obj.mate()}"
                        score_val = 9999 if score_obj.mate() > 0 else -9999
                    else:
                        # Standard centipawn
                        eval_str = f"{score_obj.score() / 100:.2f}"
                        score_val = score_obj.score()

                    # Add standard PGN eval tag
                    # Note: We append to existing comments if any
                    existing_comment = next_node.comment
                    eval_tag = f"[%eval {eval_str}]"
                    
                    # 2. Add Text Annotations (Blunder Check)
                    annotation = ""
                    if prev_score is not None and not score_obj.is_mate():
                        # Calculate swing. Note: We must account for whose turn it was.
                        # If it was White's turn, a drop in White score is bad.
                        # If it was Black's turn, a rise in White score is bad for Black.
                        
                        diff = 0
                        if board.turn == chess.BLACK: # White just moved
                            diff = prev_score - score_val
                        else: # Black just moved
                            diff = score_val - prev_score
                            
                        # Thresholds (in centipawns)
                        if diff > 300: annotation = "??"  # Blunder
                        elif diff > 150: annotation = "?" # Mistake
                        elif diff > 70: annotation = "?!" # Inaccuracy
                        elif diff < -100 and abs(score_val) < 200: annotation = "!" # Good move in balanced position

                    # Construct final comment
                    if annotation:
                        next_node.nags.add(chess.pgn.NAG_MISTAKE if annotation == "?" else 
                                         chess.pgn.NAG_BLUNDER if annotation == "??" else 0)
                        # Some viewers prefer text comments for symbols
                        full_comment = f"{annotation} {eval_tag}"
                    else:
                        full_comment = f"{eval_tag}"

                    # Append to existing comment or set new
                    if existing_comment:
                        next_node.comment = f"{existing_comment} {full_comment}"
                    else:
                        next_node.comment = full_comment

                    # Update tracking
                    prev_score = score_val
                    node = next_node

                # Write analyzed game to file
                print(game, file=pgn_out, end="\n\n")

    engine.quit()
    print(f"\nDone! Analyzed {game_count} games. Saved to {OUTPUT_PGN}")

if __name__ == "__main__":
    analyze_pgn()
