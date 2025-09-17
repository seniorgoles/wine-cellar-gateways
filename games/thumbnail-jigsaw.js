// ===================================================================
// ===      Thumbnail Jigsaw Game Cartridge v1.0                   ===
// ===================================================================

// --- Game-specific State ---
puzzlePieces = [];
selectedPiece = null;
offsetX = 0;
offsetY = 0;
score = 0;
let moveCount = 0; // <-- ADD THIS NEW VARIABLE
let thumbnailList = [];
let currentThumbnailIndex = 0;




// --- Main Game Function (called by the engine) ---
function startGame(playlist) {
    // The 'playlist' from our spreadsheet is the list of videos for the thumbnails
    thumbnailList = playlist.map(item => item.videoId);
    if (thumbnailList.length === 0) {
        document.getElementById('game-container').innerHTML = '<h2>Error: No thumbnails found for this game.</h2>';
        return;
    }
    
    // Shuffle the list of thumbnails for variety
    shuffleArray(thumbnailList);
    currentThumbnailIndex = 0;

    // Build the game's HTML structure inside the main game container
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div id="puzzle-area"></div>
        <div id="game-controls">
            <button id="start-puzzle-btn" class="btn">New Puzzle</button>
            <select id="piece-count-select">
                <option value="4">Easy (4 pieces)</option>
                <option value="9">Medium (9 pieces)</option>
                <option value="16">Hard (16 pieces)</option>
                <option value="25">Expert (25 pieces)</option>
            </select>
            <button id="next-thumbnail-btn" class="btn">Next Thumbnail</button>
            <div id="score-display">Score: 0</div>
        </div>
    `;

    // Add event listeners to the new buttons
    document.getElementById('start-puzzle-btn').addEventListener('click', generateNewPuzzle);
    document.getElementById('next-thumbnail-btn').addEventListener('click', loadNextThumbnail);
    document.getElementById('piece-count-select').addEventListener('change', generateNewPuzzle);

    // Start the first puzzle automatically
    generateNewPuzzle();
}

function generateNewPuzzle() {
    const puzzleArea = document.getElementById('puzzle-area');
    if (!puzzleArea) return;
    puzzleArea.innerHTML = ''; // Clear previous pieces
    score = 0;
    moveCount = 0; // <-- ADD THIS LINE to reset the move counter
    updateScore();

    const pieceCount = parseInt(document.getElementById('piece-count-select').value);
    const rows = Math.sqrt(pieceCount);
    const cols = rows;
    const pieceWidth = puzzleArea.offsetWidth / cols;
    const pieceHeight = puzzleArea.offsetHeight / rows;

    const currentVideoId = thumbnailList[currentThumbnailIndex];
    // Use YouTube's high-quality thumbnail URL
    const thumbnailUrl = `https://img.youtube.com/vi/${currentVideoId}/maxresdefault.jpg`;
    
    puzzlePieces = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const piece = document.createElement('div');
            piece.className = 'puzzle-thumb-piece';
            piece.style.width = `${pieceWidth}px`;
            piece.style.height = `${pieceHeight}px`;
            piece.style.backgroundImage = `url(${thumbnailUrl})`;
            piece.style.backgroundSize = `${puzzleArea.offsetWidth}px ${puzzleArea.offsetHeight}px`;
            piece.style.backgroundPosition = `-${col * pieceWidth}px -${row * pieceHeight}px`;
            piece.dataset.correctX = col * pieceWidth;
            piece.dataset.correctY = row * pieceHeight;
            piece.dataset.correctRotation = '0';

            const randomRotation = Math.floor(Math.random() * 4) * 90;
            piece.dataset.rotation = randomRotation;
            piece.style.transform = `rotate(${randomRotation}deg)`;
            
            piece.style.left = `${Math.random() * (puzzleArea.offsetWidth - pieceWidth)}px`;
            piece.style.top = `${Math.random() * (puzzleArea.offsetHeight - pieceHeight)}px`;

            puzzleArea.appendChild(piece);
            puzzlePieces.push(piece);

            piece.addEventListener('mousedown', handleMouseDown);
            piece.addEventListener('dblclick', handleDoubleClick);
        }
    }
}

function loadNextThumbnail() {
    currentThumbnailIndex++;
    if (currentThumbnailIndex >= thumbnailList.length) {
        shuffleArray(thumbnailList); // Re-shuffle for a new loop
        currentThumbnailIndex = 0;
    }
    generateNewPuzzle();
}

  function updateScore() {
       const scoreDisplay = document.getElementById('score-display');
         if(scoreDisplay) scoreDisplay.innerText = `Moves: ${moveCount}`; 
       
       const pieceCount = parseInt(document.getElementById('piece-count-select').value);
       if (score === pieceCount) {
           // Pass the final score to the victory screen
            showVictoryScreen(moveCount); 
       }
   }


// --- Event Handlers ---
function handleMouseDown(event) {
    selectedPiece = event.target;
    offsetX = event.clientX - selectedPiece.offsetLeft;
    offsetY = event.clientY - selectedPiece.offsetTop;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(event) {
    if (selectedPiece) {
        selectedPiece.style.left = `${event.clientX - offsetX}px`;
        selectedPiece.style.top = `${event.clientY - offsetY}px`;
    }
}

function handleMouseUp() {
    if (selectedPiece) {
        moveCount++; // <-- ADD THIS LINE to count the move
        checkPiecePlacement(selectedPiece);
        updateScore(); 
    }
    selectedPiece = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
}

function handleDoubleClick(event) {
    const piece = event.target;
    moveCount++; // <-- ADD THIS LINE to count the rotation as a move
    let rotation = parseInt(piece.dataset.rotation);
    rotation = (rotation + 90) % 360;
    piece.dataset.rotation = rotation;
    piece.style.transform = `rotate(${rotation}deg)`;
    checkPiecePlacement(piece);
 
}

function checkPiecePlacement(piece) {
    const correctX = parseInt(piece.dataset.correctX);
    const correctY = parseInt(piece.dataset.correctY);
    const correctRotation = parseInt(piece.dataset.correctRotation);
    const pieceX = parseInt(piece.style.left);
    const pieceY = parseInt(piece.style.top);
    const pieceRotation = parseInt(piece.dataset.rotation);

    if (Math.abs(pieceX - correctX) < 15 && Math.abs(pieceY - correctY) < 15 && pieceRotation === correctRotation) {
        piece.style.left = `${correctX}px`;
        piece.style.top = `${correctY}px`;
        piece.style.pointerEvents = 'none'; // Lock piece
        piece.style.border = '2px solid limegreen';
        score++;
        updateScore();
    }
}

// --- Utility Functions ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

  function showVictoryScreen(finalMoveCount) {
       const oldOverlay = document.getElementById('victory-overlay');
       if (oldOverlay) oldOverlay.remove();

       const overlay = document.createElement('div');
       overlay.id = 'victory-overlay';
       // Use the 'finalScore' variable in the message
       overlay.innerHTML = `
           <h2>Congratulations! 🎉</h2>
           <p>You completed the puzzle in ${finalMoveCount} moves!</p>
           <button id="restart-game-btn" class="btn">New Puzzle</button>
           <button id="back-to-arcade-btn" class="btn">Choose New Game</button>
    `;
    document.body.appendChild(overlay);
    // Add event listeners for the new buttons
    document.getElementById('restart-game-btn').addEventListener('click', () => {
        // "Play Again" should just generate a new puzzle
        generateNewPuzzle(); 
        overlay.remove();
    });





    // Restart THIS game
    document.getElementById('restart-game-btn').addEventListener('click', () => {
        initializeMemoryMatch(); 
        overlay.remove();
    });

    // Back to game selection (check your actual container IDs!)
    document.getElementById('back-to-arcade-btn').addEventListener('click', () => {
        silenceAllAudio();
        const gameWrapper = document.getElementById('game-container-wrapper');
        const selectionContainer = document.getElementById('game-selection-container');
        if (gameWrapper && selectionContainer) {
            gameWrapper.style.display = 'none';
            selectionContainer.style.display = 'block';
        }
        overlay.remove();
    });

    if (typeof confetti === 'function') {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
    }
}
