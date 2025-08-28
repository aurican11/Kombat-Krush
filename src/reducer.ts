import type { AppState, AppAction, Opponent, Piece } from './types';
import { PLAYER_MAX_HEALTH, ABILITY_METER_MAX, FATALITY_METER_MAX, HINT_COOLDOWN_SECONDS, LOCAL_BANTER } from './constants';
import { findAPossibleMove } from './utils';

export const initialState: AppState = {
    board: [],
    gameState: 'start',
    playerHealth: PLAYER_MAX_HEALTH,
    opponentHealth: 100,
    currentLadderLevel: 0,
    opponent: null,
    shuffledLadder: [],
    movesUntilAttack: 5,
    opponentBanter: null,
    playerIsHit: false,
    opponentIsHit: false,
    selectedPiece: null,
    isProcessing: false,
    combo: 1,
    maxCombo: 1,
    textPopups: [],
    autoHintIds: null,
    manualHintIds: null,
    isHintOnCooldown: false,
    hintCooldown: 0,
    comboKey: 0,
    isMuted: false,
    showToasty: false,
    specialEffects: [],
    keyboardCursor: { row: 0, col: 0 },
    selectedCharacter: null,
    abilityMeter: 0,
    abilityState: 'idle',
    fatalityMeter: 0,
    fatalityState: 'idle',
    isFatalityWin: false,
    aimTarget: null,
    playerBanter: null,
};

export function gameReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_GAME_STATE':
            return { ...state, gameState: action.payload };
        case 'START_GAME': {
            const { character, ladder, board } = action.payload;
            const firstOpponent = ladder[0];
            return {
                ...initialState,
                gameState: 'playing',
                selectedCharacter: character,
                shuffledLadder: ladder,
                currentLadderLevel: 0,
                opponent: firstOpponent,
                opponentHealth: firstOpponent.health,
                movesUntilAttack: firstOpponent.movesPerAttack,
                board,
            };
        }
        case 'NEXT_LEVEL': {
            const nextLevel = state.currentLadderLevel + 1;
            const nextOpponent = state.shuffledLadder[nextLevel];
            return {
                ...state,
                gameState: 'playing',
                board: action.payload.board,
                currentLadderLevel: nextLevel,
                opponent: nextOpponent,
                playerHealth: PLAYER_MAX_HEALTH,
                opponentHealth: nextOpponent.health,
                movesUntilAttack: nextOpponent.movesPerAttack,
                abilityMeter: 0,
                abilityState: 'idle',
                fatalityMeter: 0,
                fatalityState: 'idle',
                isFatalityWin: false,
            };
        }
        case 'SELECT_PIECE':
            return { ...state, selectedPiece: action.payload };
        case 'SET_BOARD':
            return { ...state, board: action.payload };
        case 'UPDATE_HEALTH': {
            const newPlayerHealth = action.payload.player !== undefined ? action.payload.player : state.playerHealth;
            const newOpponentHealth = action.payload.opponent !== undefined ? action.payload.opponent : state.opponentHealth;
            return { ...state, playerHealth: Math.max(0, newPlayerHealth), opponentHealth: Math.max(0, newOpponentHealth) };
        }
        case 'SET_PLAYER_IS_HIT':
            return { ...state, playerIsHit: action.payload };
        case 'SET_OPPONENT_IS_HIT':
            return { ...state, opponentIsHit: action.payload };
        case 'DECREMENT_MOVES_UNTIL_ATTACK':
            return { ...state, movesUntilAttack: Math.max(0, state.movesUntilAttack - 1) };
        case 'RESET_MOVES_UNTIL_ATTACK':
            return { ...state, movesUntilAttack: state.opponent?.movesPerAttack || 5 };
        case 'SET_PROCESSING':
            return { ...state, isProcessing: action.payload };
        case 'SET_COMBO':
            return { ...state, combo: action.payload };
        case 'INCREMENT_COMBO_KEY':
            return { ...state, comboKey: state.comboKey + 1 };
        case 'SET_MAX_COMBO':
            return { ...state, maxCombo: Math.max(state.maxCombo, state.combo) };
        case 'ADD_TEXT_POPUP':
            action.payload.popup.id = action.payload.counterRef.current++;
            return { ...state, textPopups: [...state.textPopups, action.payload.popup] };
        case 'REMOVE_TEXT_POPUP':
            return { ...state, textPopups: state.textPopups.slice(1) };
        case 'ADD_SPECIAL_EFFECT':
            return { ...state, specialEffects: [...state.specialEffects, action.payload.effect] };
        case 'REMOVE_SPECIAL_EFFECT':
            return { ...state, specialEffects: state.specialEffects.filter(e => e.id !== action.payload.id) };
        case 'SHOW_TOASTY':
            return { ...state, showToasty: action.payload };
        case 'PLAYER_BANTER': {
            const { event, character, cooldownRef } = action.payload;
             cooldownRef.current = setTimeout(() => {
                if (cooldownRef.current) {
                    clearTimeout(cooldownRef.current);
                    cooldownRef.current = null;
                }
            }, 8000);
            const banterOptions = LOCAL_BANTER[character]?.[event];
            if (banterOptions && banterOptions.length > 0) {
                const banterText = banterOptions[Math.floor(Math.random() * banterOptions.length)];
                return { ...state, playerBanter: { key: Date.now(), text: banterText } };
            }
            return state;
        }
        case 'OPPONENT_BANTER': {
            const banterOptions = LOCAL_BANTER.opponent[action.payload.event];
             if (banterOptions && banterOptions.length > 0) {
                const banterText = banterOptions[Math.floor(Math.random() * banterOptions.length)];
                return { ...state, opponentBanter: { key: Date.now(), text: banterText } };
            }
            return state;
        }
        case 'TOGGLE_MUTE':
            return { ...state, isMuted: !state.isMuted };
        case 'CLEAR_HINTS':
            return { ...state, autoHintIds: null, manualHintIds: null };
        case 'SCHEDULE_AUTO_HINT': {
            const { board, timerRef } = action.payload;
            timerRef.current = setTimeout(() => {
                const move = findAPossibleMove(board);
                if (move) {
                    // This is a side effect, ideally we'd dispatch an action from here
                    // but that requires passing dispatch into the effect setup.
                    // For now, this is a limitation. A better way would be a thunk-like middleware.
                    // Let's just update the state directly here as a simplification.
                     (document.getElementById('root') as any)?.__app_dispatch?.({ type: 'SET_MANUAL_HINT', payload: [move[0].id, move[1].id] });
                }
            }, 5000);
            return state; // No immediate state change
        }
        case 'REQUEST_MANUAL_HINT': {
            const move = findAPossibleMove(action.payload.board);
            if (move) {
                setTimeout(() => (document.getElementById('root') as any)?.__app_dispatch?.({ type: 'SET_MANUAL_HINT', payload: null }), 5000);
                return { ...state, manualHintIds: [move[0].id, move[1].id], isHintOnCooldown: true, hintCooldown: HINT_COOLDOWN_SECONDS };
            }
            return state;
        }
        case 'SET_MANUAL_HINT':
             return { ...state, manualHintIds: action.payload };
        case 'SET_HINT_COOLDOWN':
            return { ...state, isHintOnCooldown: action.payload.onCooldown, hintCooldown: action.payload.seconds };
        case 'DECREMENT_HINT_COOLDOWN':
            return { ...state, hintCooldown: Math.max(0, state.hintCooldown - 1) };
        case 'SET_KEYBOARD_CURSOR':
            return { ...state, keyboardCursor: action.payload };
        case 'SET_ABILITY_STATE':
            return { ...state, abilityState: action.payload };
        case 'UPDATE_ABILITY_METER': {
            const newMeter = Math.min(state.abilityMeter + action.payload, ABILITY_METER_MAX);
            return { ...state, abilityMeter: newMeter, abilityState: newMeter >= ABILITY_METER_MAX ? 'ready' : state.abilityState };
        }
        case 'RESET_ABILITY_METER':
            return { ...state, abilityMeter: 0, abilityState: 'idle' };
        case 'UPDATE_FATALITY_METER': {
            const newMeter = Math.min(state.fatalityMeter + action.payload, FATALITY_METER_MAX);
            return { ...state, fatalityMeter: newMeter, fatalityState: newMeter >= FATALITY_METER_MAX ? 'ready' : state.fatalityState };
        }
        case 'RESET_FATALITY_METER':
             return { ...state, fatalityMeter: 0, fatalityState: 'idle' };
        case 'SET_FATALITY_STATE':
            return { ...state, fatalityState: action.payload };
        case 'TRIGGER_FATALITY_ANIMATION':
            return { ...state, board: state.board.map(row => row.map(p => ({ ...p, state: 'fatality' as const }))) };
        case 'FINISH_FATALITY':
            return { ...state, isFatalityWin: true, gameState: state.currentLadderLevel >= state.shuffledLadder.length - 1 ? 'ladderComplete' : 'levelWin' };
        default:
            return state;
    }
}
