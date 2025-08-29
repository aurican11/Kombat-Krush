import React, { useEffect, useCallback, useRef, useReducer, memo, CSSProperties, Dispatch, MutableRefObject } from 'react';
import { createRoot } from 'react-dom/client';

// --- BUNDLED FROM: src/types.ts ---

type CharacterName = 'scorpion' | 'subzero' | 'raiden' | 'reptile' | 'kano' | 'liukang';
type PieceType = CharacterName | null;
type SpecialType = 'none' | 'row' | 'col' | 'dragon';
type GameState = 'start' | 'characterSelect' | 'playing' | 'gameOver' | 'levelWin' | 'ladderComplete';
type AbilityState = 'idle' | 'ready' | 'aiming';
type SpecialEffect = { id: number; type: SpecialType | 'lightning' | 'ice_shatter' | 'acid_spit' | 'kano_ball' | 'dragon_fire' | 'netherrealm_flame'; row: number; col: number; };

interface Piece {
  id: number;
  type: PieceType;
  row: number;
  col: number;
  state: 'idle' | 'matched' | 'frozen' | 'fatality';
  special: SpecialType;
}
interface Match {
    pieces: Piece[];
    type: 'row' | 'col';
    length: number;
}
interface TextPopup {
    id: number;
    text: string;
    row: number;
    col: number;
    className: string;
}
interface Opponent {
    name: string;
    health: number;
    attack: number;
    movesPerAttack: number;
    pieceType: CharacterName;
}

// --- Reducer Types ---

interface AppState {
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
    aimTarget: { row: number; col: number } | null;
    playerBanter: { key: number, text: string } | null;
    showSettingsModal: boolean;
}

type AppAction =
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
    | { type: 'PLAYER_BANTER'; payload: { event: 'gameStart' | 'highCombo' | 'ability' | 'gameOverWin' | 'gameOverLoss' | 'hit', character: CharacterName, cooldownRef: MutableRefObject<any>} }
    | { type: 'OPPONENT_BANTER'; payload: { event: 'taunt' | 'onDefeat' | 'hit'} }
    | { type: 'TOGGLE_MUTE' }
    | { type: 'TOGGLE_SETTINGS_MODAL' }
    | { type: 'CLEAR_HINTS' }
    | { type: 'SET_AUTO_HINT'; payload: number[] | null }
    | { type: 'SET_MANUAL_HINT'; payload: number[] | null }
    | { type: 'SET_HINT_COOLDOWN'; payload: { onCooldown: boolean; seconds: number } }
    | { type: 'DECREMENT_HINT_COOLDOWN' }
    | { type: 'SET_KEYBOARD_CURSOR'; payload: { row: number; col: number } }
    | { type: 'SET_ABILITY_STATE'; payload: AbilityState }
    | { type: 'UPDATE_ABILITY_METER'; payload: number }
    | { type: 'RESET_ABILITY_METER' };

// --- BUNDLED FROM: src/constants.tsx ---

const GRID_SIZE = 8;
const PIECE_TYPES = ['scorpion', 'subzero', 'reptile', 'kano', 'raiden', 'liukang'];
const ANIMATION_DELAY = 150; // ms for each step in the game loop
const PLAYER_MAX_HEALTH = 100;
const HINT_DELAY = 5000; // ms before showing a hint
const HINT_COOLDOWN_SECONDS = 15;
const ABILITY_METER_MAX = 18; // Pieces to match to fill meter

const LADDER_DATA: Opponent[] = [
    { name: 'Kano', health: 100, attack: 15, movesPerAttack: 5, pieceType: 'kano' },
    { name: 'Reptile', health: 115, attack: 18, movesPerAttack: 5, pieceType: 'reptile' },
    { name: 'Liu Kang', health: 130, attack: 21, movesPerAttack: 4, pieceType: 'liukang' },
    { name: 'Raiden', health: 145, attack: 24, movesPerAttack: 4, pieceType: 'raiden' },
    { name: 'Sub-Zero', health: 160, attack: 27, movesPerAttack: 4, pieceType: 'subzero' },
    { name: 'Scorpion', health: 175, attack: 30, movesPerAttack: 3, pieceType: 'scorpion' },
];


// --- SVG Icons for Pieces ---
const PieceIcons: { [key in CharacterName]: React.FC } = {
    scorpion: () => (
        <svg viewBox="0 0 100 100">
            <g fill="#FFFFFF" stroke="#1a1a1a" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
                <path d="M50,15 C 25,15 20,40 25,60 L 25,80 C 25,90 40,95 50,95 C 60,95 75,90 75,80 L 75,60 C 80,40 75,15 50,15 Z" />
                <circle cx="40" cy="50" r="10" fill="#1a1a1a" stroke="none"/>
                <circle cx="60" cy="50" r="10" fill="#1a1a1a" stroke="none"/>
                <path d="M47,62 L53,62 L50,72 Z" fill="#1a1a1a" stroke="none" />
                <path d="M35,80 H 65 M40,80 V 88 M45,80 V 88 M50,80 V 88 M55,80 V 88 M60,80 V 88" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="butt" />
            </g>
        </svg>
    ),
    subzero: () => (
        <svg viewBox="0 0 100 100">
            <defs>
                <g id="snowflake-arm">
                    <path d="M50 42 L50 15" />
                    <path d="M50 35 L42 30" />
                    <path d="M50 35 L58 30" />
                    <path d="M50 22 L45 18" />
                    <path d="M50 22 L55 18" />
                </g>
            </defs>
            <g stroke="var(--subzero-color)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M50 42 L57 46 L57 54 L50 58 L43 54 L43 46 Z" />
                <use href="#snowflake-arm" />
                <use href="#snowflake-arm" transform="rotate(60 50 50)" />
                <use href="#snowflake-arm" transform="rotate(120 50 50)" />
                <use href="#snowflake-arm" transform="rotate(180 50 50)" />
                <use href="#snowflake-arm" transform="rotate(240 50 50)" />
                <use href="#snowflake-arm" transform="rotate(300 50 50)" />
            </g>
        </svg>
    ),
    reptile: () => <svg viewBox="0 0 100 100"><g><circle cx="50" cy="50" r="40" fill="var(--reptile-color)" stroke="#1a1a1a" strokeWidth="5" /><path d="M50 20 C 60 35, 60 65, 50 80 C 40 65, 40 35, 50 20 Z" fill="#1a1a1a" /><circle cx="50" cy="50" r="30" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="6" /></g></svg>,
    kano: () => <svg viewBox="0 0 100 100"><g fill="var(--kano-color)" stroke="#1a1a1a" strokeWidth="5"><circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="25" fill="#fff" /><circle cx="50" cy="50" r="10" /><path d="M50 10 V 90 M10 50 H 90" stroke="#1a1a1a" strokeWidth="4" fill="none" opacity="0.6" strokeDasharray="5,5" /></g></svg>,
    raiden: () => (
        <svg viewBox="0 0 100 100">
            <g fill="#f8c838" stroke="#1a1a1a" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
                <path d="M50 10 L30 50 L45 50 L40 90 L70 40 L55 40 L50 10 Z" />
            </g>
        </svg>
    ),
    liukang: () => (
        <svg viewBox="0 0 100 100">
            <g stroke="#1a1a1a" strokeWidth="5" strokeLinejoin="round">
                <path fill="var(--liukang-color)" d="M50,95 C35,80 20,75 30,45 C35,25 45,15 50,10 C55,15 65,25 70,45 C80,75 65,80 50,95 Z" />
                <path fill="#FFEB3B" d="M50,85 C42,75 35,70 40,50 C42,38 48,30 50,25 C52,30 58,38 60,50 C65,70 58,75 50,85 Z" />
            </g>
        </svg>
    ),
};

const CHARACTER_DATA: {
    [key in CharacterName]: { name: string; description: string; ability: string; }
} = {
    scorpion: {
        name: 'Scorpion',
        description: 'Ability: Netherrealm Flame. Destroys all pieces of a chosen type.',
        ability: 'Netherrealm Flame'
    },
    subzero: {
        name: 'Sub-Zero',
        description: 'Ability: Ice Shatter. Destroys a 2x2 area of pieces.',
        ability: 'Ice Shatter'
    },
    raiden: {
        name: 'Raiden',
        description: 'Ability: Lightning Strike. Randomly destroys a 2x2 block of pieces.',
        ability: 'Lightning Strike'
    },
    reptile: {
        name: 'Reptile',
        description: 'Ability: Acid Spit. Destroys a random column.',
        ability: 'Acid Spit'
    },
    kano: {
        name: 'Kano',
        description: 'Ability: Kano Ball. Destroys a random row.',
        ability: 'Kano Ball'
    },
    liukang: {
        name: 'Liu Kang',
        description: 'Ability: Dragon Fire. Converts a random piece type to Liu Kang\'s piece.',
        ability: 'Dragon Fire'
    }
};

const LOCAL_BANTER: { [key in CharacterName | 'opponent']: { [key: string]: string[] } } = {
    scorpion: {
        gameStart: ["Vengeance will be mine!", "Get over here!", "I am the lord of the Netherrealm!", "You will taste the fires of hell!"],
        highCombo: ["Feel the sting of my spear!", "You cannot defeat me.", "Impressive... for a mortal.", "Vengeance is a powerful weapon."],
        ability: ["To the Netherrealm!", "Burn!", "Come here!"],
        hit: ["You will suffer!", "A mere scratch.", "Feel my pain!"],
        gameOverWin: ["A worthy victory.", "The Shirai Ryu are avenged."],
        gameOverLoss: ["This is not over...", "You will pay for this."]
    },
    subzero: {
        gameStart: ["This fight will be your last.", "For the Lin Kuei!", "You will feel the chill of death.", "I will shatter you."],
        highCombo: ["You are no match for the Grandmaster.", "Winter is coming.", "My power is absolute.", "Your blood runs cold."],
        ability: ["Freeze!", "Feel the cold.", "Absolute Zero!"],
        hit: ["You will regret that.", "A cold response is coming.", "That felt... warm."],
        gameOverWin: ["The cold is a merciless ally.", "Justice is served."],
        gameOverLoss: ["I will return, stronger.", "A temporary setback."]
    },
    raiden: {
        gameStart: ["I will consult with the Elder Gods.", "Earthrealm is under my protection.", "There are fates worse than death.", "Face the fury of the storm."],
        highCombo: ["Thunder take you!", "By the gods!", "Your soul is stained.", "The heavens have judged you."],
        ability: ["Feel the power of lightning!", "For Earthrealm!", "There is no escape from the storm."],
        hit: ["The Elder Gods are displeased.", "A shocking development.", "You dare strike a god?"],
        gameOverWin: ["The tournament is won.", "A new day dawns for Earthrealm."],
        gameOverLoss: ["The future is in peril.", "I must not fail again."]
    },
    reptile: {
        gameStart: ["For Zaterra!", "I will find my people.", "You will not see me coming.", "My venom will find you."],
        highCombo: ["My venom is potent.", "Clever girl...", "I am the last of my kind.", "Nowhere to run, nowhere to hide."],
        ability: ["Acid Spit!", "Disappear...", "Melt away!"],
        hit: ["Hsssss!", "My scales are strong.", "You'll pay for that!"],
        gameOverWin: ["My quest continues.", "Zaterra will rise again."],
        gameOverLoss: ["I am alone...", "My brood will be lost forever."]
    },
    kano: {
        gameStart: ["Let's have a little fun, eh?", "Time to get paid.", "Don't mess with the Black Dragon.", "Time for a bit of the old ultra-violence."],
        highCombo: ["Beauty, ain't it?", "Right in the goolies!", "You're a bloody mess.", "This is too easy!"],
        ability: ["Kano Ball!", "Here comes the thunder from down under!", "Crikey!"],
        hit: ["Oi, watch it!", "That's gonna leave a mark!", "You'll get yours, mate."],
        gameOverWin: ["Easy money.", "Always bet on black... Dragon."],
        gameOverLoss: ["Ripper!", "I've been robbed!"]
    },
    liukang: {
        gameStart: ["The spirits of the Shaolin are with me.", "Show me what you can do.", "I fight for the honor of my ancestors.", "I am the chosen one."],
        highCombo: ["Feel the heat of the dragon!", "A flawless technique.", "You lack discipline.", "The dragon's fury is unleashed."],
        ability: ["Dragon's Fire!", "For the Order of Light!", "Hwoooo-a-ta!"],
        hit: ["A poor strike.", "My focus is unbroken.", "You must try harder."],
        gameOverWin: ["The champion is victorious.", "Balance has been restored."],
        gameOverLoss: ["I have brought shame to the temple.", "I must train harder."]
    },
    opponent: {
        taunt: ["Is that all you've got?", "Pathetic!", "My grandmother fights better than that.", "You're starting to bore me.", "You fight like a child."],
        onDefeat: ["This cannot be...", "I have been bested...", "You are strong... for now.", "Impossible..."],
        idle: ["You face the might of Shao Kahn's champion!", "Prepare to die!", "Your soul will be mine.", "You are not worthy."],
        hit: ["A lucky shot!", "Barely felt it.", "Is that the best you can do?", "I've had worse."]
    }
};

// --- BUNDLED FROM: src/utils.ts ---

let audioContext: AudioContext | null = null;
const playSound = (type: 'swap' | 'match' | 'specialCreate' | 'specialActivate' | 'gameOver' | 'toasty' | 'ability' | 'playerHit' | 'opponentHit' | 'fatality', options?: { combo?: number, ability?: CharacterName }) => {
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createPiece = (row: number, col: number, type: PieceType, idCounter: React.MutableRefObject<number>, special: SpecialType = 'none'): Piece => {
    return {
        id: idCounter.current++,
        type,
        row,
        col,
        state: 'idle',
        special,
    };
};


const findMatches = (board: Piece[][]): Match[] => {
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

const findAPossibleMove = (board: Piece[][]): [Piece, Piece] | null => {
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

const hasPossibleMoves = (board: Piece[][]): boolean => {
    return findAPossibleMove(board) !== null;
};


const createInitialBoard = (idCounter: React.MutableRefObject<number>): Piece[][] => {
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

const applyGravity = (board: Piece[][], idCounter: React.MutableRefObject<number>) => {
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

const refillBoard = (board: Piece[][], idCounter: React.MutableRefObject<number>) => {
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


const processGameLoop = async ({ state, dispatch, playSoundMuted, pieceIdCounter, popupIdCounter, initialAction }: ProcessParams): Promise<void> => {
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

    // --- Main Match & Cascade Loop ---
    let changedInLoop = true;
    let currentCombo = 1;
    let isInitialAbility = initialAction.type === 'ability';
    
    while (changedInLoop) {
        changedInLoop = false;
        let matches = findMatches(boardCopy);

        if (isInitialAbility && initialAction.type === 'ability') {
            isInitialAbility = false; // Run only once
            anyMatchesOccurred = true;
            dispatch({ type: 'RESET_ABILITY_METER' });
            const { selectedCharacter } = state;

            if (selectedCharacter === 'liukang') {
                 const playerPieceType = selectedCharacter;
                 const otherPieceTypes = [...new Set(boardCopy.flat().map(p => p.type).filter(t => t && t !== playerPieceType))] as CharacterName[];
                 if (otherPieceTypes.length > 0) {
                     const typeToConvert = otherPieceTypes[Math.floor(Math.random() * otherPieceTypes.length)];
                     boardCopy = boardCopy.map(row => row.map(p => {
                         if (p.type === typeToConvert) {
                             const effectId = Date.now() + p.id;
                             dispatch({ type: 'ADD_SPECIAL_EFFECT', payload: { effect: { id: effectId, type: 'dragon_fire', row: p.row, col: p.col } } });
                             setTimeout(() => dispatch({ type: 'REMOVE_SPECIAL_EFFECT', payload: { id: effectId } }), 500);
                             return { ...p, type: playerPieceType };
                         }
                         return p;
                     }));
                 }
                 await sleep(ANIMATION_DELAY * 2);
                 matches = findMatches(boardCopy); // Re-evaluate matches after conversion
            } else if (selectedCharacter) {
                let abilityPieces: Piece[] = [];
                if (selectedCharacter === 'raiden') {
                    const startRow = Math.floor(Math.random() * (GRID_SIZE - 1));
                    const startCol = Math.floor(Math.random() * (GRID_SIZE - 1));
                    abilityPieces.push(boardCopy[startRow][startCol], boardCopy[startRow+1][startCol], boardCopy[startRow][startCol+1], boardCopy[startRow+1][startCol+1]);
                    const effectId = Date.now();
                    dispatch({ type: 'ADD_SPECIAL_EFFECT', payload: { effect: { id: effectId, type: 'lightning', row: startRow + 0.5, col: startCol + 0.5 } } });
                    setTimeout(() => dispatch({ type: 'REMOVE_SPECIAL_EFFECT', payload: { id: effectId } }), 600);
                } else if (selectedCharacter === 'reptile') {
                    const col = Math.floor(Math.random() * GRID_SIZE);
                    for(let r = 0; r < GRID_SIZE; r++) abilityPieces.push(boardCopy[r][col]);
                    const effectId = Date.now();
                    dispatch({ type: 'ADD_SPECIAL_EFFECT', payload: { effect: { id: effectId, type: 'acid_spit', row: 0, col } } });
                    setTimeout(() => dispatch({ type: 'REMOVE_SPECIAL_EFFECT', payload: { id: effectId } }), 800);
                } else if (selectedCharacter === 'kano') {
                    const row = Math.floor(Math.random() * GRID_SIZE);
                    for(let c = 0; c < GRID_SIZE; c++) abilityPieces.push(boardCopy[row][c]);
                    const effectId = Date.now();
                    dispatch({ type: 'ADD_SPECIAL_EFFECT', payload: { effect: { id: effectId, type: 'kano_ball', row, col: 0 } } });
                    setTimeout(() => dispatch({ type: 'REMOVE_SPECIAL_EFFECT', payload: { id: effectId } }), 800);
                } else if (selectedCharacter === 'subzero' && initialAction.row !== undefined && initialAction.col !== undefined) {
                    const { row, col } = initialAction;
                    const startRow = Math.min(row, GRID_SIZE - 2);
                    const startCol = Math.min(col, GRID_SIZE - 2);
                    for(let r = startRow; r < startRow + 2; r++) for(let c = startCol; c < startCol + 2; c++) abilityPieces.push(boardCopy[r][c]);
                    const effectId = Date.now();
                    dispatch({ type: 'ADD_SPECIAL_EFFECT', payload: { effect: { id: effectId, type: 'ice_shatter', row: startRow + 0.5, col: startCol + 0.5 } } });
                    setTimeout(() => dispatch({ type: 'REMOVE_SPECIAL_EFFECT', payload: { id: effectId } }), 800);
                } else if (selectedCharacter === 'scorpion' && initialAction.row !== undefined && initialAction.col !== undefined) {
                    const targetType = boardCopy[initialAction.row][initialAction.col].type;
                    if(targetType) {
                        boardCopy.flat().forEach(p => {
                            if (p.type === targetType) {
                                abilityPieces.push(p);
                                const effectId = Date.now() + p.id;
                                dispatch({ type: 'ADD_SPECIAL_EFFECT', payload: { effect: { id: effectId, type: 'netherrealm_flame', row: p.row, col: p.col } } });
                                setTimeout(() => dispatch({ type: 'REMOVE_SPECIAL_EFFECT', payload: { id: effectId } }), 500);
                            }
                        });
                    }
                }
                if (abilityPieces.length > 0) {
                    matches.push({ pieces: abilityPieces, type: 'col', length: abilityPieces.length });
                }
            }
        }


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

// --- BUNDLED FROM: src/reducer.ts ---

const initialState: AppState = {
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

function gameReducer(state: AppState, action: AppAction): AppState {
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
        case 'SET_AUTO_HINT':
            return { ...state, autoHintIds: action.payload };
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

// --- BUNDLED FROM: src/components.tsx ---

const GamePiece = memo(({ piece, onClick, isSelected, isHinted, isManualHinted, isCursorOn, onSwipe, isAiming, isAimTarget }: { piece: Piece; onClick: () => void; isSelected: boolean, isHinted: boolean, isManualHinted: boolean, isCursorOn: boolean; onSwipe: (direction: 'up' | 'down' | 'left' | 'right') => void; isAiming: boolean; isAimTarget: boolean; }) => {
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const SWIPE_SENSITIVITY = 20;
    
    const Icon = piece.type ? PieceIcons[piece.type] : null;

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - touchStart.current.x;
        const diffY = endY - touchStart.current.y;
        
        if (Math.abs(diffX) > SWIPE_SENSITIVITY || Math.abs(diffY) > SWIPE_SENSITIVITY) { // Threshold for swipe
            if (Math.abs(diffX) > Math.abs(diffY)) {
                onSwipe(diffX > 0 ? 'right' : 'left');
            } else {
                onSwipe(diffY > 0 ? 'down' : 'up');
            }
        }
        touchStart.current = null;
    };


    if (!piece.type || !Icon) {
        return null;
    }
    const style: CSSProperties = {
        top: `${piece.row * 12.5}%`,
        left: `${piece.col * 12.5}%`,
    };

    const hintClass = isHinted ? 'hinted' : isManualHinted ? 'manual-hint' : '';
    const cursorClass = isCursorOn ? 'cursor-on' : '';
    const aimingClass = isAiming ? 'aiming' : '';
    const aimTargetClass = isAimTarget ? 'aim-target' : '';

    return (
        <button
            className={`game-piece ${piece.type} ${isSelected ? 'selected' : ''} ${hintClass} ${cursorClass} ${piece.state} special-${piece.special} ${aimingClass} ${aimTargetClass}`}
            style={style}
            onClick={onClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-label={`Piece at row ${piece.row}, column ${piece.col}, type ${piece.type}, special ${piece.special}`}
            aria-pressed={isSelected}
        >
            <Icon />
        </button>
    );
});

type EndGameModalProps = {
    gameState: GameState;
    opponent: Opponent | null;
    maxCombo: number;
    score: number;
    onPlayAgain: () => void;
    onMainMenu: () => void;
    onNextLevel: () => void;
};

const EndGameModal = memo(({ gameState, opponent, maxCombo, score, onPlayAgain, onMainMenu, onNextLevel }: EndGameModalProps) => {
    if (!['levelWin', 'ladderComplete', 'gameOver'].includes(gameState)) {
        return null;
    }

    return (
        <div className="screen-overlay">
            <div className={`modal-dialog ${gameState}`}>
                 {gameState === 'ladderComplete' && <h2 className="victory-text perfect-victory-text">FLAWLESS VICTORY</h2>}
                 {gameState === 'levelWin' && <h2 className="victory-text">YOU WIN</h2>}
                 {gameState === 'gameOver' && <h2 className='fatality-text'>GAME OVER</h2>}

                {gameState === 'ladderComplete' ? (
                    <>
                        <p>You have defeated all challengers and conquered the ladder!</p>
                        <button onClick={onPlayAgain}>Play Again</button>
                    </>
                ) : gameState === 'levelWin' ? (
                    <>
                        <p>You have defeated {opponent?.name}. Prepare for the next battle!</p>
                        <button onClick={onNextLevel}>Next Fight</button>
                    </>
                ) : (
                     <>
                        <div className="final-score-container">
                            <p>Final Score: <span>{score}</span></p>
                            <p>Max Combo: <span>x{maxCombo}</span></p>
                        </div>
                        <p>You were defeated by {opponent?.name}.</p>
                        <div className="modal-button-group">
                            <button onClick={onPlayAgain}>Play Again</button>
                            <button onClick={onMainMenu} style={{backgroundColor: '#222', borderColor: '#555'}}>Main Menu</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

const SettingsModal = memo(({ isOpen, onClose, onMainMenu }: { isOpen: boolean; onClose: () => void; onMainMenu: () => void; }) => {
    if (!isOpen) {
        return null;
    }
    return (
        <div className="screen-overlay">
            <div className="modal-dialog">
                <h2>Settings</h2>
                <div className="settings-modal-buttons">
                    <button onClick={onMainMenu}>
                        Return to Main Menu
                    </button>
                    <button onClick={onClose} style={{backgroundColor: '#222', borderColor: '#555'}}>
                        Resume Game
                    </button>
                </div>
            </div>
        </div>
    );
});

const CharacterSelectScreen = memo(({ onStartGame }: { onStartGame: (character: CharacterName) => void }) => (
    <div className="screen-overlay">
        <div className="modal-dialog character-select">
            <h2>Choose Your Fighter</h2>
            <p className="scroll-hint">Scroll or swipe to see all fighters</p>
            <div className="fighters-container">
                {(Object.keys(CHARACTER_DATA) as CharacterName[]).map(charKey => {
                    const char = CHARACTER_DATA[charKey];
                    return (
                       <button key={char.name} className={`fighter-card ${charKey}`} onClick={() => onStartGame(charKey)}>
                            <h3>{char.name}</h3>
                            <div className={`char-portrait ${charKey}`}></div>
                            <p>{char.description}</p>
                       </button>
                    )
                })}
            </div>
        </div>
    </div>
));

const StartScreen = memo(({ onStart }: { onStart: () => void; }) => (
    <div className="screen-overlay">
        <div className="modal-dialog">
            <h1>Kombat Krush</h1>
            <p>A Match-3 Fighting Game.</p>
            <p>Match pieces to damage your opponent. Defeat 5 opponents to win the tournament!</p>
            <button onClick={onStart}>Start Game</button>
        </div>
    </div>
));

const PlayerProfile = memo(({ selectedCharacter, playerBanter, playerIsHit }: { selectedCharacter: CharacterName | null, playerBanter: {key: number, text: string} | null, playerIsHit: boolean }) => (
    <div className="player-info-col">
        <div className="character-header">
            <div key={playerBanter?.key || 'player-banter-static'} className="player-banter-bubble" aria-live="polite">
                {playerBanter ? `"${playerBanter.text}"` : ''}
            </div>
            <div className={`player-portrait ${selectedCharacter || ''} ${playerIsHit ? 'taking-damage' : ''}`}></div>
        </div>
    </div>
));

const OpponentProfile = memo(({ opponent, opponentBanter, opponentIsHit, movesUntilAttack, shuffledLadder, currentLadderLevel }: { opponent: Opponent | null, opponentBanter: {key: number, text: string} | null, opponentIsHit: boolean, movesUntilAttack: number, shuffledLadder: Opponent[], currentLadderLevel: number }) => (
    <div className="opponent-info-col">
        {opponent && (
            <>
            <div className="character-header">
                <div key={opponentBanter?.key || 'opponent-banter-static'} className="opponent-banter-bubble" aria-live="polite">
                    {opponentBanter ? `"${opponentBanter.text}"` : ''}
                </div>
                <div className={`opponent-portrait ${opponent.pieceType || ''} ${opponentIsHit ? 'taking-damage' : ''}`}></div>
            </div>
            <div className="opponent-attack-timer">
                <div className="attack-timer-label">ATTACK IN</div>
                <div className="attack-timer-value">{movesUntilAttack}</div>
            </div>
            <div className="ladder-container">
                {shuffledLadder.map((opp, index) => (
                    <div
                        key={opp.pieceType}
                        className={`ladder-portrait ${opp.pieceType} ${
                            index < currentLadderLevel ? 'defeated' : ''
                        } ${index === currentLadderLevel ? 'current' : ''}`}
                    />
                ))}
            </div>
            </>
        )}
    </div>
));

type GameHeaderProps = {
    playerHealth: number;
    opponentHealth: number;
    opponentMaxHealth: number;
    selectedCharacter: CharacterName | null;
    opponentName?: string;
    onHintClick: () => void;
    isHintOnCooldown: boolean;
    hintCooldown: number;
    isProcessing: boolean;
    onMuteClick: () => void;
    onSettingsClick: () => void;
    isMuted: boolean;
    abilityState: AbilityState;
    onAbilityClick: () => void;
    abilityMeter: number;
};

const GameHeader = memo(({
    playerHealth, opponentHealth, opponentMaxHealth, selectedCharacter, opponentName,
    onHintClick, isHintOnCooldown, hintCooldown, isProcessing, onMuteClick, isMuted, onSettingsClick,
    abilityState, onAbilityClick, abilityMeter
}: GameHeaderProps) => (
    <header className="game-header">
        <div className="health-bars-container">
            <div className="health-bar-wrapper">
                <div className="health-bar-label">{selectedCharacter}</div>
                <div className="health-bar-outer">
                    <div className="health-bar-inner player" style={{width: `${(playerHealth / PLAYER_MAX_HEALTH) * 100}%`}}></div>
                </div>
            </div>
            <div className="health-bar-wrapper">
                <div className="health-bar-label">{opponentName}</div>
                <div className="health-bar-outer">
                    <div className="health-bar-inner opponent" style={{width: `${(opponentHealth / opponentMaxHealth) * 100}%`}}></div>
                </div>
            </div>
        </div>

        <div className="controls-and-meters">
            {selectedCharacter && (
                <div className={`ability-container ${selectedCharacter}`}>
                    <div className="ability-tooltip" aria-hidden="true">
                         <strong>{CHARACTER_DATA[selectedCharacter].name} Ability:</strong>
                         <br />
                         {CHARACTER_DATA[selectedCharacter].description}
                     </div>
                    <div className="ability-meter-outer">
                        <div className="ability-meter-inner" style={{width: `${(abilityMeter / ABILITY_METER_MAX) * 100}%`}}></div>
                    </div>
                    <button className={`ability-button ${abilityState}`} onClick={onAbilityClick} disabled={abilityState !== 'ready' || isProcessing}>
                        Ability
                    </button>
                </div>
            )}
            <div className="header-buttons">
                <button className="hint-button" onClick={onHintClick} disabled={isHintOnCooldown || isProcessing}>
                    {isHintOnCooldown ? `(${hintCooldown}s)` : 'Hint'}
                </button>
                <button className="mute-button" onClick={onMuteClick} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                    {isMuted ? 
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> :
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    }
                </button>
                <button className="settings-button" onClick={onSettingsClick} aria-label="Settings">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23-.09.49 0-.61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                </button>
            </div>
        </div>
    </header>
));

const GameBoard = memo(({ board, specialEffects, textPopups, showToasty, selectedPiece, autoHintIds, manualHintIds, keyboardCursor, abilityState, aimTarget, onPieceClick, onSwipe }: { board: Piece[][], specialEffects: SpecialEffect[], textPopups: TextPopup[], showToasty: boolean, selectedPiece: { row: number, col: number } | null, autoHintIds: number[] | null, manualHintIds: number[] | null, keyboardCursor: { row: number, col: number }, abilityState: AbilityState, aimTarget: { row: number, col: number } | null, onPieceClick: (row: number, col: number) => void, onSwipe: (row: number, col: number, direction: 'up' | 'down' | 'left' | 'right') => void }) => (
    <div className="game-board-container">
        <div className="game-board">
            {specialEffects.map(effect => (
                <div key={effect.id} className={`special-effect ${
                    effect.type === 'row' ? 'effect-row' : 
                    effect.type === 'col' ? 'effect-col' :
                    effect.type === 'lightning' ? 'effect-lightning' :
                    effect.type === 'dragon' ? 'effect-dragon' :
                    effect.type === 'acid_spit' ? 'effect-acid-spit' :
                    effect.type === 'kano_ball' ? 'effect-kano_ball' :
                    effect.type === 'dragon_fire' ? 'effect-dragon-fire' :
                    effect.type === 'netherrealm_flame' ? 'effect-netherrealm-flame' :
                    effect.type === 'ice_shatter' ? 'effect-ice-shatter' : ''
                }`} style={{ top: `${effect.row * 12.5}%`, left: `${effect.col * 12.5}%` }}>
                    {effect.type === 'ice_shatter' && Array.from({ length: 6 }).map((_, i) => <i key={i} />)}
                </div>
            ))}
        </div>
        {board.flat().map((piece) => (
            <GamePiece
                key={piece.id}
                piece={piece}
                onClick={() => onPieceClick(piece.row, piece.col)}
                onSwipe={(direction) => onSwipe(piece.row, piece.col, direction)}
                isSelected={selectedPiece?.row === piece.row && selectedPiece?.col === piece.col}
                isHinted={autoHintIds?.includes(piece.id) ?? false}
                isManualHinted={manualHintIds?.includes(piece.id) ?? false}
                isCursorOn={keyboardCursor.row === piece.row && keyboardCursor.col === piece.col}
                isAiming={abilityState === 'aiming'}
                isAimTarget={aimTarget?.row === piece.row && aimTarget?.col === piece.col}
            />
        ))}
        {textPopups.map(popup => (
            <div 
                key={popup.id} 
                className={popup.className}
                style={{
                    top: `${popup.row * 12.5 + 6.25}%`,
                    left: `${popup.col * 12.5 + 6.25}%`,
                }}
            >
                {popup.text}
            </div>
        ))}
        {showToasty && (
            <div className="toasty-container">
                <div className="toasty-guy-head">TOASTY!</div>
            </div>
        )}
    </div>
));

const MobileHeader = memo(({ selectedCharacter, playerBanter, playerIsHit, opponent, opponentBanter, opponentIsHit }: { selectedCharacter: CharacterName | null, playerBanter: {key: number, text: string} | null, playerIsHit: boolean, opponent: Opponent | null, opponentBanter: {key: number, text: string} | null, opponentIsHit: boolean }) => (
    <div className="mobile-header">
        <div className="mobile-profile-item">
            <div key={playerBanter?.key || 'player-banter-static'} className="player-banter-bubble" aria-live="polite">
                {playerBanter ? `"${playerBanter.text}"` : ''}
            </div>
            <div className={`player-portrait ${selectedCharacter || ''} ${playerIsHit ? 'taking-damage' : ''}`}></div>
        </div>
        {opponent && (
            <div className="mobile-profile-item">
                <div key={opponentBanter?.key || 'opponent-banter-static'} className="opponent-banter-bubble" aria-live="polite">
                    {opponentBanter ? `"${opponentBanter.text}"` : ''}
                </div>
                <div className={`opponent-portrait ${opponent.pieceType || ''} ${opponentIsHit ? 'taking-damage' : ''}`}></div>
            </div>
        )}
    </div>
));

const MobileFooter = memo(({ opponent, movesUntilAttack, shuffledLadder, currentLadderLevel }: { opponent: Opponent | null, movesUntilAttack: number, shuffledLadder: Opponent[], currentLadderLevel: number }) => (
    <div className="mobile-footer">
        {opponent && (
            <>
                <div className="opponent-attack-timer">
                    <div className="attack-timer-label">ATTACK IN</div>
                    <div className="attack-timer-value">{movesUntilAttack}</div>
                </div>
                <div className="ladder-container">
                    {shuffledLadder.map((opp, index) => (
                        <div
                            key={opp.pieceType}
                            className={`ladder-portrait ${opp.pieceType} ${
                                index < currentLadderLevel ? 'defeated' : ''
                            } ${index === currentLadderLevel ? 'current' : ''}`}
                        />
                    ))}
                </div>
            </>
        )}
    </div>
));

// --- BUNDLED FROM: src/App.tsx ---

const App = () => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const { 
        board, gameState, playerHealth, opponentHealth, currentLadderLevel, opponent, shuffledLadder,
        movesUntilAttack, opponentBanter, playerIsHit, opponentIsHit, selectedPiece, isProcessing,
        combo, textPopups, autoHintIds, manualHintIds, isHintOnCooldown, hintCooldown, comboKey,
        isMuted, showToasty, specialEffects, keyboardCursor, selectedCharacter, abilityMeter,
        abilityState, aimTarget, playerBanter, maxCombo,
        score, showSettingsModal
    } = state;

    const pieceIdCounter = useRef(0);
    const popupIdCounter = useRef(0);
    const hintTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
    const banterCooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const playSoundMuted = useCallback((...args: Parameters<typeof playSound>) => {
        if (!isMuted) {
            playSound(...args);
        }
    }, [isMuted]);

    const generatePlayerBanter = useCallback((event: 'gameStart' | 'highCombo' | 'ability' | 'gameOverWin' | 'gameOverLoss' | 'hit') => {
        if (banterCooldownTimer.current || !selectedCharacter) return;
        dispatch({ type: 'PLAYER_BANTER', payload: { event, character: selectedCharacter, cooldownRef: banterCooldownTimer } });
    }, [selectedCharacter]);

    useEffect(() => {
        const handleKeyDown = () => {
            document.body.classList.add('using-keyboard');
        };
        const handlePointerDown = () => {
            document.body.classList.remove('using-keyboard');
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('touchstart', handlePointerDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('touchstart', handlePointerDown);
        };
    }, []);

    useEffect(() => {
        if (gameState === 'playing' && selectedCharacter) {
             generatePlayerBanter("gameStart");
        } else if (gameState === 'gameOver') {
            generatePlayerBanter('gameOverLoss');
        } else if (gameState === 'ladderComplete') {
            generatePlayerBanter('gameOverWin');
        }
    }, [gameState, selectedCharacter, generatePlayerBanter]);

    useEffect(() => {
        if (combo >= 6 && combo > maxCombo) {
            generatePlayerBanter("highCombo");
        }
    }, [combo, maxCombo, generatePlayerBanter]);

    useEffect(() => {
        document.body.className = `gamestate-${gameState}`;
        if (selectedCharacter) {
            document.body.classList.add(`theme-${selectedCharacter}`);
        }
        if (gameState === 'gameOver') {
            playSoundMuted('gameOver');
        }
    }, [gameState, selectedCharacter, playSoundMuted]);

    useEffect(() => {
        if (playerIsHit) {
            playSoundMuted('playerHit');
            generatePlayerBanter('hit');
            document.body.classList.add('screen-shake');
            const timer = setTimeout(() => {
                document.body.classList.remove('screen-shake');
                dispatch({ type: 'SET_PLAYER_IS_HIT', payload: false });
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [playerIsHit, playSoundMuted, generatePlayerBanter]);

    useEffect(() => {
        if (opponentIsHit) {
            playSoundMuted('opponentHit');
            dispatch({ type: 'OPPONENT_BANTER', payload: { event: 'hit' } });
            const timer = setTimeout(() => {
                dispatch({ type: 'SET_OPPONENT_IS_HIT', payload: false });
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [opponentIsHit, playSoundMuted]);


    useEffect(() => {
        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        if (gameState === 'playing' && !isProcessing && !selectedPiece) {
            hintTimerId.current = setTimeout(() => {
                const move = findAPossibleMove(board);
                if (move) {
                    dispatch({ type: 'SET_AUTO_HINT', payload: [move[0].id, move[1].id] });
                }
            }, HINT_DELAY);
        }
        return () => {
            if (hintTimerId.current) clearTimeout(hintTimerId.current);
        };
    }, [board, isProcessing, gameState, selectedPiece]);

    useEffect(() => {
        if (hintCooldown > 0) {
            const timer = setTimeout(() => dispatch({ type: 'DECREMENT_HINT_COOLDOWN' }), 1000);
            return () => clearTimeout(timer);
        } else if (isHintOnCooldown) {
            dispatch({ type: 'SET_HINT_COOLDOWN', payload: { onCooldown: false, seconds: 0 }});
        }
    }, [hintCooldown, isHintOnCooldown]);
    
    const startGame = useCallback((character: CharacterName) => {
        const opponents = LADDER_DATA.filter(opp => opp.pieceType !== character);
        const newBoard = createInitialBoard(pieceIdCounter);
        dispatch({ type: 'START_GAME', payload: { character, ladder: opponents.slice(0, 5), board: newBoard } });
    }, []);
    
    const handleGoToCharacterSelect = () => {
        dispatch({ type: 'SET_GAME_STATE', payload: 'characterSelect' });
    }
    
    const handleGoToMainMenu = () => {
        dispatch({ type: 'RESET_STATE' });
    }

    const handleNextLevel = useCallback(() => {
        if (currentLadderLevel + 1 < shuffledLadder.length) {
            const newBoard = createInitialBoard(pieceIdCounter);
            dispatch({ type: 'NEXT_LEVEL', payload: { board: newBoard } });
        } else {
            dispatch({ type: 'SET_GAME_STATE', payload: 'ladderComplete' });
        }
    }, [currentLadderLevel, shuffledLadder]);

    const handlePieceClick = useCallback(async (row: number, col: number) => {
        if (isProcessing || gameState !== 'playing') return;

        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        dispatch({ type: 'CLEAR_HINTS' });

        if (abilityState === 'aiming') {
            await processGameLoop({ state, dispatch, playSoundMuted, pieceIdCounter, popupIdCounter, initialAction: { type: 'ability', row, col }});
            return;
        }
        
        if (selectedPiece) {
            const { row: selectedRow, col: selectedCol } = selectedPiece;
            
            if (row === selectedRow && col === selectedCol) {
                dispatch({ type: 'SELECT_PIECE', payload: null });
                return;
            }

            const distance = Math.abs(row - selectedRow) + Math.abs(col - selectedCol);

            if (distance === 1) { 
                dispatch({ type: 'SELECT_PIECE', payload: null });
                playSoundMuted('swap');
                
                await processGameLoop({ state, dispatch, playSoundMuted, pieceIdCounter, popupIdCounter, initialAction: { type: 'swap', from: selectedPiece, to: { row, col } }});

            } else {
                dispatch({ type: 'SELECT_PIECE', payload: { row, col }});
            }
        } else {
            dispatch({ type: 'SELECT_PIECE', payload: { row, col }});
        }
    }, [state, playSoundMuted]);

    const handleSwipe = useCallback((row: number, col: number, direction: 'up' | 'down' | 'left' | 'right') => {
        if (isProcessing || gameState !== 'playing' || selectedPiece || abilityState === 'aiming') return;

        let targetRow = row;
        let targetCol = col;

        if (direction === 'up') targetRow--;
        else if (direction === 'down') targetRow++;
        else if (direction === 'left') targetCol--;
        else if (direction === 'right') targetCol++;

        if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
            dispatch({ type: 'SELECT_PIECE', payload: { row, col }});
            setTimeout(() => handlePieceClick(targetRow, targetCol), 0);
        }
    }, [isProcessing, gameState, selectedPiece, handlePieceClick, abilityState]);

    const handleHintClick = () => {
        if (isProcessing || isHintOnCooldown || gameState !== 'playing') return;
        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        dispatch({ type: 'CLEAR_HINTS' });

        const move = findAPossibleMove(board);
        if (move) {
            dispatch({ type: 'SET_MANUAL_HINT', payload: [move[0].id, move[1].id] });
            dispatch({ type: 'SET_HINT_COOLDOWN', payload: { onCooldown: true, seconds: HINT_COOLDOWN_SECONDS } });
            
            setTimeout(() => {
                dispatch({ type: 'SET_MANUAL_HINT', payload: null });
            }, 5000);
        }
    };

    const handleAbilityClick = useCallback(async () => {
        if (abilityState !== 'ready' || isProcessing || !selectedCharacter) return;
        
        if (selectedCharacter === 'subzero' || selectedCharacter === 'scorpion') {
            dispatch({ type: 'SET_ABILITY_STATE', payload: 'aiming' });
            return;
        }

        generatePlayerBanter("ability");
        playSoundMuted('ability', { ability: selectedCharacter });
        await processGameLoop({ state, dispatch, playSoundMuted, pieceIdCounter, popupIdCounter, initialAction: { type: 'ability' } });
        
    }, [state, playSoundMuted, generatePlayerBanter]);


    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (gameState !== 'playing' || isProcessing) return;
    
        let newRow = keyboardCursor.row;
        let newCol = keyboardCursor.col;
    
        switch (e.key) {
            case 'ArrowUp': e.preventDefault(); newRow = (keyboardCursor.row - 1 + 8) % 8; break;
            case 'ArrowDown': e.preventDefault(); newRow = (keyboardCursor.row + 1) % 8; break;
            case 'ArrowLeft': e.preventDefault(); newCol = (keyboardCursor.col - 1 + 8) % 8; break;
            case 'ArrowRight': e.preventDefault(); newCol = (keyboardCursor.col + 1) % 8; break;
            case 'Enter':
            case ' ': // Space key
                e.preventDefault();
                handlePieceClick(keyboardCursor.row, keyboardCursor.col);
                return;
            case 'a': // Ability key
            case 'A': e.preventDefault(); handleAbilityClick(); break;
        }
    
        if (newRow !== keyboardCursor.row || newCol !== keyboardCursor.col) {
            dispatch({ type: 'SET_KEYBOARD_CURSOR', payload: { row: newRow, col: newCol } });
        }
    
    }, [gameState, isProcessing, keyboardCursor, handlePieceClick, handleAbilityClick]);
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    

    if (gameState === 'start') {
        return <StartScreen 
            onStart={() => dispatch({ type: 'SET_GAME_STATE', payload: 'characterSelect' })} 
        />;
    }

    if (gameState === 'characterSelect') {
        return <CharacterSelectScreen onStartGame={startGame} />;
    }

    return (
        <>
            <EndGameModal 
                gameState={gameState} 
                opponent={opponent} 
                maxCombo={maxCombo} 
                score={score}
                onPlayAgain={handleGoToCharacterSelect}
                onMainMenu={handleGoToMainMenu}
                onNextLevel={handleNextLevel} 
            />
            
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => dispatch({ type: 'TOGGLE_SETTINGS_MODAL' })}
                onMainMenu={handleGoToMainMenu}
            />

            <div className="game-ui-wrapper" aria-hidden={!['playing'].includes(gameState)}>
                <PlayerProfile
                    selectedCharacter={selectedCharacter}
                    playerBanter={playerBanter}
                    playerIsHit={playerIsHit}
                />

                <div className="game-container">
                    <h1 className="main-title">Kombat Krush</h1>
                    <MobileHeader
                        selectedCharacter={selectedCharacter}
                        playerBanter={playerBanter}
                        playerIsHit={playerIsHit}
                        opponent={opponent}
                        opponentBanter={opponentBanter}
                        opponentIsHit={opponentIsHit}
                    />
                    <GameHeader
                        playerHealth={playerHealth}
                        opponentHealth={opponentHealth}
                        opponentMaxHealth={opponent ? opponent.health : 100}
                        selectedCharacter={selectedCharacter}
                        opponentName={opponent?.name}
                        isHintOnCooldown={isHintOnCooldown}
                        hintCooldown={hintCooldown}
                        isProcessing={isProcessing}
                        isMuted={isMuted}
                        abilityState={abilityState}
                        abilityMeter={abilityMeter}
                        onHintClick={handleHintClick}
                        onMuteClick={() => dispatch({ type: 'TOGGLE_MUTE' })}
                        onSettingsClick={() => dispatch({ type: 'TOGGLE_SETTINGS_MODAL' })}
                        onAbilityClick={handleAbilityClick}
                    />

                    {combo >= 4 && (
                        <div key={comboKey} className="combo-display">
                            COMBO x{combo}
                        </div>
                    )}
                    
                    <GameBoard
                        board={board}
                        specialEffects={specialEffects}
                        textPopups={textPopups}
                        showToasty={showToasty}
                        selectedPiece={selectedPiece}
                        autoHintIds={autoHintIds}
                        manualHintIds={manualHintIds}
                        keyboardCursor={keyboardCursor}
                        abilityState={abilityState}
                        aimTarget={aimTarget}
                        onPieceClick={handlePieceClick}
                        onSwipe={handleSwipe}
                    />
                </div>

                <OpponentProfile
                    opponent={opponent}
                    opponentBanter={opponentBanter}
                    opponentIsHit={opponentIsHit}
                    movesUntilAttack={movesUntilAttack}
                    shuffledLadder={shuffledLadder}
                    currentLadderLevel={currentLadderLevel}
                />
                
                <MobileFooter 
                    opponent={opponent}
                    movesUntilAttack={movesUntilAttack}
                    shuffledLadder={shuffledLadder}
                    currentLadderLevel={currentLadderLevel}
                />
            </div>
        </>
    );
};

// --- RENDER ---
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
