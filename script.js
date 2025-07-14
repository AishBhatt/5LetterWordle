document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const keyboard = document.getElementById('keyboard');
    const messageContainer = document.getElementById('message-container');
    const playAgainButton = document.getElementById('play-again');

    let wordList = [];
    let secretWord = '';

    // Fallback word list in case words.json fails to load
    const defaultWordList = ["apple", "baker", "candy", "dream", "early", "fable", "grape", "house", "igloo", "jolly"];

    let currentRow = 0;
    let currentTile = 0;
    const grid = Array(6).fill(null).map(() => Array(5).fill(''));
    let isGameOver = false;
    let keyboardLetterStatus = {}; // To store the highest status for each letter on the keyboard

    // Theme toggle elements
    const themeToggle = document.getElementById('theme-toggle');

    // Function to set theme
    function setTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        localStorage.setItem('wordle-theme', theme);
    }

    // Initialize theme on load
    const savedTheme = localStorage.getItem('wordle-theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    } else {
        setTheme('light');
    }

    // Event listener for theme toggle button
    themeToggle.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('wordle-theme');
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    async function fetchWords() {
        try {
            console.log("Attempting to fetch words.json...");
            // Use a relative path for GitHub Pages project sites
            const response = await fetch('words.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            wordList = await response.json();
            secretWord = wordList[Math.floor(Math.random() * wordList.length)];
            console.log("words.json loaded successfully. Secret word:", secretWord);
        } catch (error) {
            console.error("Could not load words:", error);
            messageContainer.textContent = "Error: Could not load word list. Using default words.";
            wordList = defaultWordList;
            secretWord = wordList[Math.floor(Math.random() * wordList.length)];
            console.log("Using default word list. Secret word:", secretWord);
        }
    }

    function createBoard() {
        for (let i = 0; i < 30; i++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            gameBoard.appendChild(tile);
        }
    }

    function createKeyboard() {
        keyboard.innerHTML = ''; // Clear existing keyboard
        const keyLayout = [
            "qwertyuiop",
            "asdfghjkl",
            "zxcvbnm"
        ];

        keyLayout.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.classList.add('keyboard-row');
            row.split('').forEach(key => {
                const keyElement = document.createElement('button');
                keyElement.textContent = key;
                keyElement.classList.add('key');
                keyElement.addEventListener('click', () => handleKeyPress(key));
                rowElement.appendChild(keyElement);
            });
            keyboard.appendChild(rowElement);
        });

        const bottomRow = document.createElement('div');
        bottomRow.classList.add('keyboard-row');

        const enterKey = document.createElement('button');
        enterKey.textContent = 'Enter';
        enterKey.classList.add('key');
        enterKey.addEventListener('click', handleEnter);
        bottomRow.appendChild(enterKey);

        const backspaceKey = document.createElement('button');
        backspaceKey.textContent = 'Backspace';
        backspaceKey.classList.add('key');
        backspaceKey.addEventListener('click', handleBackspace);
        bottomRow.appendChild(backspaceKey);

        keyboard.appendChild(bottomRow);
    }

    function handleKeyPress(key) {
        if (isGameOver) return;
        messageContainer.textContent = ''; // Clear message on key press
        if (currentTile < 5) {
            grid[currentRow][currentTile] = key;
            updateBoard();
            currentTile++;
        }
    }

    function handleEnter() {
        console.log(`handleEnter: Start - currentRow=${currentRow}, isGameOver=${isGameOver}`);
        if (isGameOver) return;
        if (currentTile < 5) {
            messageContainer.textContent = "Not enough letters!";
            shakeTiles();
            return;
        }

        const guess = grid[currentRow].join('');
        if (!wordList.includes(guess.toLowerCase())) {
            messageContainer.textContent = "Not in word list!";
            shakeTiles();
            return;
        }

        const isWin = checkGuess(guess.toLowerCase()); // checkGuess now returns isWin synchronously
        console.log(`handleEnter: After checkGuess - isWin=${isWin}, currentRow=${currentRow}, isGameOver=${isGameOver}`);

        if (isWin) {
            messageContainer.textContent = 'Congratulations! You win!';
            playAgainButton.style.display = 'block';
            isGameOver = true;
        } else {
            currentRow++;
            currentTile = 0;
        }

        // Check for game over (loss) after advancing row, if not already won
        if (!isWin && currentRow === 6) {
            messageContainer.textContent = `You lose! The word was ${secretWord}`;
            playAgainButton.style.display = 'block';
            isGameOver = true;
        }
        console.log(`handleEnter: End - currentRow=${currentRow}, isGameOver=${isGameOver}`);
    }

    function handleBackspace() {
        if (isGameOver) return;
        messageContainer.textContent = ''; // Clear message on backspace
        if (currentTile > 0) {
            currentTile--;
            grid[currentRow][currentTile] = '';
            updateBoard();
        }
    }

    function updateBoard() {
        const tiles = document.querySelectorAll('.tile');
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 5; j++) {
                const tile = tiles[i * 5 + j];
                tile.textContent = grid[i][j];
            }
        }
    }

    function shakeTiles() {
        const rowTiles = Array.from(gameBoard.children).slice(currentRow * 5, currentRow * 5 + 5);
        rowTiles.forEach(tile => {
            tile.classList.add('shake');
            tile.addEventListener('animationend', () => {
                tile.classList.remove('shake');
            }, { once: true });
        });
    }

    function checkGuess(guess) {
        console.log("Checking guess:", guess);
        const rowTiles = Array.from(gameBoard.children).slice(currentRow * 5, currentRow * 5 + 5);
        const keys = document.querySelectorAll('.key');

        const secretWordArr = secretWord.split('');
        const guessResult = Array(5).fill(''); // To store 'correct', 'incorrect-placement', 'wrong'

        // First pass: Mark correct (green) letters
        for (let i = 0; i < 5; i++) {
            if (guess[i] === secretWordArr[i]) {
                guessResult[i] = 'correct';
                secretWordArr[i] = null; // Mark as consumed
            }
        }

        // Second pass: Mark incorrect-placement (dusty rose) and wrong (grey) letters
        for (let i = 0; i < 5; i++) {
            if (guessResult[i] === '') { // If not already marked green
                const charIndex = secretWordArr.indexOf(guess[i]);
                if (charIndex > -1) {
                    guessResult[i] = 'incorrect-placement';
                    secretWordArr[charIndex] = null; // Mark as consumed
                } else {
                    guessResult[i] = 'wrong';
                }
            }
        }

        rowTiles.forEach((tile, i) => {
            const keyElement = Array.from(keys).find(key => key.textContent.toLowerCase() === guess[i]);

            let bgColor;
            // Remove existing color classes from the key before adding new ones
            if (keyElement) {
                keyElement.classList.remove('correct', 'incorrect-placement', 'wrong');
            }

            if (guessResult[i] === 'correct') {
                bgColor = '#8fbc8f'; // Dark Sea Green
                if (keyElement) keyElement.classList.add('correct');
            } else if (guessResult[i] === 'incorrect-placement') {
                bgColor = '#d8a7b1'; // Dusty Rose
                if (keyElement) keyElement.classList.add('incorrect-placement');
            } else {
                bgColor = '#787c7e'; // Darker grey
                if (keyElement) keyElement.classList.add('wrong');
                setTimeout(() => {
                    tile.classList.add('flip');
                }, i * 400);
            }

            setTimeout(() => {
                tile.style.backgroundColor = bgColor;
            }, i * 400);
        });

        return guess === secretWord; // Return win status synchronously
    }

    async function resetGame() {
        await fetchWords();
        currentRow = 0;
        currentTile = 0;
        grid.forEach(row => row.fill(''));
        isGameOver = false;
        keyboardLetterStatus = {}; // Reset keyboard status

        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.textContent = '';
            tile.style.backgroundColor = '';
            tile.classList.remove('flip', 'shake'); // Remove animation classes
        });

        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            key.classList.remove('correct', 'incorrect-placement', 'wrong');
        });

        messageContainer.textContent = '';
        playAgainButton.style.display = 'none';
        updateBoard();
    }

    playAgainButton.addEventListener('click', resetGame);

    async function init() {
        await fetchWords();
        createBoard();
        createKeyboard();
    }

    init();
});