// ===================================================================
// ===    Video Jigsaw Game Cartridge v2.1 (Final Architecture)    ===
// ===================================================================

// --- Game-specific State ---
let jigsawPlaylist = [];
let jigsawCurrentIndex = 0;
let moveCount = 0;
let selectedPiece = null;
let offsetX = 0;
let offsetY = 0;

// --- Main Game Function (called by the engine) ---
function startGame(playlist) {
    shuffleArray(playlist);
const videoId = playlist[0]?.videoId; // Get the first video ID from the playlist
    jigsawPlaylist = playlist;
    jigsawCurrentIndex = 0;
    loadJigsawByCurrentIndex(); // Load the first puzzle
}
       
// --- Helper function to load/build the puzzle for the current video ---
function loadJigsawByCurrentIndex() {
    const videoId = jigsawPlaylist[jigsawCurrentIndex].videoId;

    // The game board itself
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div id="hidden-video-container"></div>
        <div id="puzzle-container"></div>
    `;

    // The controls, which live OUTSIDE the game board
    const gameWrapper = document.getElementById('game-container-wrapper');
    let controlsContainer = document.getElementById('jigsaw-controls-wrapper');
    if (!controlsContainer) {
        controlsContainer = document.createElement('div');
        controlsContainer.id = 'jigsaw-controls-wrapper';
        gameWrapper.appendChild(controlsContainer);
    }
    controlsContainer.innerHTML = `
        <div id="score-display">Moves: 0</div>
        <div id="game-controls-jigsaw">
            <button id="restart-jigsaw-btn" class="btn">Replay Puzzle</button>
            <button id="next-jigsaw-btn" class="btn">Next Puzzle</button>
        </div>
    `;
    
    moveCount = 0; // Reset move count for the new puzzle

    // --- Event Listeners for Controls ---
    document.getElementById('restart-jigsaw-btn').addEventListener('click', () => {
        // Replay just reloads the current index
        loadJigsawByCurrentIndex();
    });
    document.getElementById('next-jigsaw-btn').addEventListener('click', () => {
        // Next increments the index and reloads
        jigsawCurrentIndex++;
        if (jigsawCurrentIndex >= jigsawPlaylist.length) {
            jigsawCurrentIndex = 0; // Loop back to the start
        }
        loadJigsawByCurrentIndex();
    });
  
    // --- Game Setup ---
    new YT.Player('hidden-video-container', {
        videoId: videoId,
        playerVars: { 'autoplay': 1, 'controls': 0, 'loop': 1, 'mute': 1, 'playlist': videoId },
    });

    const puzzleContainer = document.getElementById('puzzle-container');
    const gridSize = 4;
    const totalPieces = gridSize * gridSize;
    let playersReady = 0;
    const pieces = [];

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            piece.dataset.correctX = col * 100;
            piece.dataset.correctY = row * 100;
            const videoWindow = document.createElement('div');
            videoWindow.className = 'video-window';
            piece.appendChild(videoWindow);
            const blocker = document.createElement('div');
            blocker.className = 'video-blocker';
            piece.appendChild(blocker);
            piece.style.left = `${Math.random() * 300}px`;
            piece.style.top = `${Math.random() * 300}px`;
            piece.addEventListener('mousedown', (e) => {
                if (piece.classList.contains('snapped')) return;
                selectedPiece = piece;
                offsetX = e.clientX - piece.getBoundingClientRect().left;
                offsetY = e.clientY - piece.getBoundingClientRect().top;
                document.querySelectorAll('.video-blocker').forEach(b => b.style.display = 'block');
                document.addEventListener('mousemove', handleJigsawMouseMove);
                document.addEventListener('mouseup', handleJigsawMouseUp);
            });
            pieces.push({ pieceEl: piece, videoEl: videoWindow, row: row, col: col });
            puzzleContainer.appendChild(piece);
        }
    }

    function createPlayer(index) {
        if (index >= pieces.length) return;
        const item = pieces[index];
        new YT.Player(item.videoEl, {
            videoId: videoId,
            width: 400,
            height: 400,
            playerVars: { 'autoplay': 1, 'controls': 0, 'loop': 1, 'mute': 1, 'playlist': videoId },
            events: {
                'onReady': (event) => {
                    event.target.getIframe().style.transform = `translate(-${item.col * 100}px, -${item.row * 100}px)`;
                    event.target.getIframe().style.pointerEvents = "none";
                    playersReady++;
                    createPlayer(index + 1);
                }
            }
        });
    }
    createPlayer(0);
}

// --- Game Helper Functions ---
function handleJigsawMouseMove(event) {
    if (!selectedPiece) return;
    const gameContainerRect = document.getElementById('game-container').getBoundingClientRect();
    selectedPiece.style.left = `${event.clientX - gameContainerRect.left - offsetX}px`;
    selectedPiece.style.top = `${event.clientY - gameContainerRect.top - offsetY}px`;
}

function handleJigsawMouseUp() {
    if (!selectedPiece) return;
    const correctX = parseInt(selectedPiece.dataset.correctX);
    const correctY = parseInt(selectedPiece.dataset.correctY);
    const pieceX = parseInt(selectedPiece.style.left);
    const pieceY = parseInt(selectedPiece.style.top);
    if (Math.abs(pieceX - correctX) < 15 && Math.abs(pieceY - correctY) < 15) {
        selectedPiece.style.left = `${correctX}px`;
        selectedPiece.style.top = `${correctY}px`;
        selectedPiece.classList.add('snapped');
        const videoWindow = selectedPiece.querySelector('.video-window');
        if (videoWindow) videoWindow.style.display = "none";
        checkPuzzleCompletion();
    }
    moveCount++;
    document.getElementById('score-display').textContent = `Moves: ${moveCount}`;
    document.removeEventListener('mousemove', handleJigsawMouseMove);
    document.removeEventListener('mouseup', handleJigsawMouseUp);
    document.querySelectorAll('.video-blocker').forEach(b => b.style.display = 'none');
    selectedPiece = null;
}

function checkPuzzleCompletion() {
    const totalPieces = 16;
    const snappedPieces = document.querySelectorAll('.puzzle-piece.snapped').length;
    if (snappedPieces === totalPieces) {
        showVictoryScreen();
    }
}

function showVictoryScreen() {
    const oldOverlay = document.getElementById('victory-overlay');
    if (oldOverlay) oldOverlay.remove();
    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.innerHTML = `
        <h2>Congratulations! 🎉</h2>
        <p>You solved the puzzle in ${moveCount} moves!</p>
        <button id="restart-game-btn" class="btn">Play Again</button>
        <button id="back-to-arcade-btn" class="btn">Choose New Game</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById('restart-game-btn').addEventListener('click', () => {
        loadGame(currentContentId);
        overlay.remove();
    });
    document.getElementById('back-to-arcade-btn').addEventListener('click', () => {
        if (jukeboxPlayer) jukeboxPlayer.stopVideo(); // Stop the music
        document.getElementById('game-container-wrapper').style.display = 'none';
        document.getElementById('game-selection-container').style.display = 'block';
        overlay.remove();
    });
    if (typeof confetti === 'function') {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
    }
}
