// Historical Rotor Database
const rotorInventory = [
    { name: "I", wiring: [4, 10, 12, 5, 11, 6, 3, 16, 21, 25, 13, 19, 14, 22, 24, 7, 23, 20, 18, 15, 0, 8, 1, 17, 2, 9], defaultTurnover: 16 }, // Q
    { name: "II", wiring: [0, 9, 3, 10, 18, 8, 17, 20, 23, 1, 11, 7, 22, 19, 12, 2, 16, 6, 25, 13, 15, 24, 5, 21, 14, 4], defaultTurnover: 4 },  // E
    { name: "III", wiring: [1, 3, 5, 7, 9, 11, 2, 15, 17, 19, 23, 21, 25, 13, 24, 4, 8, 22, 6, 0, 10, 12, 20, 18, 16, 14], defaultTurnover: 21 }, // V
    { name: "IV", wiring: [4, 18, 14, 21, 15, 25, 9, 0, 24, 16, 20, 8, 17, 7, 23, 11, 13, 5, 19, 6, 10, 3, 2, 12, 22, 1], defaultTurnover: 9 },   // J
    { name: "V", wiring: [21, 25, 1, 17, 6, 8, 19, 24, 20, 15, 18, 3, 13, 7, 11, 23, 0, 22, 12, 9, 16, 14, 5, 4, 2, 10], defaultTurnover: 25 }    // Z
];

let state = [
    { position: 0, ringSetting: 0, rotorIdx: 0 }, // Right (Slot 0)
    { position: 0, ringSetting: 0, rotorIdx: 1 }, // Middle (Slot 1)
    { position: 0, ringSetting: 0, rotorIdx: 2 }  // Left (Slot 2)
];

let plugboard = {}; // pairs storage
let plugboardSelection = null;

function saveState() {
    const tape = document.getElementById('messageTape');
    const data = {
        state: state,
        plugboard: plugboard,
        tape: tape ? tape.innerText : "|",
        theme: document.body.classList.contains('light-theme') ? 'light' : 'dark'
    };
    localStorage.setItem('enigma-full-state', JSON.stringify(data));
}

function loadState() {
    const saved = localStorage.getItem('enigma-full-state');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.state) state = data.state;
        if (data.plugboard) plugboard = data.plugboard;
        if (data.theme === 'light') document.body.classList.add('light-theme');
        if (data.tape) {
            const tape = document.getElementById('messageTape');
            if (tape) tape.innerText = data.tape;
        }
    }
}

const reflector = [24, 17, 20, 7, 16, 18, 11, 3, 15, 23, 13, 6, 14, 10, 12, 8, 4, 1, 5, 25, 2, 22, 21, 9, 0, 19];
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function changeRotorPos(rotorNum, direction) {
    state[rotorNum].position = (state[rotorNum].position + direction + 26) % 26;
    updateRotorUI();
}

function setRotorType(rotorNum, typeIdx) {
    state[rotorNum].rotorIdx = parseInt(typeIdx);
    updateRotorUI();
}

function changeRingSetting(rotorNum, direction) {
    state[rotorNum].ringSetting = (state[rotorNum].ringSetting + direction + 26) % 26;
    updateRotorUI();
}

function updateRotorUI() {
    // Update Positions
    document.getElementById('pos0').innerText = alphabet[state[0].position];
    document.getElementById('pos1').innerText = alphabet[state[1].position];
    document.getElementById('pos2').innerText = alphabet[state[2].position];

    // Update Ring Settings
    document.getElementById('ring0').innerText = alphabet[state[0].ringSetting];
    document.getElementById('ring1').innerText = alphabet[state[1].ringSetting];
    document.getElementById('ring2').innerText = alphabet[state[2].ringSetting];

    // Update Selects
    document.getElementById('select0').value = state[0].rotorIdx;
    document.getElementById('select1').value = state[1].rotorIdx;
    document.getElementById('select2').value = state[2].rotorIdx;

    updatePlugboardUI();
    saveState();
}

function plugClick(letter) {
    if (plugboardSelection === null) {
        plugboardSelection = letter;
    } else if (plugboardSelection === letter) {
        if (plugboard[letter]) {
            let pair = plugboard[letter];
            delete plugboard[letter];
            delete plugboard[pair];
        }
        plugboardSelection = null;
    } else {
        [plugboardSelection, letter].forEach(l => {
            if (plugboard[l]) {
                let pair = plugboard[l];
                delete plugboard[l];
                delete plugboard[pair];
            }
        });

        plugboard[plugboardSelection] = letter;
        plugboard[letter] = plugboardSelection;
        plugboardSelection = null;
    }
    updatePlugboardUI();
    saveState();
}

function plugHover(letter, isEntering) {
    const pair = plugboard[letter];
    if (!pair) return;

    const el = document.getElementById('plug_' + letter);
    const pairEl = document.getElementById('plug_' + pair);

    if (isEntering) {
        el.classList.add('plug-highlight-red');
        pairEl.classList.add('plug-highlight-red');
    } else {
        el.classList.remove('plug-highlight-red');
        pairEl.classList.remove('plug-highlight-red');
    }
}

function updatePlugboardUI() {
    alphabet.forEach(letter => {
        const el = document.getElementById('plug_' + letter);
        if (!el) return;

        el.className = 'plug';
        el.dataset.pair = "";

        if (plugboard[letter]) {
            el.classList.add('plug-connected');
            el.dataset.pair = plugboard[letter];
        }

        if (plugboardSelection === letter) {
            el.classList.add('plug-selected');
        }
    });
}

function keyPress(button) {
    const inputChar = (typeof button === 'string' ? button : button.innerText).toUpperCase();
    const inputIndex = alphabet.indexOf(inputChar);
    if (inputIndex === -1) return;

    turnOffLamp();
    rotateRotors();

    const charAfterPlugIn = plugboard[inputChar] || inputChar;
    let charIndex = alphabet.indexOf(charAfterPlugIn);

    for (let i = 0; i < 3; i++) {
        charIndex = passThroughRotor(charIndex, i, true);
    }

    charIndex = reflector[charIndex];

    for (let i = 2; i >= 0; i--) {
        charIndex = passThroughRotor(charIndex, i, false);
    }

    const charBeforePlugOut = alphabet[charIndex];
    const outputChar = plugboard[charBeforePlugOut] || charBeforePlugOut;

    const tape = document.getElementById('messageTape');
    let currentText = (tape.innerText === "|") ? "" : tape.innerText;

    // Append the new character
    currentText += outputChar;

    // Count characters (ignoring existing spaces)
    const charCount = currentText.replace(/\s/g, "").length;

    // Add space after every 5th character
    if (charCount > 0 && charCount % 5 === 0) {
        currentText += " ";
    }

    tape.innerText = currentText;

    updateRotorUI();
    saveState();

    const lamp = document.getElementById("_" + outputChar);
    if (lamp) lamp.classList.add('active');
}

function passThroughRotor(index, rotorNum, forward) {
    const pos = state[rotorNum].position;
    const ring = state[rotorNum].ringSetting;
    const wiring = rotorInventory[state[rotorNum].rotorIdx].wiring;

    const offset = (pos - ring + 26) % 26;

    if (forward) {
        let input = (index + offset + 26) % 26;
        let output = wiring[input];
        return (output - offset + 26) % 26;
    } else {
        let target = (index + offset + 26) % 26;
        let output = wiring.indexOf(target);
        return (output - offset + 26) % 26;
    }
}

function turnOffLamp() {
    document.querySelectorAll('.active').forEach(lamp => lamp.classList.remove('active'));
}

function rotateRotors() {
    let stepNext = true;
    for (let i = 0; i < 3; i++) {
        if (stepNext) {
            const turnoverPoint = rotorInventory[state[i].rotorIdx].defaultTurnover;
            const atTurnover = (state[i].position === turnoverPoint);
            state[i].position = (state[i].position + 1) % 26;
            stepNext = atTurnover;
        } else {
            break;
        }
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    updateThemeIcon();
    saveState();
}

function updateThemeIcon() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isLight = document.body.classList.contains('light-theme');
    btn.innerText = isLight ? "☾" : "☼";
}

function clearTape() {
    document.getElementById('messageTape').innerText = "|";
    saveState();
}

function startDecipherEffect() {
    const titleEl = document.getElementById('heroTitle');
    if (!titleEl) return;

    const targetWord = "ENIGMA";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const intervalTime = 70;
    const initialDelay = 500; // 0.5s black screen
    const lockSpeed = 250; // Lock each letter 250ms after the previous one
    const initialShuffle = 1500; // Initial full shuffle duration before first lock

    setTimeout(() => {
        titleEl.classList.add('title-visible');
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            let displayStr = "";
            let allLocked = true;

            for (let i = 0; i < targetWord.length; i++) {
                const lockTime = initialShuffle + (i * lockSpeed);

                if (elapsed >= lockTime) {
                    displayStr += targetWord[i];
                } else {
                    displayStr += chars[Math.floor(Math.random() * chars.length)];
                    allLocked = false;
                }
            }

            titleEl.textContent = displayStr;

            if (allLocked) {
                clearInterval(interval);

                // Show controls
                const arrow = document.querySelector('.scroll-arrow');
                const themeBtn = document.getElementById('themeToggle');
                if (arrow) arrow.classList.add('controls-visible');
                if (themeBtn) themeBtn.classList.add('controls-visible');
            }
        }, intervalTime);
    }, initialDelay);
}

document.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    const button = document.getElementById(key);
    if (button) {
        keyPress(button);
        button.classList.add('pressed');
        setTimeout(() => button.classList.remove('pressed'), 100);
    }
});

window.onload = () => {
    loadState();
    updateThemeIcon();
    updateRotorUI();
    startDecipherEffect();
};