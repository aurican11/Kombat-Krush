import React from 'react';
import type { CharacterName, Opponent } from './types';

// --- Game Constants ---
export const GRID_SIZE = 8;
export const PIECE_TYPES = ['scorpion', 'subzero', 'reptile', 'kano', 'raiden', 'liukang'];
export const ANIMATION_DELAY = 150; // ms for each step in the game loop
export const PLAYER_MAX_HEALTH = 100;
export const HINT_DELAY = 5000; // ms before showing a hint
export const HINT_COOLDOWN_SECONDS = 15;
export const ABILITY_METER_MAX = 18; // Pieces to match to fill meter
export const FATALITY_METER_MAX = 250; // Damage to deal to fill meter

export const LADDER_DATA: Opponent[] = [
    { name: 'Reptile', health: 90, attack: 12, movesPerAttack: 5, pieceType: 'reptile' },
    { name: 'Kano', health: 110, attack: 15, movesPerAttack: 5, pieceType: 'kano' },
    { name: 'Liu Kang', health: 130, attack: 18, movesPerAttack: 4, pieceType: 'liukang' },
    { name: 'Scorpion', health: 150, attack: 24, movesPerAttack: 4, pieceType: 'scorpion' },
    { name: 'Sub-Zero', health: 150, attack: 24, movesPerAttack: 4, pieceType: 'subzero' },
    { name: 'Raiden', health: 140, attack: 22, movesPerAttack: 4, pieceType: 'raiden' },
];


// --- SVG Icons for Pieces ---
export const PieceIcons: { [key in CharacterName]: React.FC } = {
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

export const CHARACTER_DATA: { [key in CharacterName]: { name: string, description: string } } = {
    scorpion: { name: 'Scorpion', description: 'Ability: Netherrealm Flames - Select a piece to destroy it and all others of the same type.'},
    subzero: { name: 'Sub-Zero', description: 'Ability: Ice Ball - Freeze and destroy a 4-piece cluster.' },
    raiden: { name: 'Raiden', description: 'Ability: Lightning Strike - Clear a random 2x2 area.' },
    reptile: { name: 'Reptile', description: 'Ability: Acid Spit - Clear a random column.' },
    kano: { name: 'Kano', description: 'Ability: Kano Ball - Clear a random row.' },
    liukang: { name: 'Liu Kang', description: 'Ability: Dragon Fire - Convert a random piece type to your own.' },
};

// --- Local Banter Data ---
export const LOCAL_BANTER: { [key in CharacterName | 'opponent']: { [event: string]: string[] } } = {
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
