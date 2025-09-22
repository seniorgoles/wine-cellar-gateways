// ===================================================================
// ===        Memory Match Game Cartridge v1.0                     ===
// ===================================================================

// --- Game-specific State ---
let memoryMatchPlaylist = [];
let score = 0;
let clickCount = 0;
let selectedThumbnail = null;

// --- Main Game Function (called by the engine) ---
function startGame(playlist) {
    if (!playlist || playlist.length < 8) {
        document.getElementById('game-container').innerHTML = '<h2>Error: This game requires at least 8 videos in its playlist.</h2>';
        return;
    }
    memoryMatchPlaylist = playlist;

    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div id="thumbnails-container" class="match-game-container"></div>
        <div id="videos-container" class="match-game-container"></div>
        <div class="scoreboard">
            <p id="score">Score: 0</p>
            <p id="click-count">Clicks: 0</p>
        </div>
    `;

    initializeMemoryMatch();
}

function initializeMemoryMatch() {
    const thumbnailsContainer = document.getElementById('thumbnails-container');
    const videosContainer = document.getElementById('videos-container');
    thumbnailsContainer.innerHTML = '';
    videosContainer.innerHTML = '';
    score = 0;
    clickCount = 0;
    selectedThumbnail = null;
    updateScore();
    updateClickCount();

    // --- THIS IS THE CORRECTED LOGIC ---
    // 1. Shuffle the entire master playlist for this game.
    shuffleArray(memoryMatchPlaylist);

    // 2. Take the first 8 videos from the newly shuffled list.
    const gameVideos = memoryMatchPlaylist.slice(0, 8);
    // --- END OF CORRECTION ---

    const thumbnails = [];
    const videos = [];

    gameVideos.forEach((videoData, index) => {
        const videoId = videoData.videoId;
        thumbnails.push(createThumbnail(videoId, index));
        videos.push(createLiveVideo(videoData, index));
    });

    shuffleArray(thumbnails); // Shuffle the thumbnails for random placement on the board
    thumbnails.forEach(thumb => thumbnailsContainer.appendChild(thumb));
    videos.forEach(video => videosContainer.appendChild(video));

    addMatchingLogic();
}

// --- Element Creation ---
function createThumbnail(videoId, index) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail-match';
    thumbnail.dataset.matchId = index;
    const img = document.createElement('img');
    img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`; // Medium quality for speed
    thumbnail.appendChild(img);
    return thumbnail;
}

function createLiveVideo(videoData, index) {
    const videoSection = document.createElement('div');
    videoSection.className = 'video-section-match';
    videoSection.dataset.matchId = index;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoData.videoId}?autoplay=1&controls=0&mute=1&loop=1&playlist=${videoData.videoId}`;
    iframe.allow = "autoplay; encrypted-media";
    videoSection.appendChild(iframe);
    return videoSection;
}

// --- Game Logic ---
function addMatchingLogic() {
    document.querySelectorAll('.thumbnail-match').forEach(thumbnail => {
        thumbnail.addEventListener('click', () => {
            if (selectedThumbnail) {
                selectedThumbnail.classList.remove('highlight');
            }
            selectedThumbnail = thumbnail;
            thumbnail.classList.add('highlight');
            clickCount++;
            updateClickCount();
        });
    });

    document.querySelectorAll('.video-section-match').forEach(videoSection => {
        videoSection.addEventListener('click', () => {
            if (selectedThumbnail) {
                clickCount++;
                updateClickCount();
                if (selectedThumbnail.dataset.matchId === videoSection.dataset.matchId) {
                    selectedThumbnail.remove();
                    videoSection.remove();
                    selectedThumbnail = null;
                    score++;
                    updateScore();
                    if (score === 8) {
                        if (typeof showVictoryScreen === 'function') {
                            showVictoryScreen();
                        } else {
                            alert('You win!');
                        }
                    }
                } else {
                    alert("Not a match!");
                    selectedThumbnail.classList.remove('highlight');
                    selectedThumbnail = null;
                }
            }
        });
    });
}

// --- UI Updates ---
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}
function updateClickCount() {
    document.getElementById('click-count').textContent = `Clicks: ${clickCount}`;
}

// --- Utility ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showVictoryScreen() {
    const oldOverlay = document.getElementById('victory-overlay');
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.innerHTML = `
        <h2>Congratulations! 🎉</h2>
        <p>You solved the puzzle in ${clickCount} clicks!</p>
        <button id="restart-game-btn" class="btn">Play Again</button>
        <button id="back-to-arcade-btn" class="btn">Choose New Game</button>
    `;
    document.body.appendChild(overlay);

    // Restart THIS game
    document.getElementById('restart-game-btn').addEventListener('click', () => {
        initializeMemoryMatch(); 
        overlay.remove();
    });

    // Back to game selection (check your actual container IDs!)
    document.getElementById('back-to-arcade-btn').addEventListener('click', () => {
    // --- THIS IS THE CORRECTED LOGIC ---
    // Only stop the Jukebox player, if it exists and is playing.
    if (jukeboxPlayer && typeof jukeboxPlayer.stopVideo === 'function') {
        jukeboxPlayer.stopVideo();
    }
    // --- END OF CORRECTION ---



     
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
