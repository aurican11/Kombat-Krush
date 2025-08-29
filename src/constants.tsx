import React from 'react';
import type { CharacterName, Opponent } from './types.ts';

// --- Game Constants ---
export const GRID_SIZE = 8;
export const PIECE_TYPES = ['scorpion', 'subzero', 'reptile', 'kano', 'raiden', 'liukang'];
export const ANIMATION_DELAY = 150; // ms for each step in the game loop
export const PLAYER_MAX_HEALTH = 100;
export const HINT_DELAY = 5000; // ms before showing a hint
export const HINT_COOLDOWN_SECONDS = 15;
export const ABILITY_METER_MAX = 18; // Pieces to match to fill meter

export const LADDER_DATA: Opponent[] = [
    { name: 'Kano', health: 100, attack: 15, movesPerAttack: 5, pieceType: 'kano' },
    { name: 'Reptile', health: 115, attack: 18, movesPerAttack: 5, pieceType: 'reptile' },
    { name: 'Liu Kang', health: 130, attack: 21, movesPerAttack: 4, pieceType: 'liukang' },
    { name: 'Raiden', health: 145, attack: 24, movesPerAttack: 4, pieceType: 'raiden' },
    { name: 'Sub-Zero', health: 160, attack: 27, movesPerAttack: 4, pieceType: 'subzero' },
    { name: 'Scorpion', health: 175, attack: 30, movesPerAttack: 3, pieceType: 'scorpion' },
];


// --- SVG Icons for Pieces ---
export const PieceIcons: { [key in CharacterName]: React.FC } = {
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

export const CHARACTER_DATA: {
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

export const LOCAL_BANTER: { [key in CharacterName | 'opponent']: { [key: string]: string[] } } = {
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
}