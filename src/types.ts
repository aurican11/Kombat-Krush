import type { MutableRefObject } from 'react';

export type CharacterName = 'scorpion' | 'subzero' | 'raiden' | 'reptile' | 'kano' | 'liukang';
export type PieceType = CharacterName | null;
export type SpecialType = 'none' | 'row' | 'col' | 'dragon';
export type GameState = 'start' | 'characterSelect' | 'playing' | 'gameOver' | 'levelWin' | 'ladderComplete';
export type AbilityState = 'idle' | 'ready' | 'aiming';
export type FatalityState = 'idle' | 'ready';
export type SpecialEffect = { id: number; type: SpecialType | 'lightning' | 'ice_shatter' | 'acid_spit' | 'kano_ball' | 'dragon_fire' | 'netherrealm_flame'; row: number; col: number; };

export interface Piece {
  id: number;
  type: PieceType;
  row: number;
  col: number;
  state: 'idle' | 'matched' | 'frozen' | 'fatality';
  special: SpecialType;
}
export interface Match {
    pieces: Piece[];
    type: 'row' | 'col';
    length: number;
}
export interface TextPopup {
    id: number;
    text: string;
    row: number;
    col: number;
    className: string;
}
export interface Opponent {
    name: string;
    health: number;
    attack: number;
    movesPerAttack: number;
    pieceType: CharacterName;
}

// --- Reducer Types ---

export interface AppState {
    board: Piece[][];
    gameState: GameState;
    playerHealth: number;
    opponentHealth: number;
    currentLadderLevel: number;
    opponent: Opponent | null;
    shuffledLadder: Opponent[];
    movesUntilAttack: number;
    opponentBanter: { key: number, text: string } | null;
    playerIsHit: boolean;
    opponentIsHit: boolean;
    selectedPiece: { row: number; col: number } | null;
    isProcessing: boolean;
    combo: number;
    maxCombo: number;
    score: number;
    textPopups: TextPopup[];
    autoHintIds: number[] | null;
    manualHintIds: number[] | null;
    isHintOnCooldown: boolean;
    hintCooldown: number;
    comboKey: number;
    isMuted: boolean;
    showToasty: boolean;
    specialEffects: SpecialEffect[];
    keyboardCursor: { row: number; col: number };
    selectedCharacter: CharacterName | null;
    abilityMeter: number;
    abilityState: AbilityState;
    fatalityMeter: number;
    fatalityState: FatalityState;
    isFatalityWin: boolean;
    aimTarget: { row: number; col: number } | null;
    playerBanter: { key: number, text: string } | null;
}

export type AppAction =
    | { type: 'SET_GAME_STATE'; payload: GameState }
    | { type: 'START_GAME'; payload: { character: CharacterName; ladder: Opponent[]; board: Piece[][] } }
    | { type: 'NEXT_LEVEL'; payload: { board: Piece[][] } }
    | { type: 'RESET_STATE' }
    | { type: 'SELECT_PIECE'; payload: { row: number; col: number } | null }
    | { type: 'SET_BOARD'; payload: Piece[][] }
    | { type: 'DEAL_DAMAGE'; payload: number }
    | { type: 'PROCESS_OPPONENT_TURN' }
    | { type: 'SET_PLAYER_IS_HIT'; payload: boolean }
    | { type: 'SET_OPPONENT_IS_HIT'; payload: boolean }
    | { type: 'SET_PROCESSING'; payload: boolean }
    | { type: 'SET_COMBO'; payload: number }
    | { type: 'INCREMENT_COMBO_KEY' }
    | { type: 'SET_MAX_COMBO' }
    | { type: 'UPDATE_SCORE', payload: number }
    | { type: 'ADD_TEXT_POPUP'; payload: { popup: TextPopup; counterRef: MutableRefObject<number> } }
    | { type: 'REMOVE_TEXT_POPUP' }
    | { type: 'ADD_SPECIAL_EFFECT'; payload: { effect: SpecialEffect } }
    | { type: 'REMOVE_SPECIAL_EFFECT'; payload: { id: number } }
    | { type: 'SHOW_TOASTY'; payload: boolean }
    | { type: 'PLAYER_BANTER'; payload: { event: 'gameStart' | 'highCombo' | 'ability' | 'gameOverWin' | 'gameOverLoss', character: CharacterName, cooldownRef: MutableRefObject<any>} }
    | { type: 'OPPONENT_BANTER'; payload: { event: 'taunt' | 'onDefeat'} }
    | { type: 'TOGGLE_MUTE' }
    | { type: 'CLEAR_HINTS' }
    | { type: 'SCHEDULE_AUTO_HINT'; payload: { board: Piece[][], timerRef: MutableRefObject<any> } }
    | { type: 'SET_MANUAL_HINT'; payload: number[] | null }
    | { type: 'REQUEST_MANUAL_HINT', payload: { board: Piece[][] } }
    | { type: 'SET_HINT_COOLDOWN'; payload: { onCooldown: boolean; seconds: number } }
    | { type: 'DECREMENT_HINT_COOLDOWN' }
    | { type: 'SET_KEYBOARD_CURSOR'; payload: { row: number; col: number } }
    | { type: 'SET_ABILITY_STATE'; payload: AbilityState }
    | { type: 'UPDATE_ABILITY_METER'; payload: number }
    | { type: 'RESET_ABILITY_METER' }
    | { type: 'UPDATE_FATALITY_METER'; payload: number }
    | { type: 'RESET_FATALITY_METER' }
    | { type: 'SET_FATALITY_STATE'; payload: FatalityState }
    | { type: 'TRIGGER_FATALITY_ANIMATION' }
    | { type: 'FINISH_FATALITY' };