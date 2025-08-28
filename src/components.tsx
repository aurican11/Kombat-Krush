import React, { memo, useRef, CSSProperties } from 'react';
import type { GameState, Opponent, CharacterName, Piece, SpecialEffect, TextPopup, AbilityState } from './types';
import { CHARACTER_DATA, PieceIcons, PLAYER_MAX_HEALTH, ABILITY_METER_MAX } from './constants';


export const GamePiece = memo(({ piece, onClick, isSelected, isHinted, isManualHinted, isCursorOn, onSwipe, isAiming, isAimTarget }: { piece: Piece; onClick: () => void; isSelected: boolean, isHinted: boolean, isManualHinted: boolean, isCursorOn: boolean; onSwipe: (direction: 'up' | 'down' | 'left' | 'right') => void; isAiming: boolean; isAimTarget: boolean; }) => {
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
        // For a tap, we do nothing here. The browser will fire a 'click' event
        // which will be handled by the button's onClick prop. This makes touch
        // behavior consistent with mouse clicks.
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

export const EndGameModal = memo(({ gameState, opponent, maxCombo, score, onPlayAgain, onMainMenu, onNextLevel }: EndGameModalProps) => {
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

export const SettingsModal = memo(({ isOpen, onClose, onMainMenu }: { isOpen: boolean; onClose: () => void; onMainMenu: () => void; }) => {
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

export const CharacterSelectScreen = memo(({ onStartGame }: { onStartGame: (character: CharacterName) => void }) => (
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

export const StartScreen = memo(({ onStart }: { onStart: () => void; }) => (
    <div className="screen-overlay">
        <div className="modal-dialog">
            <h1>Kombat Krush</h1>
            <p>A Match-3 Fighting Game.</p>
            <p>Match pieces to damage your opponent. Defeat 5 opponents to win the tournament!</p>
            <button onClick={onStart}>Start Game</button>
        </div>
    </div>
));

export const PlayerProfile = memo(({ selectedCharacter, playerBanter, playerIsHit }: { selectedCharacter: CharacterName | null, playerBanter: {key: number, text: string} | null, playerIsHit: boolean }) => (
    <div className="player-info-col">
        <div className="character-header">
            <div key={playerBanter?.key || 'player-banter-static'} className="player-banter-bubble" aria-live="polite">
                {playerBanter ? `"${playerBanter.text}"` : ''}
            </div>
            <div className={`player-portrait ${selectedCharacter || ''} ${playerIsHit ? 'taking-damage' : ''}`}></div>
        </div>
    </div>
));

export const OpponentProfile = memo(({ opponent, opponentBanter, opponentIsHit, movesUntilAttack, shuffledLadder, currentLadderLevel }: { opponent: Opponent | null, opponentBanter: {key: number, text: string} | null, opponentIsHit: boolean, movesUntilAttack: number, shuffledLadder: Opponent[], currentLadderLevel: number }) => (
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

export const GameHeader = memo(({
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23-.09.49 0-.61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                </button>
            </div>
        </div>
    </header>
));

export const GameBoard = memo(({ board, specialEffects, textPopups, showToasty, selectedPiece, autoHintIds, manualHintIds, keyboardCursor, abilityState, aimTarget, onPieceClick, onSwipe }: { board: Piece[][], specialEffects: SpecialEffect[], textPopups: TextPopup[], showToasty: boolean, selectedPiece: { row: number, col: number } | null, autoHintIds: number[] | null, manualHintIds: number[] | null, keyboardCursor: { row: number, col: number }, abilityState: AbilityState, aimTarget: { row: number, col: number } | null, onPieceClick: (row: number, col: number) => void, onSwipe: (row: number, col: number, direction: 'up' | 'down' | 'left' | 'right') => void }) => (
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

export const MobileHeader = memo(({ selectedCharacter, playerBanter, playerIsHit, opponent, opponentBanter, opponentIsHit }: { selectedCharacter: CharacterName | null, playerBanter: {key: number, text: string} | null, playerIsHit: boolean, opponent: Opponent | null, opponentBanter: {key: number, text: string} | null, opponentIsHit: boolean }) => (
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

export const MobileFooter = memo(({ opponent, movesUntilAttack, shuffledLadder, currentLadderLevel }: { opponent: Opponent | null, movesUntilAttack: number, shuffledLadder: Opponent[], currentLadderLevel: number }) => (
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