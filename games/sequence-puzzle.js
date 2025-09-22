// ===================================================================
// ===    Video Sequence Puzzle Game Cartridge v1.3 (Final Corrected) ===
// ===================================================================

// --- Game-specific State ---
// We no longer declare global variables here. We will use the ones from script.js
let sequencePlaylist = [];
let currentVideoData = {};
// let currentVideoIndex = 0; // DELETED - This was the cause of the error
let backgroundPlayer = null;
let puzzlePieces = [];
let clickCount = 0;

// --- Main Game Function (called by the engine) ---
function startGame(playlist) {
    sequencePlaylist = playlist;
    if (!sequencePlaylist || sequencePlaylist.length === 0) {
        document.getElementById('game-container').innerHTML = '<h2>Error: No video found for this game.</h2>';
        return;
    }
    
    shuffleArray(sequencePlaylist);
    currentVideoIndex = 0; // Use the GLOBAL variable from script.js

    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div id="video-background-sequence"></div>
        <div id="puzzle-container-sequence"></div>
        <div id="board-sequence"></div>
        <div id="score-display">Clicks: 0</div>
        <div id="game-controls-sequence">
            <button id="replay-btn-sequence" class="btn">Replay Full Video</button>
            <button id="new-video-btn-sequence" class="btn">New Video</button>
        </div>
    `;

    loadSequenceGame();
}

// --- Core Game Loop Functions ---
function loadSequenceGame() {
    currentVideoData = sequencePlaylist[currentVideoIndex];
    initializeSequenceGame();
}

function loadNextVideo() {
    currentVideoIndex++;
    if (currentVideoIndex >= sequencePlaylist.length) {
        currentVideoIndex = 0;
    }
    loadSequenceGame();
}

function initializeSequenceGame() {
    clickCount = 0;
    updateClickCount();
    setupBackgroundPlayer(currentVideoData);
    createPuzzlePieces(currentVideoData);
    createGameBoard();
    
    document.getElementById('replay-btn-sequence').addEventListener('click', () => {
        if (backgroundPlayer) backgroundPlayer.seekTo(currentVideoData.startSeconds || 0);
    });
    document.getElementById('new-video-btn-sequence').addEventListener('click', loadNextVideo);
}






function setupBackgroundPlayer(videoData) {
    const videoId = videoData.videoId;
    const start = parseInt(videoData.startSeconds || 0);
    const end = parseInt(videoData.endSeconds);

    if (backgroundPlayer && typeof backgroundPlayer.destroy === 'function') {
        backgroundPlayer.destroy();
    }
    backgroundPlayer = new YT.Player('video-background-sequence', {
        videoId: videoId,
        playerVars: { autoplay: 1, controls: 0, loop: 1, mute: 1, playlist: videoId, start: start, end: end },
        events: { 'onReady': (e) => e.target.playVideo() }
    });
}

function createPuzzlePieces(videoData) {
    const puzzleContainer = document.getElementById('puzzle-container-sequence');
    puzzleContainer.innerHTML = '';
    puzzlePieces = [];
    const videoId = videoData.videoId;
    const start = parseInt(videoData.startSeconds || 0);
    const end = parseInt(videoData.endSeconds);

    if (!end || end <= start) {
        console.error("Invalid start/end times for this video in the playlist.");
        puzzleContainer.innerHTML = '<p style="color:red;">This video has invalid start/end times.</p>';
        return;
    }

    const segmentDuration = (end - start) / 8;
    const indices = Array.from({ length: 8 }, (_, i) => i);
    shuffleArray(indices);

    const pieceWidth = 120;
    const pieceHeight = 120;
    const gap = 10;

    indices.forEach((correctAnswerIndex, i) => {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece-sequence';
        piece.dataset.index = correctAnswerIndex;
        const row = Math.floor(i / 4);
        const col = i % 4;
        piece.style.position = 'absolute';
        piece.style.left = `${col * (pieceWidth + gap)}px`;
        piece.style.top = `${row * (pieceHeight + gap)}px`;
        const videoWindow = document.createElement('div');
        piece.appendChild(videoWindow);
        
        const segmentStart = start + (correctAnswerIndex * segmentDuration);
        
        // --- THIS IS THE NEW GHOST TRAP ---
        new YT.Player(videoWindow, {
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                controls: 0,
                mute: 1
                // REMOVED start, end, loop, and playlist from here. They are unreliable.
            },
            events: {
                'onReady': (event) => {
                    // When the player is ready, FORCE it to the start time and play.
                    event.target.seekTo(segmentStart, true);
                    event.target.playVideo();
                },
                'onStateChange': (event) => {
                    // Our new, robust, manual loop.
                    // We use a setInterval to constantly check the time.
                    if (event.data === YT.PlayerState.PLAYING) {
                        const player = event.target;
                        // Set an interval to check the time every 250ms
                        const timeCheckInterval = setInterval(() => {
                            const currentTime = player.getCurrentTime();
                            // If the time is outside our segment, force it back.
                            if (currentTime < segmentStart || currentTime >= segmentStart + segmentDuration) {
                                player.seekTo(segmentStart, true);
                            }
                        }, 250);

                        // We can store this interval on the player object to clear it later if needed
                        player.timeCheckInterval = timeCheckInterval;
                    }
                }
            }
        });
        // --- END OF GHOST TRAP ---

        puzzleContainer.appendChild(piece);
        puzzlePieces.push(piece);
        piece.addEventListener('mousedown', (e) => startDragging(e, piece));
    });
}







function createGameBoard() {
    const board = document.getElementById('board-sequence');
    board.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'board-slot-sequence';
        slot.dataset.index = i;
        board.appendChild(slot);
    }
}

// --- Drag and Drop & Game Logic ---
   function startDragging(event, piece) {
       clickCount++;
       updateClickCount();
       
       // Bring the selected piece to the front
       piece.style.zIndex = 1000;

       // Get the initial position of the mouse
       const initialMouseX = event.clientX;
       const initialMouseY = event.clientY;

       // Get the initial position of the piece
       const initialPieceX = piece.offsetLeft;
       const initialPieceY = piece.offsetTop;

       function moveAt(e) {
           // Calculate the distance the mouse has moved
           const dx = e.clientX - initialMouseX;
           const dy = e.clientY - initialMouseY;

           // Apply that distance to the piece's original position
           piece.style.left = `${initialPieceX + dx}px`;
           piece.style.top = `${initialPieceY + dy}px`;
       }

       function stopDragging() {
           document.removeEventListener('mousemove', moveAt);
           document.removeEventListener('mouseup', stopDragging);
           piece.style.zIndex = 'auto'; // Return to normal layer
           checkPlacement(piece);
       }

       document.addEventListener('mousemove', moveAt);
       document.addEventListener('mouseup', stopDragging);
   }

function checkPlacement(piece) {
    const slots = document.querySelectorAll('.board-slot-sequence');
    const pieceRect = piece.getBoundingClientRect();
    let snapped = false;

    for (let slot of slots) {
        const slotRect = slot.getBoundingClientRect();
        if (Math.abs(pieceRect.left - slotRect.left) < 30 && Math.abs(pieceRect.top - slotRect.top) < 30) {
            if (slot.dataset.index === piece.dataset.index) {
                slot.appendChild(piece);
                piece.style.position = 'relative'; // Lock it inside the slot
                piece.style.left = '0';
                piece.style.top = '0';
                piece.classList.add('correct');
                slot.classList.add('correct');
                snapped = true;
                break; // Stop checking once snapped
            }
        }
    }
    
    // ** FIX for Bug #3: The missing confetti **
    // We must check for completion AFTER a piece has been successfully snapped.
    if (snapped && checkCompletion()) {
        // We need to find the victory screen function. Let's assume it's in the main script.
        showVictoryScreen(clickCount);
       
    }
}

function checkCompletion() {
    return document.querySelectorAll('.puzzle-piece-sequence.correct').length === 8;
}

function updateClickCount() {
    document.getElementById('score-display').innerText = `Clicks: ${clickCount}`;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

   function showVictoryScreen(finalClickCount) {
       const oldOverlay = document.getElementById('victory-overlay');
       if (oldOverlay) oldOverlay.remove();

       const overlay = document.createElement('div');
       overlay.id = 'victory-overlay';
       overlay.innerHTML = `
           <h2>Congratulations! 🎉</h2>
           <p>You solved the sequence in ${finalClickCount} clicks!</p>
           <button id="restart-game-btn" class="btn">Play Again</button>
           <button id="back-to-arcade-btn" class="btn">Choose New Game</button>
       `;
       document.body.appendChild(overlay);

       document.getElementById('restart-game-btn').addEventListener('click', () => {
           // To restart, we just re-initialize the game
           initializeSequenceGame(); 
           overlay.remove();
       });
       document.getElementById('back-to-arcade-btn').addEventListener('click', () => {
         // --- THIS IS THE CORRECTED LOGIC ---
    // Only stop the Jukebox player, if it exists and is playing.
    if (jukeboxPlayer && typeof jukeboxPlayer.stopVideo === 'function') {
        jukeboxPlayer.stopVideo();
    }
    // --- END OF CORRECTION ---    
    
    
    
    // Go back to the game selection screen
           document.getElementById('game-container-wrapper').style.display = 'none';
           document.getElementById('game-selection-container').style.display = 'block';
           overlay.remove();
       });

       // Trigger the confetti!
       if (typeof confetti === 'function') {
           confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
       }
   }
