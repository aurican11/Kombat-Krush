import React, { useState, useEffect, useCallback, CSSProperties, memo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- Game Constants ---
const GRID_SIZE = 8;
const PIECE_TYPES = ['scorpion', 'subzero', 'reptile', 'kano', 'raiden', 'liukang'];
const ANIMATION_DELAY = 150; // ms for each step in the game loop
const PLAYER_MAX_HEALTH = 100;
const HINT_DELAY = 5000; // ms before showing a hint
const HINT_COOLDOWN_SECONDS = 15;
const ABILITY_METER_MAX = 25; // Pieces to match to fill meter

// FIX: Explicitly type LADDER_DATA as Opponent[] to prevent TypeScript from inferring pieceType as a generic string.
const LADDER_DATA: Opponent[] = [
    { name: 'Reptile', health: 80, attack: 10, movesPerAttack: 5, pieceType: 'reptile' },
    { name: 'Kano', health: 95, attack: 12, movesPerAttack: 5, pieceType: 'kano' },
    { name: 'Liu Kang', health: 110, attack: 14, movesPerAttack: 4, pieceType: 'liukang' },
    { name: 'Scorpion', health: 130, attack: 20, movesPerAttack: 4, pieceType: 'scorpion' },
    { name: 'Sub-Zero', health: 130, attack: 20, movesPerAttack: 4, pieceType: 'subzero' },
    { name: 'Raiden', health: 120, attack: 18, movesPerAttack: 4, pieceType: 'raiden' },
];


// --- Type Definitions ---
type CharacterName = 'scorpion' | 'subzero' | 'raiden' | 'reptile' | 'kano' | 'liukang';
type PieceType = CharacterName | null;
type SpecialType = 'none' | 'row' | 'col' | 'dragon';
type GameState = 'start' | 'characterSelect' | 'playing' | 'gameOver' | 'levelWin' | 'ladderComplete';
type AbilityState = 'idle' | 'ready' | 'aiming';
type SpecialEffect = { id: number; type: SpecialType | 'lightning' | 'ice_shatter' | 'acid_spit' | 'kano_ball' | 'dragon_fire'; row: number; col: number; };

interface Piece {
  id: number;
  type: PieceType;
  row: number;
  col: number;
  state: 'idle' | 'matched' | 'frozen';
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


// --- SVG Icons for Pieces ---
const PieceIcons: { [key in CharacterName]: React.FC } = {
    scorpion: () => <svg viewBox="0 0 100 100"><g fill="var(--scorpion-color)" stroke="#1a1a1a" strokeWidth="5" strokeLinejoin="round"><path d="M 50 10 C 25 10, 10 30, 10 55 C 10 80, 25 90, 50 90 C 75 90, 90 80, 90 55 C 90 30, 75 10, 50 10 Z" /><path d="M 25 40 L 75 40 L 70 65 L 30 65 Z" fill="#1a1a1a" /><circle cx="40" cy="53" r="5" fill="#fff" /><circle cx="60" cy="53" r="5" fill="#fff" /></g></svg>,
    subzero: () => <svg viewBox="0 0 100 100"><g fill="var(--subzero-color)" stroke="#1a1a1a" strokeWidth="4" strokeLinejoin="round"><path d="M50 10 L55 35 L75 30 L60 50 L75 70 L55 65 L50 90 L45 65 L25 70 L40 50 L25 30 L45 35 Z" /></g></svg>,
    reptile: () => <svg viewBox="0 0 100 100"><g><circle cx="50" cy="50" r="40" fill="var(--reptile-color)" stroke="#1a1a1a" strokeWidth="5" /><path d="M50 20 C 60 35, 60 65, 50 80 C 40 65, 40 35, 50 20 Z" fill="#1a1a1a" /><circle cx="50" cy="50" r="30" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="6" /></g></svg>,
    kano: () => <svg viewBox="0 0 100 100"><g fill="var(--kano-color)" stroke="#1a1a1a" strokeWidth="5"><circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="25" fill="#fff" /><circle cx="50" cy="50" r="10" /><path d="M50 10 V 90 M10 50 H 90" stroke="#1a1a1a" strokeWidth="4" fill="none" opacity="0.6" strokeDasharray="5,5" /></g></svg>,
    raiden: () => <svg viewBox="0 0 100 100"><g stroke="#1a1a1a" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round"><path fill="var(--raiden-color)" d="M 75 55 C 85 55 90 45 90 35 C 90 25 85 15 75 15 C 70 15 65 10 55 10 C 45 10 40 15 35 15 C 25 15 15 25 15 35 C 15 45 25 55 35 55 Z" /><path fill="#FFFF00" d="M 60 45 L 45 65 L 55 65 L 40 85 L 65 60 L 55 60 Z" /></g></svg>,
    liukang: () => (
        <svg viewBox="0 0 100 100">
            <g>
                <path 
                    fill="var(--liukang-color)" 
                    stroke="#1a1a1a" 
                    strokeWidth="5"
                    strokeLinejoin="round"
                    d="M50 95 C 40 75, 20 70, 30 40 C 35 20, 45 15, 50 10 C 55 15, 65 20, 70 40 C 80 70, 60 75, 50 95 Z"
                />
            </g>
        </svg>
    ),
};

const CHARACTER_DATA: { [key in CharacterName]: { name: string, description: string } } = {
    scorpion: { name: 'Scorpion', description: 'Ability: Get Over Here! - Pull any piece to an adjacent spot.'},
    subzero: { name: 'Sub-Zero', description: 'Ability: Ice Ball - Freeze and destroy a 4-piece cluster.' },
    raiden: { name: 'Raiden', description: 'Ability: Lightning Strike - Clear a random 2x2 area.' },
    reptile: { name: 'Reptile', description: 'Ability: Acid Spit - Clear a random column.' },
    kano: { name: 'Kano', description: 'Ability: Kano Ball - Clear a random row.' },
    liukang: { name: 'Liu Kang', description: 'Ability: Dragon Fire - Convert a random piece type to your own.' },
};

// --- Local Banter Data ---
const LOCAL_BANTER: { [key in CharacterName | 'opponent']: { [event: string]: string[] } } = {
    scorpion: {
        gameStart: ["Vengeance will be mine!", "The Shirai Ryu do not know defeat!", "You will taste the fires of the Netherrealm!"],
        highCombo: ["Impressive!", "Feel the sting of my chain!", "Now you feel my wrath!"],
        ability: ["GET OVER HERE!", "Come here!", "Nowhere to run!"],
        gameOverWin: ["A flawless victory.", "The Shirai Ryu are avenged."],
        gameOverLoss: ["This is not over!", "I will have my revenge."],
    },
    subzero: {
        gameStart: ["This fight will be your last.", "For the Lin Kuei!", "You will feel the chill of death."],
        highCombo: ["A cold finish.", "You lack discipline.", "Perfectly executed."],
        ability: ["Feel the freeze!", "Ice ball!", "You are frozen in your tracks."],
        gameOverWin: ["Justice is served.", "The Lin Kuei are victorious."],
        gameOverLoss: ["I underestimated you.", "This battle is not the war."],
    },
    raiden: {
        gameStart: ["The fate of Earthrealm is at stake.", "I must consult with the Elder Gods.", "For Earthrealm!"],
        highCombo: ["By the Elder Gods!", "A shocking display!", "The thunder claps for you."],
        ability: ["Thunder take you!", "Lightning strike!", "Feel the power of the storm!"],
        gameOverWin: ["Earthrealm is safe.", "A worthy victory."],
        gameOverLoss: ["The Elder Gods are displeased.", "This is but a setback."],
    },
    reptile: {
        gameStart: ["I will find you...", "For Shao Kahn!", "Now you face a true warrior."],
        highCombo: ["Excellent!", "You cannot hide.", "Clever..."],
        ability: ["Acid spit!", "Feel the sting!", "Now you dissolve!"],
        gameOverWin: ["My clan is supreme.", "Another victory."],
        gameOverLoss: ["You are... formidable.", "This is not the end."],
    },
    kano: {
        gameStart: ["Let's have a little fun, eh?", "Time to get paid.", "You're lookin' at the Black Dragon's finest."],
        highCombo: ["Beauty!", "That's how it's done!", "Too easy, mate."],
        ability: ["Here I come!", "Kano Ball!", "Outta the way!"],
        gameOverWin: ["All too easy.", "Never mess with the Black Dragon."],
        gameOverLoss: ["You got lucky, scum.", "I'll be back for ya."],
    },
    liukang: {
        gameStart: ["The Shaolin will be victorious.", "For the honor of the temple.", "Show me what you can do."],
        highCombo: ["Well done.", "A display of skill.", "The dragon is pleased."],
        ability: ["Dragon's fire!", "Feel the heat!", "By the spirits of the dragon!"],
        gameOverWin: ["The tournament is won.", "Honor is satisfied."],
        gameOverLoss: ["A worthy opponent.", "I must train harder."],
    },
    opponent: {
        taunt: ["You are weak!", "Is that all you've got?", "Pathetic!", "My turn!", "You will fail."],
        onDefeat: ["Impossible...", "I have been bested.", "This cannot be."],
    }
};


// --- Audio Engine ---
let audioContext: AudioContext | null = null;
const playSound = (type: 'swap' | 'match' | 'specialCreate' | 'specialActivate' | 'gameOver' | 'toasty' | 'ability' | 'playerHit' | 'opponentHit', options?: { combo?: number, ability?: CharacterName }) => {
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

// --- Move Detection ---
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


// --- React Components ---
const GamePiece = memo(({ piece, onClick, isSelected, isHinted, isManualHinted, isCursorOn, onSwipe, isAiming, isAimTarget, swipeSensitivity }: { piece: Piece; onClick: () => void; isSelected: boolean, isHinted: boolean, isManualHinted: boolean, isCursorOn: boolean; onSwipe: (direction: 'up' | 'down' | 'left' | 'right') => void; isAiming: boolean; isAimTarget: boolean; swipeSensitivity: number; }) => {
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    
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
        
        const threshold = swipeSensitivity;
        if (Math.abs(diffX) > threshold || Math.abs(diffY) > threshold) { // Threshold for swipe
            if (Math.abs(diffX) > Math.abs(diffY)) {
                onSwipe(diffX > 0 ? 'right' : 'left');
            } else {
                onSwipe(diffY > 0 ? 'down' : 'up');
            }
        } else {
            onClick(); // It's a tap
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

const App = () => {
    const [board, setBoard] = useState<Piece[][]>([]);
    const [gameState, setGameState] = useState<GameState>('start');
    const [playerHealth, setPlayerHealth] = useState(PLAYER_MAX_HEALTH);
    const [opponentHealth, setOpponentHealth] = useState(100);
    const [currentLadderLevel, setCurrentLadderLevel] = useState(0);
    const [opponent, setOpponent] = useState<Opponent | null>(null);
    const [shuffledLadder, setShuffledLadder] = useState<Opponent[]>([]);
    const [movesUntilAttack, setMovesUntilAttack] = useState(5);
    const [opponentBanter, setOpponentBanter] = useState<{key: number, text: string} | null>(null);
    const [playerIsHit, setPlayerIsHit] = useState(false);
    const [opponentIsHit, setOpponentIsHit] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [combo, setCombo] = useState(1);
    const [maxCombo, setMaxCombo] = useState(1);
    const [textPopups, setTextPopups] = useState<TextPopup[]>([]);
    const [autoHintIds, setAutoHintIds] = useState<number[] | null>(null);
    const [manualHintIds, setManualHintIds] = useState<number[] | null>(null);
    const [isHintOnCooldown, setIsHintOnCooldown] = useState(false);
    const [hintCooldown, setHintCooldown] = useState(0);
    const [comboKey, setComboKey] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showToasty, setShowToasty] = useState(false);
    const [specialEffects, setSpecialEffects] = useState<SpecialEffect[]>([]);
    const [keyboardCursor, setKeyboardCursor] = useState({ row: 0, col: 0 });
    const [selectedCharacter, setSelectedCharacter] = useState<CharacterName | null>(null);
    const [abilityMeter, setAbilityMeter] = useState(0);
    const [abilityState, setAbilityState] = useState<AbilityState>('idle');
    const [aimTarget, setAimTarget] = useState<{ row: number; col: number } | null>(null);
    const [playerBanter, setPlayerBanter] = useState<{key: number, text: string} | null>(null);
    const [swipeSensitivity, setSwipeSensitivity] = useState(() => Number(localStorage.getItem('kombatKrushSwipeSensitivity')) || 20);

    const pieceIdCounter = useRef(0);
    const popupIdCounter = useRef(0);
    const hintTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
    const banterCooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const playSoundMuted = useCallback((...args: Parameters<typeof playSound>) => {
        if (!isMuted) {
            playSound(...args);
        }
    }, [isMuted]);

    const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setSwipeSensitivity(value);
        localStorage.setItem('kombatKrushSwipeSensitivity', String(value));
    };

    const generatePlayerBanter = useCallback((event: 'gameStart' | 'highCombo' | 'ability' | 'gameOverWin' | 'gameOverLoss') => {
        if (banterCooldownTimer.current || !selectedCharacter) return;

        banterCooldownTimer.current = setTimeout(() => {
            if (banterCooldownTimer.current) {
                clearTimeout(banterCooldownTimer.current);
                banterCooldownTimer.current = null;
            }
        }, 8000); // 8 second cooldown

        const banterOptions = LOCAL_BANTER[selectedCharacter]?.[event];
        if (banterOptions && banterOptions.length > 0) {
            const banterText = banterOptions[Math.floor(Math.random() * banterOptions.length)];
            setPlayerBanter({ key: Date.now(), text: banterText });
        }
    }, [selectedCharacter]);

    const generateOpponentBanter = useCallback((event: 'taunt' | 'onDefeat') => {
        const banterOptions = LOCAL_BANTER.opponent[event];
        if (banterOptions && banterOptions.length > 0) {
            const banterText = banterOptions[Math.floor(Math.random() * banterOptions.length)];
            setOpponentBanter({ key: Date.now(), text: banterText });
        }
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
    }, [gameState]);

    useEffect(() => {
        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        if (gameState === 'playing' && !isProcessing) {
            hintTimerId.current = setTimeout(() => {
                const move = findAPossibleMove(board);
                if (move) {
                    setAutoHintIds([move[0].id, move[1].id]);
                }
            }, HINT_DELAY);
        }
        return () => {
            if (hintTimerId.current) clearTimeout(hintTimerId.current);
        };
    }, [board, isProcessing, gameState]);

    useEffect(() => {
        if (hintCooldown > 0) {
            const timer = setTimeout(() => setHintCooldown(hintCooldown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (isHintOnCooldown) {
            setIsHintOnCooldown(false);
        }
    }, [hintCooldown, isHintOnCooldown]);

    useEffect(() => {
        if (abilityMeter >= ABILITY_METER_MAX && abilityState === 'idle') {
            setAbilityState('ready');
        }
    }, [abilityMeter, abilityState]);

    const startGame = useCallback((character: CharacterName) => {
        setSelectedCharacter(character);

        // Create and shuffle the ladder
        const opponents = LADDER_DATA.filter(opp => opp.pieceType !== character);
        // Fisher-Yates shuffle
        for (let i = opponents.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opponents[i], opponents[j]] = [opponents[j], opponents[i]];
        }
        setShuffledLadder(opponents);

        setCurrentLadderLevel(0);
        const firstOpponent = opponents[0];
        setOpponent(firstOpponent);
        setPlayerHealth(PLAYER_MAX_HEALTH);
        setOpponentHealth(firstOpponent.health);
        setMovesUntilAttack(firstOpponent.movesPerAttack);
        
        setBoard(createInitialBoard(pieceIdCounter));
        setCombo(1);
        setMaxCombo(1);
        setSelectedPiece(null);
        setIsProcessing(false);
        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        setAutoHintIds(null);
        setManualHintIds(null);
        setIsHintOnCooldown(false);
        setHintCooldown(0);
        setKeyboardCursor({row: 0, col: 0});
        setAbilityMeter(0);
        setAbilityState('idle');
        setAimTarget(null);
        setGameState('playing');
    }, []);
    
    const handleRestartClick = () => {
        setGameState('characterSelect');
    }
    
    const handleNextLevel = useCallback(() => {
        const nextLevel = currentLadderLevel + 1;
        if (nextLevel < shuffledLadder.length) {
            const nextOpponent = shuffledLadder[nextLevel];
            setCurrentLadderLevel(nextLevel);
            setOpponent(nextOpponent);
            setPlayerHealth(PLAYER_MAX_HEALTH);
            setOpponentHealth(nextOpponent.health);
            setMovesUntilAttack(nextOpponent.movesPerAttack);
            setBoard(createInitialBoard(pieceIdCounter));
            setGameState('playing');
        } else {
            setGameState('ladderComplete');
        }
    }, [currentLadderLevel, shuffledLadder]);

    const handleMatchClearingAndSpecials = (
        boardCopy: Piece[][], 
        matches: Match[],
        swapLocation: { row: number, col: number } | null
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
                playSoundMuted('specialActivate');
                specialDamage += 15;
                
                const effectId = Date.now() + Math.random();
                setSpecialEffects(prev => [...prev, { id: effectId, type: piece.special, row: piece.row, col: piece.col }]);
                setTimeout(() => setSpecialEffects(prev => prev.filter(e => e.id !== effectId)), 500);

                document.body.classList.add('screen-shake');
                setTimeout(() => document.body.classList.remove('screen-shake'), 400);

                if (piece.special === 'row') {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        const p = boardCopy[piece.row][c];
                        if (!allPiecesToClear.has(p)) piecesToProcessForSpecials.add(p);
                    }
                } else if (piece.special === 'col') {
                    for (let r = 0; r < GRID_SIZE; r++) {
                        const p = boardCopy[r][piece.col];
                        if (!allPiecesToClear.has(p)) piecesToProcessForSpecials.add(p);
                    }
                } else if (piece.special === 'dragon') {
                     const targetType = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)] as CharacterName;
                     boardCopy.flat().forEach(p => {
                        if (p.type === targetType && !allPiecesToClear.has(p)) {
                             piecesToProcessForSpecials.add(p);
                        }
                    });
                }
            }
        }
        
        let specialToCreate: { pieceToTransform: Piece, newSpecial: SpecialType } | null = null;
        if (swapLocation) {
            const potentialMatch = matches.find(m => m.pieces.some(p => p.row === swapLocation.row && p.col === swapLocation.col && !activatedSpecials.has(p)));
            if (potentialMatch) {
                const pieceAtSwap = boardCopy[swapLocation.row][swapLocation.col];
                if (potentialMatch.length === 5) specialToCreate = { pieceToTransform: pieceAtSwap, newSpecial: 'dragon' };
                else if (potentialMatch.length === 4) specialToCreate = { pieceToTransform: pieceAtSwap, newSpecial: potentialMatch.type === 'row' ? 'row' : 'col' };
            }
        }
        if (!specialToCreate) {
            for (const match of matches) {
                if (match.pieces.some(p => activatedSpecials.has(p))) continue;
                if (match.length >= 5) { specialToCreate = { pieceToTransform: match.pieces[0], newSpecial: 'dragon' }; break; }
                if (match.length === 4) { specialToCreate = { pieceToTransform: match.pieces[0], newSpecial: match.type === 'row' ? 'row' : 'col' }; break; }
            }
        }
        return { allPiecesToClear, specialToCreate, specialDamage };
    }

    const applyGravity = (board: Piece[][]) => {
        const boardCopy = board.map(row => [...row]);
        for (let c = 0; c < GRID_SIZE; c++) {
            let emptyRow = GRID_SIZE - 1;
            for (let r = GRID_SIZE - 1; r >= 0; r--) {
                if (boardCopy[r][c].type !== null) {
                    const piece = boardCopy[r][c];
                    if (emptyRow !== r) {
                        boardCopy[emptyRow][c] = { ...piece, row: emptyRow };
                        boardCopy[r][c] = createPiece(r, c, null, pieceIdCounter, 'none');
                    }
                    emptyRow--;
                }
            }
        }
        return boardCopy;
    }

    const refillBoard = (board: Piece[][]) => {
        const boardCopy = board.map(row => [...row]);
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (boardCopy[r][c].type === null) {
                    const newType = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)] as PieceType;
                    boardCopy[r][c] = createPiece(r, c, newType, pieceIdCounter);
                }
            }
        }
        return boardCopy;
    }

    const processGameLoop = useCallback(async (
        currentBoard: Piece[][],
        swapLocation: { row: number, col: number } | null = null
    ): Promise<boolean> => { // Returns true if a match was made
        let boardCopy: Piece[][] = currentBoard.map(row => row.map(p => ({...p, state: 'idle' as 'idle'})));
        let changedInLoop = true;
        let comboCounter = combo;
        let currentSwapLocation = swapLocation;
        let anyMatchesOccurred = false;
        
        while (changedInLoop) {
            changedInLoop = false;
            let matches = findMatches(boardCopy);
    
            if (matches.length > 0) {
                changedInLoop = true;
                anyMatchesOccurred = true;
                
                if (comboCounter > combo) {
                    setComboKey(k => k + 1);
                }
                setCombo(comboCounter);
                if (comboCounter >= 4) {
                    playSoundMuted('toasty');
                    setShowToasty(true);
                    setTimeout(() => setShowToasty(false), 1500);
                }
                setMaxCombo(prevMax => Math.max(prevMax, comboCounter));
                playSoundMuted('match', { combo: comboCounter });

                const { allPiecesToClear, specialToCreate, specialDamage } = handleMatchClearingAndSpecials(boardCopy, matches, currentSwapLocation);
                
                if (specialToCreate) {
                    playSoundMuted('specialCreate');
                }

                if (selectedCharacter) {
                    const charPieces = [...allPiecesToClear].filter(p => p.type === selectedCharacter).length;
                    setAbilityMeter(prev => Math.min(prev + charPieces, ABILITY_METER_MAX));
                }
                
                const baseDamage = [...allPiecesToClear].reduce((acc, piece) => {
                    return acc + (piece.type === selectedCharacter ? 1.5 : 1);
                }, 0);

                const totalDamage = Math.round((baseDamage + specialDamage) * comboCounter);

                const newOpponentHealth = Math.max(0, opponentHealth - totalDamage);
                setOpponentHealth(newOpponentHealth);
                setOpponentIsHit(true);
                setTimeout(() => setOpponentIsHit(false), 400);
                playSoundMuted('opponentHit');


                const popupLocation = currentSwapLocation || { row: matches[0].pieces[0].row, col: matches[0].pieces[0].col };
                setTextPopups(popups => [...popups, { id: popupIdCounter.current++, text: `${totalDamage} DMG! ${comboCounter > 1 ? `(x${comboCounter})` : ''}`, row: popupLocation.row, col: popupLocation.col, className: 'damage-popup' }]);
                setTimeout(() => setTextPopups(popups => popups.slice(1)), 1500);

                const animationBoard = boardCopy.map(row => row.map(p => allPiecesToClear.has(p) ? {...p, state: 'matched' as 'matched'} : p));
                setBoard(animationBoard);
                await sleep(ANIMATION_DELAY * 3);

                let boardWithoutMatched = boardCopy.map(row => row.map((p): Piece => {
                    if (specialToCreate && p.id === specialToCreate.pieceToTransform.id) {
                        const originalPiece = boardCopy.flat().find(op => op.id === p.id);
                        return {...p, type: originalPiece?.type ?? null, special: specialToCreate.newSpecial, state: 'idle'};
                    }
                    return allPiecesToClear.has(p) ? createPiece(p.row, p.col, null, pieceIdCounter, 'none') : p;
                }));
                
                let gravityBoard = applyGravity(boardWithoutMatched);
                boardCopy = refillBoard(gravityBoard);

                setBoard(boardCopy);
                await sleep(ANIMATION_DELAY * 2);
                
                comboCounter++;
                currentSwapLocation = null;
            }
        }
    
        setCombo(1);
        setBoard(boardCopy);
        
        if (opponentHealth <= 0 && gameState === 'playing') {
             generateOpponentBanter('onDefeat');
             await sleep(1500);
             if (currentLadderLevel >= shuffledLadder.length - 1) {
                 setGameState('ladderComplete');
             } else {
                 setGameState('levelWin');
             }
        } else if (!hasPossibleMoves(boardCopy) && gameState === 'playing') {
            // No moves left, reshuffle board
            await sleep(500);
            setBoard(createInitialBoard(pieceIdCounter));
        }

        if (!anyMatchesOccurred) {
            setIsProcessing(false);
        }
        return anyMatchesOccurred;
    }, [setBoard, setCombo, setMaxCombo, playSoundMuted, combo, selectedCharacter, gameState, opponentHealth, currentLadderLevel, shuffledLadder, generateOpponentBanter]);

    const handleOpponentTurn = useCallback(() => {
        if (isProcessing || gameState !== 'playing' || !opponent) return;

        const newMovesCounter = movesUntilAttack - 1;
        setMovesUntilAttack(newMovesCounter);

        if (newMovesCounter <= 0) {
            setTimeout(() => { // Delay attack for visual clarity
                generateOpponentBanter('taunt');
                playSoundMuted('playerHit');
                document.body.classList.add('screen-shake');
                setTimeout(() => document.body.classList.remove('screen-shake'), 400);

                const newPlayerHealth = Math.max(0, playerHealth - opponent.attack);
                setPlayerHealth(newPlayerHealth);
                setPlayerIsHit(true);
                setTimeout(() => setPlayerIsHit(false), 400);
                setMovesUntilAttack(opponent.movesPerAttack);

                if (newPlayerHealth <= 0) {
                    playSoundMuted('gameOver');
                    setGameState('gameOver');
                }
                setIsProcessing(false);

            }, 500);

        } else {
            setIsProcessing(false);
        }
    }, [isProcessing, gameState, opponent, movesUntilAttack, playerHealth, playSoundMuted, generateOpponentBanter]);

    const handleAbilityClick = useCallback(async () => {
        if (abilityState !== 'ready' || isProcessing || !selectedCharacter) return;

        // Aiming abilities are handled differently, they just set the state and don't consume the ability yet.
        if (selectedCharacter === 'subzero' || selectedCharacter === 'scorpion') {
            setAbilityState('aiming');
            return;
        }

        // For non-aiming abilities:
        generatePlayerBanter("ability");
        playSoundMuted('ability', { ability: selectedCharacter });
        setIsProcessing(true);
        setAbilityMeter(0);
        setAbilityState('idle');

        let boardCopy = board.map(r => [...r]);
        let damage = 0;
        
        if (selectedCharacter === 'raiden') {
            const startR = Math.floor(Math.random() * (GRID_SIZE - 1));
            const startC = Math.floor(Math.random() * (GRID_SIZE - 1));
            const effectId = Date.now();
            setSpecialEffects(prev => [...prev, { id: effectId, type: 'lightning', row: startR, col: startC }]);
            setTimeout(() => setSpecialEffects(prev => prev.filter(e => e.id !== effectId)), 600);
            await sleep(ANIMATION_DELAY);
            for (let r_offset = 0; r_offset < 2; r_offset++) {
                for (let c_offset = 0; c_offset < 2; c_offset++) {
                    const r = startR + r_offset;
                    const c = startC + c_offset;
                    boardCopy[r][c] = { ...boardCopy[r][c], state: 'matched' };
                }
            }
            setBoard(boardCopy);
            await sleep(ANIMATION_DELAY * 3);
            for (let r_offset = 0; r_offset < 2; r_offset++) {
                for (let c_offset = 0; c_offset < 2; c_offset++) {
                    boardCopy[startR + r_offset][startC + c_offset] = createPiece(startR + r_offset, startC + c_offset, null, pieceIdCounter, 'none');
                }
            }
            damage = 20;

        } else if (selectedCharacter === 'reptile') {
            const targetCol = Math.floor(Math.random() * GRID_SIZE);
            const effectId = Date.now();
            setSpecialEffects(prev => [...prev, { id: effectId, type: 'acid_spit', row: 0, col: targetCol }]);
            setTimeout(() => setSpecialEffects(prev => prev.filter(e => e.id !== effectId)), 800);
            await sleep(ANIMATION_DELAY);
            for (let r = 0; r < GRID_SIZE; r++) { boardCopy[r][targetCol].state = 'matched'; }
            setBoard(boardCopy);
            await sleep(ANIMATION_DELAY * 3);
            for (let r = 0; r < GRID_SIZE; r++) { boardCopy[r][targetCol] = createPiece(r, targetCol, null, pieceIdCounter, 'none'); }
            damage = 20;

        } else if (selectedCharacter === 'kano') {
            const targetRow = Math.floor(Math.random() * GRID_SIZE);
            const effectId = Date.now();
            setSpecialEffects(prev => [...prev, { id: effectId, type: 'kano_ball', row: targetRow, col: 0 }]);
            setTimeout(() => setSpecialEffects(prev => prev.filter(e => e.id !== effectId)), 800);
            await sleep(ANIMATION_DELAY);
            for (let c = 0; c < GRID_SIZE; c++) { boardCopy[targetRow][c].state = 'matched'; }
            setBoard(boardCopy);
            await sleep(ANIMATION_DELAY * 3);
            for (let c = 0; c < GRID_SIZE; c++) { boardCopy[targetRow][c] = createPiece(targetRow, c, null, pieceIdCounter, 'none'); }
            damage = 20;

        } else if (selectedCharacter === 'liukang') {
            const pieceTypesOnBoard = [...new Set(boardCopy.flat().map(p => p.type).filter((t): t is CharacterName => !!(t && t !== selectedCharacter)))];
            if (pieceTypesOnBoard.length > 0) {
                const typeToConvert = pieceTypesOnBoard[Math.floor(Math.random() * pieceTypesOnBoard.length)];
                boardCopy.forEach((row, r) => {
                    row.forEach((piece, c) => {
                        if (piece.type === typeToConvert) {
                            boardCopy[r][c] = { ...piece, type: selectedCharacter };
                            const effectId = Date.now() + Math.random();
                            setSpecialEffects(prev => [...prev, { id: effectId, type: 'dragon_fire', row: r, col: c }]);
                            setTimeout(() => setSpecialEffects(prev => prev.filter(e => e.id !== effectId)), 500);
                        }
                    });
                });
            }
            damage = 15;
            setBoard(boardCopy);
            await sleep(ANIMATION_DELAY * 3);
        }
        
        setOpponentHealth(h => Math.max(0, h - damage));
        await processGameLoop(boardCopy);
        handleOpponentTurn();

    }, [abilityState, isProcessing, selectedCharacter, board, processGameLoop, generatePlayerBanter, playSoundMuted, opponentHealth, handleOpponentTurn]);

    const handlePieceClick = useCallback(async (row: number, col: number) => {
        if (isProcessing || gameState !== 'playing') return;

        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        setAutoHintIds(null);
        setManualHintIds(null);

        if (abilityState === 'aiming' && selectedCharacter) {
            setIsProcessing(true);

            if (selectedCharacter === 'subzero') {
                setAbilityMeter(0);
                setAbilityState('idle');
                
                let boardCopy = board.map(r => [...r]);
                const targets = [{r: row, c: col}];
                const neighbors = [
                    {r: row - 1, c: col}, {r: row + 1, c: col},
                    {r: row, c: col - 1}, {r: row, c: col + 1}
                ].filter(n => n.r >= 0 && n.r < GRID_SIZE && n.c >= 0 && n.c < GRID_SIZE);
                
                while(targets.length < 4 && neighbors.length > 0) {
                    const randIndex = Math.floor(Math.random() * neighbors.length);
                    targets.push(neighbors.splice(randIndex, 1)[0]);
                }

                targets.forEach(t => {
                    const effectId = Date.now() + Math.random();
                    setSpecialEffects(prev => [...prev, { id: effectId, type: 'ice_shatter', row: t.r, col: t.c }]);
                    setTimeout(() => setSpecialEffects(prev => prev.filter(e => e.id !== effectId)), 800);
                });

                targets.forEach(t => boardCopy[t.r][t.c].state = 'frozen');
                setBoard(boardCopy);
                await sleep(ANIMATION_DELAY * 4);

                targets.forEach(t => {
                    boardCopy[t.r][t.c] = createPiece(t.r, t.c, null, pieceIdCounter, 'none');
                });
                
                const damage = targets.length * 4; // Damage for each piece shattered
                const newOpponentHealth = Math.max(0, opponentHealth - damage);
                setOpponentHealth(newOpponentHealth);

                await processGameLoop(boardCopy);
                handleOpponentTurn();
                return;
            }

            if (selectedCharacter === 'scorpion') {
                if (!aimTarget) {
                    setAimTarget({ row, col });
                    setIsProcessing(false);
                    return;
                } else {
                    const { row: r1, col: c1 } = aimTarget;
                    const r2 = row, c2 = col;
                    const distance = Math.abs(r1 - r2) + Math.abs(c1 - c2);

                    setAimTarget(null);
                    setAbilityMeter(0);
                    setAbilityState('idle');

                    if (distance === 1) {
                        playSoundMuted('swap');
                        let boardCopy = board.map(r => [...r]);
                        [boardCopy[r1][c1], boardCopy[r2][c2]] = [boardCopy[r2][c2], boardCopy[r1][c1]];
                        boardCopy[r1][c1] = {...boardCopy[r1][c1], row: r1, col: c1};
                        boardCopy[r2][c2] = {...boardCopy[r2][c2], row: r2, col: c2};
                        
                        setBoard(boardCopy);
                        await sleep(ANIMATION_DELAY * 2);
                        const matchMade = await processGameLoop(boardCopy, {row: r2, col: c2});
                        if (matchMade) {
                            handleOpponentTurn();
                        } else {
                            // If swap didn't result in a match, it's an invalid move for this ability
                            await sleep(ANIMATION_DELAY * 2);
                            setBoard(board); // Revert board
                            setIsProcessing(false);
                        }

                    } else { // Invalid target, refund ability
                        setIsProcessing(false);
                    }
                    return;
                }
            }
        }
        
        if (selectedPiece) {
            const { row: selectedRow, col: selectedCol } = selectedPiece;
            const distance = Math.abs(row - selectedRow) + Math.abs(col - selectedCol);

            if (distance === 1) { 
                setIsProcessing(true);
                setSelectedPiece(null);
                playSoundMuted('swap');
                
                const newBoard = board.map(r => [...r]);
                const piece1 = newBoard[selectedRow][selectedCol];
                const piece2 = newBoard[row][col];
                
                newBoard[selectedRow][selectedCol] = { ...piece2, row: selectedRow, col: selectedCol };
                newBoard[row][col] = { ...piece1, row: row, col: col };
                setBoard(newBoard);
                
                await sleep(ANIMATION_DELAY * 2);

                const matches = findMatches(newBoard);

                if (matches.length > 0) {
                    const matchMade = await processGameLoop(newBoard, { row, col });
                    if(matchMade) {
                        handleOpponentTurn();
                    }
                } else {
                    await sleep(ANIMATION_DELAY * 2);
                    setBoard(board);
                    setIsProcessing(false);
                }
            } else {
                setSelectedPiece({ row, col });
            }
        } else {
            setSelectedPiece({ row, col });
        }
    }, [selectedPiece, board, isProcessing, gameState, processGameLoop, playSoundMuted, abilityState, selectedCharacter, aimTarget, opponentHealth, handleOpponentTurn]);

    const handleSwipe = useCallback((row: number, col: number, direction: 'up' | 'down' | 'left' | 'right') => {
        if (isProcessing || gameState !== 'playing' || selectedPiece || abilityState === 'aiming') return;

        let targetRow = row;
        let targetCol = col;

        if (direction === 'up') targetRow--;
        else if (direction === 'down') targetRow++;
        else if (direction === 'left') targetCol--;
        else if (direction === 'right') targetCol++;

        if (targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE) {
            setSelectedPiece({ row, col });
            setTimeout(() => handlePieceClick(targetRow, targetCol), 0);
        }
    }, [isProcessing, gameState, selectedPiece, handlePieceClick, abilityState]);

    const handleHintClick = () => {
        if (isProcessing || isHintOnCooldown || gameState !== 'playing') return;

        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        setAutoHintIds(null);

        const move = findAPossibleMove(board);
        if (move) {
            setManualHintIds([move[0].id, move[1].id]);
            setTimeout(() => setManualHintIds(null), 5000);
        }

        setIsHintOnCooldown(true);
        setHintCooldown(HINT_COOLDOWN_SECONDS);
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (gameState !== 'playing' || isProcessing) return;
    
        const { row, col } = keyboardCursor;
    
        let newRow = row;
        let newCol = col;
    
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                newRow = (row - 1 + GRID_SIZE) % GRID_SIZE;
                break;
            case 'ArrowDown':
                e.preventDefault();
                newRow = (row + 1) % GRID_SIZE;
                break;
            case 'ArrowLeft':
                e.preventDefault();
                newCol = (col - 1 + GRID_SIZE) % GRID_SIZE;
                break;
            case 'ArrowRight':
                e.preventDefault();
                newCol = (col + 1) % GRID_SIZE;
                break;
            case 'Enter':
            case ' ': // Space key
                e.preventDefault();
                handlePieceClick(row, col);
                return;
            case 'a': // Ability key
            case 'A':
                e.preventDefault();
                handleAbilityClick();
                break;
        }
    
        if (newRow !== row || newCol !== col) {
            setKeyboardCursor({ row: newRow, col: newCol });
        }
    
    }, [gameState, isProcessing, keyboardCursor, handlePieceClick, handleAbilityClick]);
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    

    return (
        <>
            {gameState === 'start' && (
                <div className="start-screen-overlay">
                    <div className="start-screen-modal">
                        <h1>Kombat Krush</h1>
                        <p>A Match-3 Fighting Game.</p>
                        <p>Match pieces to damage your opponent. Defeat the ladder to win!</p>
                        <div className="settings-container">
                            <label htmlFor="swipe-sensitivity">Swipe Sensitivity</label>
                            <input
                                type="range"
                                id="swipe-sensitivity"
                                min="10"
                                max="50"
                                value={swipeSensitivity}
                                onChange={handleSensitivityChange}
                            />
                        </div>
                        <button onClick={() => setGameState('characterSelect')}>Start Game</button>
                    </div>
                </div>
            )}
            
            {gameState === 'characterSelect' && (
                <div className="character-select-overlay">
                    <div className="character-select-modal">
                        <h2>Choose Your Fighter</h2>
                        <div className="fighters-container">
                            {(Object.keys(CHARACTER_DATA) as CharacterName[]).map(charKey => {
                                const char = CHARACTER_DATA[charKey];
                                return (
                                   <button key={char.name} className="fighter-card" onClick={() => startGame(charKey)}>
                                        <h3>{char.name}</h3>
                                        <div className={`char-portrait ${charKey}`}></div>
                                        <p>{char.description}</p>
                                   </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
            
            {(gameState === 'levelWin' || gameState === 'ladderComplete') && (
                <div className="game-over-overlay">
                    <div className="game-over-modal">
                        <h2 className="victory-text">
                            {gameState === 'ladderComplete' ? 'FLAWLESS VICTORY' : 'YOU WIN'}
                        </h2>
                        {gameState === 'ladderComplete' ? (
                            <>
                                <p>You have defeated all challengers and conquered the ladder!</p>
                                <button onClick={handleRestartClick}>Play Again</button>
                            </>
                        ) : (
                            <>
                                <p>You have defeated {opponent?.name}. Prepare for the next battle!</p>
                                <button onClick={handleNextLevel}>Next Fight</button>
                            </>
                        )}
                    </div>
                </div>
            )}


            {gameState === 'gameOver' && (
                <div className="game-over-overlay">
                    <div className="game-over-modal">
                        <h2 className='fatality-text'>FATALITY</h2>
                        <h3>You Lose</h3>
                        <p>You were defeated by {opponent?.name}.</p>
                        <p>Max Combo: x{maxCombo}</p>
                        <button onClick={handleRestartClick}>Try Again</button>
                    </div>
                </div>
            )}

            <div className={`game-ui-wrapper ${selectedCharacter ? `theme-${selectedCharacter}` : ''}`} aria-hidden={!['playing', 'gameOver', 'levelWin', 'ladderComplete'].includes(gameState)}>
                <div className="player-info-col">
                    <div className={`player-portrait ${selectedCharacter || ''} ${playerIsHit ? 'taking-damage' : ''}`}></div>
                    {playerBanter && (
                        <div key={playerBanter.key} className="player-banter-bubble">
                            {`"${playerBanter.text}"`}
                        </div>
                    )}
                </div>

                <div className="game-container">
                    <header className="game-header">
                        <div className="health-bars-container">
                            <div className="health-bar-wrapper">
                                <div className="health-bar-label">{selectedCharacter}</div>
                                <div className="health-bar-outer">
                                    <div className="health-bar-inner player" style={{width: `${(playerHealth / PLAYER_MAX_HEALTH) * 100}%`}}></div>
                                </div>
                            </div>
                            <div className="health-bar-wrapper">
                                <div className="health-bar-label">{opponent?.name}</div>
                                <div className="health-bar-outer">
                                    <div className="health-bar-inner opponent" style={{width: opponent ? `${(opponentHealth / opponent.health) * 100}%` : '100%'}}></div>
                                </div>
                            </div>
                        </div>

                        <div className="controls-and-meters">
                            <div className="header-buttons">
                                <button className="hint-button" onClick={handleHintClick} disabled={isHintOnCooldown || isProcessing}>
                                    {isHintOnCooldown ? `(${hintCooldown}s)` : 'Hint'}
                                </button>
                                <button className="mute-button" onClick={() => setIsMuted(!isMuted)} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                                    {isMuted ? 
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> :
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                    }
                                </button>
                            </div>
                            {selectedCharacter && (
                                <div className={`ability-container ${selectedCharacter}`}>
                                    <div className="ability-meter-outer">
                                        <div className="ability-meter-inner" style={{width: `${(abilityMeter / ABILITY_METER_MAX) * 100}%`}}></div>
                                    </div>
                                    <button className={`ability-button ${abilityState}`} onClick={handleAbilityClick} disabled={abilityState !== 'ready' || isProcessing}>
                                        Ability
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>

                    {combo >= 4 && (
                        <div key={comboKey} className="combo-display">
                            COMBO x{combo}
                        </div>
                    )}

                    <div className="game-board-container">
                        <div className="game-board">
                            {specialEffects.map(effect => (
                                <div key={effect.id} className={`special-effect ${
                                    effect.type === 'row' ? 'effect-row' : 
                                    effect.type === 'col' ? 'effect-col' :
                                    effect.type === 'lightning' ? 'effect-lightning' :
                                    effect.type === 'dragon' ? 'effect-dragon' :
                                    effect.type === 'acid_spit' ? 'effect-acid-spit' :
                                    effect.type === 'kano_ball' ? 'effect-kano-ball' :
                                    effect.type === 'dragon_fire' ? 'effect-dragon-fire' :
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
                                onClick={() => handlePieceClick(piece.row, piece.col)}
                                onSwipe={(direction) => handleSwipe(piece.row, piece.col, direction)}
                                isSelected={selectedPiece?.row === piece.row && selectedPiece?.col === piece.col}
                                isHinted={autoHintIds?.includes(piece.id) ?? false}
                                isManualHinted={manualHintIds?.includes(piece.id) ?? false}
                                isCursorOn={keyboardCursor.row === piece.row && keyboardCursor.col === piece.col}
                                isAiming={abilityState === 'aiming'}
                                isAimTarget={aimTarget?.row === piece.row && aimTarget?.col === piece.col}
                                swipeSensitivity={swipeSensitivity}
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
                </div>

                <div className="opponent-info-col">
                    {opponent && (
                        <>
                        <div className={`opponent-portrait ${opponent.pieceType || ''} ${opponentIsHit ? 'taking-damage' : ''}`}></div>
                        <div className="opponent-attack-timer">
                            <div className="attack-timer-label">ATTACK IN</div>
                            <div className="attack-timer-value">{movesUntilAttack}</div>
                        </div>
                        {opponentBanter && (
                            <div key={opponentBanter.key} className="opponent-banter-bubble">
                                {`"${opponentBanter.text}"`}
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}