import type { AppState, AppAction } from './types';
import { PLAYER_MAX_HEALTH, ABILITY_METER_MAX, HINT_COOLDOWN_SECONDS, LOCAL_BANTER } from './constants';
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
    score: 0,
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
    aimTarget: null,
    playerBanter: null,
    showSettingsModal: false,
};

export function gameReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_GAME_STATE':
            return { ...state, gameState: action.payload, showSettingsModal: false };
        case 'RESET_STATE':
            return initialState;
        case 'START_GAME': {
            const { character, ladder, board } = action.payload;
            const firstOpponent = ladder[0];
            const playerIdleBanterOptions = LOCAL_BANTER[character]?.idle || [];
            const opponentIdleBanterOptions = LOCAL_BANTER.opponent?.idle || [];
            
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
                playerBanter: { key: Date.now(), text: playerIdleBanterOptions[Math.floor(Math.random() * playerIdleBanterOptions.length)] || '' },
                opponentBanter: { key: Date.now() + 1, text: opponentIdleBanterOptions[Math.floor(Math.random() * opponentIdleBanterOptions.length)] || '' },
            };
        }
        case 'NEXT_LEVEL': {
            const nextLevel = state.currentLadderLevel + 1;
            const nextOpponent = state.shuffledLadder[nextLevel];
            const playerIdleBanterOptions = state.selectedCharacter ? LOCAL_BANTER[state.selectedCharacter]?.idle || [] : [];
            const opponentIdleBanterOptions = LOCAL_BANTER.opponent?.idle || [];
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
                showSettingsModal: false,
                playerBanter: { key: Date.now(), text: playerIdleBanterOptions[Math.floor(Math.random() * playerIdleBanterOptions.length)] || '' },
                opponentBanter: { key: Date.now() + 1, text: opponentIdleBanterOptions[Math.floor(Math.random() * opponentIdleBanterOptions.length)] || '' },
            };
        }
        case 'SELECT_PIECE':
            return { ...state, selectedPiece: action.payload };
        case 'SET_BOARD':
            return { ...state, board: action.payload };
        case 'DEAL_DAMAGE': {
            const totalDamage = action.payload;
            const newOpponentHealth = Math.max(0, state.opponentHealth - totalDamage);
            const isWin = newOpponentHealth <= 0;
            
            let newGameState = state.gameState;
            let newBanter = state.opponentBanter;

            if (isWin && state.gameState === 'playing') {
                newGameState = state.currentLadderLevel >= state.shuffledLadder.length - 1 ? 'ladderComplete' : 'levelWin';
                const defeatOptions = LOCAL_BANTER.opponent?.onDefeat || [];
                newBanter = { key: Date.now(), text: defeatOptions[Math.floor(Math.random() * defeatOptions.length)] || '' };
            }

            return {
                ...state,
                opponentHealth: newOpponentHealth,
                opponentIsHit: true,
                score: state.score + totalDamage,
                gameState: newGameState,
                opponentBanter: newBanter
            };
        }
         case 'PROCESS_OPPONENT_TURN': {
            if (state.gameState !== 'playing') {
                return { ...state, isProcessing: false };
            }
        
            const newMovesCounter = state.movesUntilAttack - 1;
        
            if (newMovesCounter <= 0) {
                if (!state.opponent) return { ...state, isProcessing: false }; 
                
                const newPlayerHealth = Math.max(0, state.playerHealth - state.opponent.attack);
                const isGameOver = newPlayerHealth <= 0;
        
                const tauntOptions = LOCAL_BANTER.opponent?.taunt || [];
                const tauntText = tauntOptions[Math.floor(Math.random() * tauntOptions.length)] || '';
        
                return {
                    ...state,
                    playerHealth: newPlayerHealth,
                    playerIsHit: true,
                    movesUntilAttack: state.opponent.movesPerAttack,
                    isProcessing: isGameOver,
                    gameState: isGameOver ? 'gameOver' : state.gameState,
                    showSettingsModal: isGameOver ? false : state.showSettingsModal,
                    opponentBanter: { key: Date.now(), text: tauntText },
                };
            }
        
            return {
                ...state,
                movesUntilAttack: newMovesCounter,
                isProcessing: false,
            };
        }
        case 'SET_PLAYER_IS_HIT':
            return { ...state, playerIsHit: action.payload };
        case 'SET_OPPONENT_IS_HIT':
            return { ...state, opponentIsHit: action.payload };
        case 'SET_PROCESSING':
            return { ...state, isProcessing: action.payload };
        case 'SET_COMBO':
            return { ...state, combo: action.payload };
        case 'INCREMENT_COMBO_KEY':
            return { ...state, comboKey: state.comboKey + 1 };
        case 'SET_MAX_COMBO':
            return { ...state, maxCombo: Math.max(state.maxCombo, state.combo) };
        case 'UPDATE_SCORE':
            return { ...state, score: state.score + action.payload };
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
        case 'TOGGLE_SETTINGS_MODAL':
            return { ...state, showSettingsModal: !state.showSettingsModal };
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
        default:
            return state;
    }
}