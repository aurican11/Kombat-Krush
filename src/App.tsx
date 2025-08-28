import React, { useEffect, useCallback, useRef, useReducer } from 'react';
import { StartScreen, CharacterSelectScreen, EndGameModal, PlayerProfile, OpponentProfile, GameHeader, GameBoard, MobileFooter } from './components';
import { playSound, createInitialBoard, processGameLoop } from './utils';
import { LADDER_DATA } from './constants';
import type { CharacterName } from './types';
import { initialState, gameReducer } from './reducer';


const App = () => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const { 
        board, gameState, playerHealth, opponentHealth, currentLadderLevel, opponent, shuffledLadder,
        movesUntilAttack, opponentBanter, playerIsHit, opponentIsHit, selectedPiece, isProcessing,
        combo, textPopups, autoHintIds, manualHintIds, isHintOnCooldown, hintCooldown, comboKey,
        isMuted, showToasty, specialEffects, keyboardCursor, selectedCharacter, abilityMeter,
        abilityState, fatalityMeter, fatalityState, isFatalityWin, aimTarget, playerBanter, maxCombo,
        score
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

    const generatePlayerBanter = useCallback((event: 'gameStart' | 'highCombo' | 'ability' | 'gameOverWin' | 'gameOverLoss') => {
        if (banterCooldownTimer.current || !selectedCharacter) return;
        dispatch({ type: 'PLAYER_BANTER', payload: { event, character: selectedCharacter, cooldownRef: banterCooldownTimer } });
    }, [selectedCharacter]);

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
            document.body.classList.add('screen-shake');
            const timer = setTimeout(() => {
                document.body.classList.remove('screen-shake');
                dispatch({ type: 'SET_PLAYER_IS_HIT', payload: false });
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [playerIsHit, playSoundMuted]);

    useEffect(() => {
        if (opponentIsHit) {
            playSoundMuted('opponentHit');
            const timer = setTimeout(() => {
                dispatch({ type: 'SET_OPPONENT_IS_HIT', payload: false });
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [opponentIsHit, playSoundMuted]);


    useEffect(() => {
        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        if (gameState === 'playing' && !isProcessing) {
             dispatch({ type: 'SCHEDULE_AUTO_HINT', payload: { board, timerRef: hintTimerId }});
        }
        return () => {
            if (hintTimerId.current) clearTimeout(hintTimerId.current);
        };
    }, [board, isProcessing, gameState]);

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
    }, [state, playSoundMuted]); // Note: state includes all dependent variables like isProcessing, gameState, etc.

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
            // Use a timeout to allow the state update to render before proceeding
            setTimeout(() => handlePieceClick(targetRow, targetCol), 0);
        }
    }, [isProcessing, gameState, selectedPiece, handlePieceClick, abilityState]);

    const handleHintClick = () => {
        if (isProcessing || isHintOnCooldown || gameState !== 'playing') return;
        if (hintTimerId.current) clearTimeout(hintTimerId.current);
        dispatch({ type: 'REQUEST_MANUAL_HINT', payload: { board } });
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
        
    }, [state, playSoundMuted, generatePlayerBanter]); // Depends on whole state


    const handleFatalityClick = useCallback(async () => {
        if (fatalityState !== 'ready' || isProcessing || gameState !== 'playing') return;
        dispatch({ type: 'SET_PROCESSING', payload: true });
        playSoundMuted('fatality');
        dispatch({ type: 'TRIGGER_FATALITY_ANIMATION' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        dispatch({ type: 'OPPONENT_BANTER', payload: { event: 'onDefeat' } });
        dispatch({ type: 'FINISH_FATALITY' });
    }, [fatalityState, isProcessing, gameState, playSoundMuted]);

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
            case 'f': // Fatality key
            case 'F': e.preventDefault(); handleFatalityClick(); break;
        }
    
        if (newRow !== keyboardCursor.row || newCol !== keyboardCursor.col) {
            dispatch({ type: 'SET_KEYBOARD_CURSOR', payload: { row: newRow, col: newCol } });
        }
    
    }, [gameState, isProcessing, keyboardCursor, handlePieceClick, handleAbilityClick, handleFatalityClick]);
    
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
                isFatalityWin={isFatalityWin}
            />

            <div className="game-ui-wrapper" aria-hidden={!['playing'].includes(gameState)}>
                <PlayerProfile
                    selectedCharacter={selectedCharacter}
                    playerBanter={playerBanter}
                    playerIsHit={playerIsHit}
                />

                <div className="game-container">
                    <h1 className="main-title">Kombat Krush</h1>
                    <GameHeader
                        playerHealth={playerHealth}
                        opponentHealth={opponent ? opponent.health : 100}
                        opponentMaxHealth={opponent ? opponent.health : 100}
                        selectedCharacter={selectedCharacter}
                        opponentName={opponent?.name}
                        playerIsHit={playerIsHit}
                        opponentIsHit={opponentIsHit}
                        isHintOnCooldown={isHintOnCooldown}
                        hintCooldown={hintCooldown}
                        isProcessing={isProcessing}
                        isMuted={isMuted}
                        abilityState={abilityState}
                        abilityMeter={abilityMeter}
                        fatalityState={fatalityState}
                        fatalityMeter={fatalityMeter}
                        onHintClick={handleHintClick}
                        onMuteClick={() => dispatch({ type: 'TOGGLE_MUTE' })}
                        onAbilityClick={handleAbilityClick}
                        onFatalityClick={handleFatalityClick}
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
                     <MobileFooter
                        opponent={opponent}
                        movesUntilAttack={movesUntilAttack}
                        shuffledLadder={shuffledLadder}
                        currentLadderLevel={currentLadderLevel}
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
            </div>
        </>
    );
};

export default App;