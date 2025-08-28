import React from 'react';
import { GRID_SIZE, PIECE_TYPES, ANIMATION_DELAY, LOCAL_BANTER, ABILITY_METER_MAX, FATALITY_METER_MAX } from './constants';
import type { Piece, PieceType, Match, SpecialType, CharacterName, AppState, AppAction, Opponent } from './types';
import { Dispatch } from 'react';

// --- Audio Engine ---
let audioContext: AudioContext | null = null;
export const playSound = (type: 'swap' | 'match' | 'specialCreate' | 'specialActivate' | 'gameOver' | 'toasty' | 'ability' | 'playerHit' | 'opponentHit' | 'fatality', options?: { combo?: number, ability?: CharacterName }) => {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
            return;
        }
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

    switch (type) {
        case 'playerHit':
        case 'opponentHit':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(type === 'playerHit' ? 100 : 150, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'ability':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
        case 'swap':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'match':
            const baseFreq = 300 + (options?.combo ?? 1) * 50;
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
        case 'specialCreate':
             oscillator.type = 'sawtooth';
             oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
             oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
             gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
             oscillator.start();
             oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'specialActivate':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.4);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.4);
            break;
        case 'gameOver':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 1.0);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.0);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 1.0);
            break;
        case 'fatality':
             const noise = audioContext.createBufferSource();
             const bufferSize = audioContext.sampleRate * 2.5; // 2.5 seconds of noise
             const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
             const data = buffer.getChannelData(0);
             for (let i = 0; i < bufferSize; i++) {
                 data[i] = Math.random() * 2 - 1;
             }
             noise.buffer = buffer;
             const lowpass = audioContext.createBiquadFilter();
             lowpass.type = 'lowpass';
             lowpass.frequency.setValueAtTime(3000, audioContext.currentTime);
             lowpass.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 2.0);
             
             const anotherOscillator = audioContext.createOscillator();
             anotherOscillator.type = 'sawtooth';
             anotherOscillator.frequency.setValueAtTime(150, audioContext.currentTime);
             anotherOscillator.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 2.5);

             noise.connect(lowpass).connect(gainNode);
             anotherOscillator.connect(gainNode);

             gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
             gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2.5);
             
             noise.start();
             anotherOscillator.start();
             noise.stop(audioContext.currentTime + 2.5);
             anotherOscillator.stop(audioContext.currentTime + 2.5);
            break;
        case 'toasty':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1800, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
    }
};

// --- Utility Functions ---
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createPiece = (row: number, col: number, type: PieceType, idCounter: React.MutableRefObject<number>, special: SpecialType = 'none'): Piece => {
    return {
        id: idCounter.current++,
        type,
        row,
        col,
        state: 'idle',
        special,
    };
};


export const findMatches = (board: Piece[][]): Match[] => {
    const matches: Match[] = [];
    // Check rows
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE - 3; ) {
            const piece = board[r][c];
            if (!piece.type) { c++; continue; }
            const match = [piece];
            let k = c + 1;
            while (k < GRID_SIZE && board[r][k].type === piece.type) {
                match.push(board[r][k]);
                k++;
            }
            if (match.length >= 3) {
                matches.push({ pieces: match, type: 'row', length: match.length });
            }
            c = k;
        }
    }
    // Check columns
    for (let c = 0; c < GRID_SIZE; c++) {
        for (let r = 0; r <= GRID_SIZE - 3; ) {
            const piece = board[r][c];
            if (!piece.type) { r++; continue; }
            const match = [piece];
            let k = r + 1;
            while (k < GRID_SIZE && board[k][c].type === piece.type) {
                match.push(board[k][c]);
                k++;
            }
            if (match.length >= 3) {
                matches.push({ pieces: match, type: 'col', length: match.length });
            }
            r = k;
        }
    }
    return matches;
};

// --- Move Detection ---
export const findAPossibleMove = (board: Piece[][]): [Piece, Piece] | null => {
    const tempBoard = board.map(row => row.map(p => ({ ...p })));

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            // Swap right
            if (c < GRID_SIZE - 1) {
                [tempBoard[r][c], tempBoard[r][c + 1]] = [tempBoard[r][c + 1], tempBoard[r][c]];
                if (findMatches(tempBoard).length > 0) return [board[r][c], board[r][c + 1]];
                [tempBoard[r][c], tempBoard[r][c + 1]] = [tempBoard[r][c + 1], tempBoard[r][c]]; // Swap back
            }
            // Swap down
            if (r < GRID_SIZE - 1) {
                [tempBoard[r][c], tempBoard[r + 1][c]] = [tempBoard[r + 1][c], tempBoard[r][c]];
                if (findMatches(tempBoard).length > 0) return [board[r][c], board[r + 1][c]];
                [tempBoard[r][c], tempBoard[r + 1][c]] = [tempBoard[r + 1][c], tempBoard[r][c]]; // Swap back
            }
        }
    }
    return null;
}

export const hasPossibleMoves = (board: Piece[][]): boolean => {
    return findAPossibleMove(board) !== null;
};


export const createInitialBoard = (idCounter: React.MutableRefObject<number>): Piece[][] => {
    let board: Piece[][] = [];
    do {
        board = [];
        idCounter.current = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
            board[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)] as PieceType;
                board[r][c] = createPiece(r, c, type, idCounter);
            }
        }
    } while (findMatches(board).length > 0 || !hasPossibleMoves(board));
    return board;
};

export const applyGravity = (board: Piece[][], idCounter: React.MutableRefObject<number>) => {
    const boardCopy = board.map(row => [...row]);
    for (let c = 0; c < GRID_SIZE; c++) {
        let emptyRow = GRID_SIZE - 1;
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
            if (boardCopy[r][c].type !== null) {
                const piece = boardCopy[r][c];
                if (emptyRow !== r) {
                    boardCopy[emptyRow][c] = { ...piece, row: emptyRow };
                    boardCopy[r][c] = createPiece(r, c, null, idCounter, 'none');
                }
                emptyRow--;
            }
        }
    }
    return boardCopy;
}

export const refillBoard = (board: Piece[][], idCounter: React.MutableRefObject<number>) => {
    const boardCopy = board.map(row => [...row]);
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (boardCopy[r][c].type === null) {
                const newType = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)] as PieceType;
                boardCopy[r][c] = createPiece(r, c, newType, idCounter);
            }
        }
    }
    return boardCopy;
}

// --- NEW GAME LOGIC ---

type ProcessParams = {
    state: AppState,
    dispatch: Dispatch<AppAction>,
    playSoundMuted: (type: any, options?: any) => void,
    pieceIdCounter: React.MutableRefObject<number>,
    popupIdCounter: React.MutableRefObject<number>,
    initialAction: { type: 'swap', from: {row: number, col: number}, to: {row: number, col: number} } | { type: 'ability', row?: number, col?: number }
};

const handleMatchClearingAndSpecials = (
    boardCopy: Piece[][],
    matches: Match[],
    swapLocation: { row: number, col: number } | null,
    dispatch: Dispatch<AppAction>
) => {
    const allPiecesToClear = new Set<Piece>();
    const piecesToProcessForSpecials = new Set<Piece>(matches.flatMap(m => m.pieces));
    const activatedSpecials = new Set<Piece>();
    let specialDamage = 0;

    while (piecesToProcessForSpecials.size > 0) {
        const piece = piecesToProcessForSpecials.values().next().value;
        piecesToProcessForSpecials.delete(piece);
        allPiecesToClear.add(piece);

        if (piece.special !== 'none' && !activatedSpecials.has(piece)) {
            activatedSpecials.add(piece);
            playSound('specialActivate');
            specialDamage += 15;
            
            const effectId = Date.now() + Math.random();
            dispatch({ type: 'ADD_SPECIAL_EFFECT', payload: { effect: { id: effectId, type: piece.special, row: piece.row, col: piece.col } } });
            setTimeout(() => dispatch({ type: 'REMOVE_SPECIAL_EFFECT', payload: { id: effectId } }), 500);

            document.body.classList.add('screen-shake');
            setTimeout(() => document.body.classList.remove('screen-shake'), 400);

            if (piece.special === 'row') for (let c = 0; c < 8; c++) piecesToProcessForSpecials.add(boardCopy[piece.row][c]);
            if (piece.special === 'col') for (let r = 0; r < 8; r++) piecesToProcessForSpecials.add(boardCopy[r][piece.col]);
            if (piece.special === 'dragon') {
                 const targetType = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)] as CharacterName;
                 boardCopy.flat().forEach(p => { if (p.type === targetType) piecesToProcessForSpecials.add(p); });
            }
        }
    }
    
    let specialToCreate: { pieceToTransform: Piece, newSpecial: SpecialType } | null = null;
    const findSpecial = (match: Match, p: Piece) => {
        if (match.length >= 5) return { pieceToTransform: p, newSpecial: 'dragon' as SpecialType };
        if (match.length === 4) return { pieceToTransform: p, newSpecial: match.type === 'row' ? 'row' as SpecialType : 'col' as SpecialType };
        return null;
    }

    if (swapLocation) {
        const potentialMatch = matches.find(m => m.pieces.some(p => p.row === swapLocation.row && p.col === swapLocation.col && !activatedSpecials.has(p)));
        if (potentialMatch) {
            const pieceAtSwap = boardCopy[swapLocation.row][swapLocation.col];
            specialToCreate = findSpecial(potentialMatch, pieceAtSwap);
        }
    }
    if (!specialToCreate) {
        for (const match of matches) {
            if (match.pieces.some(p => activatedSpecials.has(p))) continue;
            specialToCreate = findSpecial(match, match.pieces[0]);
            if(specialToCreate) break;
        }
    }
    return { allPiecesToClear, specialToCreate, specialDamage };
};


export const processGameLoop = async ({ state, dispatch, playSoundMuted, pieceIdCounter, popupIdCounter, initialAction }: ProcessParams): Promise<void> => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    
    let boardCopy = state.board.map(row => [...row]);
    let swapLocation: { row: number, col: number } | null = null;
    let anyMatchesOccurred = false;
    
    // --- Initial Action (Swap or Ability) ---
    if (initialAction.type === 'swap') {
        swapLocation = initialAction.to;
        const { from, to } = initialAction;
        const piece1 = boardCopy[from.row][from.col];
        const piece2 = boardCopy[to.row][to.col];
        boardCopy[from.row][from.col] = { ...piece2, row: from.row, col: from.col };
        boardCopy[to.row][to.col] = { ...piece1, row: to.row, col: to.col };
        dispatch({ type: 'SET_BOARD', payload: boardCopy });
        await sleep(ANIMATION_DELAY * 2);
    }
    // TODO: Handle initial 'ability' action here by modifying boardCopy directly

    // --- Main Match & Cascade Loop ---
    let changedInLoop = true;
    let currentCombo = 1;
    
    while (changedInLoop) {
        changedInLoop = false;
        let matches = findMatches(boardCopy);

        if (matches.length > 0) {
            anyMatchesOccurred = true;
            changedInLoop = true;
            
            if(currentCombo > 1) dispatch({type: 'INCREMENT_COMBO_KEY'});
            dispatch({ type: 'SET_COMBO', payload: currentCombo });
            if(currentCombo > state.maxCombo) dispatch({type: 'SET_MAX_COMBO'});
            if(currentCombo >= 4) {
                playSoundMuted('toasty');
                dispatch({type: 'SHOW_TOASTY', payload: true});
                setTimeout(() => dispatch({type: 'SHOW_TOASTY', payload: false}), 1500);
            }
            playSoundMuted('match', { combo: currentCombo });

            const { allPiecesToClear, specialToCreate, specialDamage } = handleMatchClearingAndSpecials(boardCopy, matches, swapLocation, dispatch);
            if (specialToCreate) playSoundMuted('specialCreate');
            
            const totalPiecesCleared = allPiecesToClear.size;
            dispatch({ type: 'UPDATE_ABILITY_METER', payload: totalPiecesCleared });
            
            const baseDamage = [...allPiecesToClear].reduce((acc, piece) => acc + (piece.type === state.selectedCharacter ? 1.5 : 1), 0);
            const totalDamage = Math.round((baseDamage + specialDamage) * currentCombo);
            
            dispatch({ type: 'DEAL_DAMAGE', payload: totalDamage });
            
            const popupLocation = swapLocation || { row: matches[0].pieces[0].row, col: matches[0].pieces[0].col };
            dispatch({ type: 'ADD_TEXT_POPUP', payload: { popup: { id: 0, text: `${totalDamage} DMG! ${currentCombo > 1 ? `(x${currentCombo})` : ''}`, row: popupLocation.row, col: popupLocation.col, className: 'damage-popup' }, counterRef: popupIdCounter }});
            setTimeout(() => dispatch({ type: 'REMOVE_TEXT_POPUP' }), 1500);

            let animationBoard = boardCopy.map(row => row.map(p => allPiecesToClear.has(p) ? {...p, state: 'matched' as 'matched'} : p));
            dispatch({ type: 'SET_BOARD', payload: animationBoard });
            await sleep(ANIMATION_DELAY * 3);

            let boardWithoutMatched = boardCopy.map(row => row.map((p): Piece => {
                if (specialToCreate && p.id === specialToCreate.pieceToTransform.id) {
                    const originalPiece = boardCopy.flat().find(op => op.id === p.id);
                    return {...p, type: originalPiece?.type ?? null, special: specialToCreate.newSpecial, state: 'idle'};
                }
                return allPiecesToClear.has(p) ? { ...p, type: null, special: 'none', state: 'idle' } : p;
            }));
            
            let gravityBoard = applyGravity(boardWithoutMatched, pieceIdCounter);
            boardCopy = refillBoard(gravityBoard, pieceIdCounter);

            dispatch({ type: 'SET_BOARD', payload: boardCopy });
            await sleep(ANIMATION_DELAY * 2);
            
            currentCombo++;
            swapLocation = null;
        }
    }
    
    // --- Post-Loop Cleanup and Checks ---
    dispatch({ type: 'SET_COMBO', payload: 1 });
    
    const finalBoard = boardCopy;
    dispatch({ type: 'SET_BOARD', payload: finalBoard });

    if (!hasPossibleMoves(finalBoard) && state.gameState === 'playing') {
        await sleep(500);
        dispatch({ type: 'SET_BOARD', payload: createInitialBoard(pieceIdCounter) });
    }

    if (initialAction.type === 'swap' && !anyMatchesOccurred) {
        await sleep(ANIMATION_DELAY * 2);
        dispatch({ type: 'SET_BOARD', payload: state.board }); // Revert to original board state
    }

    if (anyMatchesOccurred) {
        dispatch({ type: 'PROCESS_OPPONENT_TURN' });
    } else {
        dispatch({ type: 'SET_PROCESSING', payload: false });
    }
};