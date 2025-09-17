// ====================================================================
// === Whispers of Aurorachrome - Main Script v4.1 (SENSEI VERIFIED) ===
// ====================================================================

// --- Global State ---
let siteData = {};
let gatewayPlayer;
let jukeboxPlayer; // <-- NEW
let isMuted = true; // <-- NEW: Master mute state
let currentContentId = '';
let currentVideoIndex = 0;
let currentWorldId = '';
const ITEMS_PER_PAGE = 5;
let worldsCurrentPage = 0;
let contentCurrentPage = 0;
let currentGameScript = null;



// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetch('shows.json')
      .then(response => { if (!response.ok) throw new Error('Network error'); return response.json(); })
      .then(data => {
        siteData = data;
        console.log("Site data loaded!", siteData);
        initializePage();
      })
      .catch(error => console.error("Fatal Error loading shows.json:", error));
});

function initializePage() {
    setupBackgrounds();
    buildWorldsCarousel();
    buildSiteLinks();
    setupCarouselControls();
    setupJukebox(); // <-- ADD THIS
    setupUniversalMute(); // <-- AND THIS
     
    document.getElementById('back-to-arcade-selection-btn').addEventListener('click', () => {
        window.location.hash = '#arcade';
        window.location.reload();
    });
    // --- ADD THIS NEW EVENT LISTENER ---
    // Listener for the back button on the ARCADE MENU
    document.getElementById('back-to-worlds-from-arcade-btn').addEventListener('click', () => {
        if (jukeboxPlayer) jukeboxPlayer.stopVideo(); // Stop the music
        document.getElementById('arcade-section').style.display = 'none';
        document.getElementById('hero-section').style.display = 'flex';
    });


    const hash = window.location.hash;
    if (hash.startsWith('#game=')) {
        const gameIdToLoad = hash.substring(6);
        setTimeout(() => {
            selectWorld('the_arcade');
            const gameButton = document.querySelector(`#arcade-buttons .btn[data-content-key='${gameIdToLoad}']`);
            if (gameButton) gameButton.click();
        }, 100);
    } else if (hash === '#arcade') {
        setTimeout(() => {
            selectWorld('the_arcade');
        }, 100);
    }
    if (hash) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
}








// --- Carousel and Button Building ---
function buildWorldsCarousel() {
    const container = document.getElementById('worlds-buttons');
    const allWorlds = siteData.worlds ? Object.values(siteData.worlds) : [];
    if (!container || allWorlds.length === 0) return;
    const totalPages = Math.ceil(allWorlds.length / ITEMS_PER_PAGE);
    container.innerHTML = '';
    const startIndex = worldsCurrentPage * ITEMS_PER_PAGE;
    const pageWorlds = allWorlds.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    pageWorlds.forEach(world => {
        const button = createDynamicButton(world, 'world');
        button.addEventListener('click', () => selectWorld(world.worldId));
        container.appendChild(button);
    });
    updateCarouselNav('worlds', totalPages, worldsCurrentPage);
}

function buildContentCarousel() {
    const containerId = (currentWorldId === 'the_arcade') ? '#arcade-buttons' : '#content-buttons';
    const container = document.querySelector(containerId);
    let allContent = siteData.content ? Object.values(siteData.content).filter(item => item.worldId === currentWorldId) : [];
    if (!container) return;

    console.log(`Building content for world '${currentWorldId}'. Found ${allContent.length} items.`);
    const totalPages = Math.ceil(allContent.length / ITEMS_PER_PAGE);
    container.innerHTML = '';
    const startIndex = contentCurrentPage * ITEMS_PER_PAGE;
    const pageContent = allContent.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    pageContent.forEach(item => {
        const button = createDynamicButton(item, 'content');
        if (item.worldId === 'the_arcade') {
            button.addEventListener('click', () => loadGame(item.contentId));
        } else {
            button.addEventListener('click', () => loadContent(item.contentId));
        }
        container.appendChild(button);
    });
    const navType = (currentWorldId === 'the_arcade') ? 'arcade' : 'content';
    updateCarouselNav(navType, totalPages, contentCurrentPage);
}

function createDynamicButton(item, type) {
    const button = document.createElement('button');
    button.className = `btn btn-${type}`;
    if (type === 'content') {
        button.setAttribute('data-content-type', item.type + 's');
    }
    button.title = item.description || '';
    button.textContent = item.title;
    if (item.buttonImage) {
        button.style.backgroundImage = `url('images/${item.buttonImage}')`;
        button.setAttribute('aria-label', item.title);
        button.style.color = 'transparent';
    }
    return button;
}

// --- Navigation and State Changes ---
function selectWorld(worldId) {
    silenceAllAudio(); 
    currentWorldId = worldId;
    contentCurrentPage = 0;
    console.log(`World selected: ${currentWorldId}`);
    if (worldId === 'the_arcade') {
        document.getElementById('hero-section').style.display = 'none';
        document.getElementById('theater-section').style.display = 'none';
        document.getElementById('arcade-section').style.display = 'flex';
        document.getElementById('game-selection-container').style.display = 'block';
        document.getElementById('game-container-wrapper').style.display = 'none';
        buildContentCarousel();
        const arcadeBgWrapper = document.querySelector('#arcade-section .background-video-wrapper');
        if (arcadeBgWrapper) {
            arcadeBgWrapper.innerHTML = '';
            const bgVideoId = siteData.siteConfig?.heroBgVideoId;
            if (bgVideoId) arcadeBgWrapper.appendChild(createBgVideo(bgVideoId));
        }
    } else {
        document.getElementById('hero-section').style.display = 'flex';
        document.getElementById('arcade-section').style.display = 'none';
        const theaterSection = document.getElementById('theater-section');
        theaterSection.style.display = 'block';
        buildContentCarousel();
        theaterSection.scrollIntoView({ behavior: 'smooth' });
        const theaterBgWrapper = document.querySelector('#theater-section .background-video-wrapper');
        if (theaterBgWrapper) {
            theaterBgWrapper.innerHTML = '';
            const bgVideoId = siteData.siteConfig?.gatewaysBgVideoId;
            if (bgVideoId) theaterBgWrapper.appendChild(createBgVideo(bgVideoId));
        }
    }
}

   // ===================================================================
   // ===                   JUKEBOX LOGIC                           ===
   // ===================================================================

   function setupJukebox() {
       const openBtn = document.getElementById('jukebox-open-btn');
       const closeBtn = document.getElementById('jukebox-close-btn');
       const overlay = document.getElementById('jukebox-overlay');

       openBtn.addEventListener('click', () => {
           overlay.style.display = 'flex';
           buildJukeboxCarousel();
       });

       closeBtn.addEventListener('click', () => {
           overlay.style.display = 'none';
       });
   }

   function buildJukeboxCarousel() {
       const container = document.getElementById('jukebox-buttons');
       // We'll use the "gateways" content for our music
       const allMusic = siteData.content ? Object.values(siteData.content).filter(item => item.type === 'gateway') : [];
       if (!container || allMusic.length === 0) return;

       // This is a simplified carousel builder for the jukebox
       container.innerHTML = '';
       allMusic.forEach(item => {
           const button = createDynamicButton(item, 'content');
           button.addEventListener('click', () => {
               playJukeboxPlaylist(item.playlist);
               document.getElementById('jukebox-overlay').style.display = 'none'; // Close overlay on selection
           });
           container.appendChild(button);
       });
       // Note: For simplicity, this first version doesn't have prev/next buttons.
   }

   function playJukeboxPlaylist(playlist) {
       if (!playlist || playlist.length === 0) return;
       silenceAllAudio(); // First, stop any old music
       startAudioPlayback(); // THEN, set the state to "playing"

       const playlistIds = playlist.map(video => video.videoId);
       
       if (jukeboxPlayer) {
           // If player exists, load the new playlist
           jukeboxPlayer.loadPlaylist(playlistIds);
       } else {
           // If it's the first time, create the player
           jukeboxPlayer = new YT.Player('jukebox-player-container', {
               height: '1', // Must have a size, but can be tiny
               width: '1',
               playerVars: {
                   'controls': 0,
                   'enablejsapi': 1
               },
               events: {
                   'onReady': () => {
                       jukeboxPlayer.loadPlaylist(playlistIds);
                       if (isMuted) {
                           jukeboxPlayer.mute();
                       }
                   }
               }
           });
       }
   }

   function setupUniversalMute() {
       const muteBtn = document.getElementById('universal-mute-btn');
       muteBtn.addEventListener('click', () => {
           if (isMuted) {
               // If we are currently muted, unmute everything
               startAudioPlayback();
           } else {
               // If we are currently unmuted, mute everything
               silenceAllAudio();
           }
       });
   }











// --- Theater Player Logic ---
function loadContent(contentId) {
    silenceAllAudio(); // First, stop any old music
    startAudioPlayback(); // THEN, set the state to "playing"
    const contentData = siteData.content[contentId];
    if (!contentData) return;
    currentContentId = contentId;
    currentVideoIndex = 0;
    if (contentData.playlist) shuffleArray(contentData.playlist);
    createSidebarVideo(contentData.leftSidebarVideoId, document.getElementById('left-sidebar'));
    createSidebarVideo(contentData.rightSidebarVideoId, document.getElementById('right-sidebar'));
    document.querySelectorAll('#content-buttons .btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`#content-buttons .btn[aria-label='${contentData.title}']`)?.classList.add('active');
    if (gatewayPlayer) {
        loadVideoInPlaylist(0);
    } else {
        gatewayPlayer = new YT.Player('gateway-player', {
             events: { 'onReady': onGatewayPlayerReady, 'onStateChange': onGatewayPlayerStateChange }
        });
    }
}

function onGatewayPlayerReady(event) {
    setupPlayerControls();
    loadVideoInPlaylist(currentVideoIndex);
    event.target.addEventListener('onStateChange', onGatewayPlayerStateChange);
}

function loadVideoInPlaylist(index) {
    if (!gatewayPlayer || typeof gatewayPlayer.loadVideoById !== 'function') return;
    const playlist = siteData.content[currentContentId].playlist;
    if (index >= 0 && index < playlist.length) {
        currentVideoIndex = index;
        const video = playlist[index];
        gatewayPlayer.loadVideoById({
            videoId: video.videoId,
            startSeconds: parseInt(video.startSeconds || 0),
            endSeconds: parseInt(video.endSeconds || 0)
        });
        document.getElementById('gateway-title').innerText = `Now Playing: ${video.title}`;
        updateUpNextDisplay();
    } else {
        if(gatewayPlayer.stopVideo) gatewayPlayer.stopVideo();
        const mainTitle = siteData.content[currentContentId].title;
        document.getElementById('gateway-title').innerText = `Playlist finished: ${mainTitle}`;
        updateUpNextDisplay();
    }
}

function onGatewayPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        const playlist = siteData.content[currentContentId].playlist;
        const nextVideoIndex = (currentVideoIndex + 1) % playlist.length;
        loadVideoInPlaylist(nextVideoIndex);
    }
}

// --- Arcade Game Engine ---
function loadGame(contentId) {
    if (currentGameScript) {
        window.location.hash = `game=${contentId}`;
        window.location.reload();
        return;
    }
    document.getElementById('game-selection-container').style.display = 'none';
    const gameWrapper = document.getElementById('game-container-wrapper');
    gameWrapper.style.display = 'block';
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = '';
    const gameData = siteData.content[contentId];
    if (!gameData || !gameData.scriptFile) {
        gameContainer.innerHTML = '<h2>Error: Game data not found.</h2>';
        return;
    }
    const gameType = gameData.scriptFile.replace('.js', '');
    gameWrapper.setAttribute('data-active-game', gameType);
    gameContainer.setAttribute('data-game-type', gameType);
    document.getElementById('game-title').textContent = gameData.title;
    document.getElementById('game-instructions').textContent = gameData.game_play || ''; // Use the data or be blank if it's missing

    currentContentId = contentId;
    const scriptPath = `games/${gameData.scriptFile}`;
    currentGameScript = document.createElement('script');
    currentGameScript.src = scriptPath;
    currentGameScript.onload = () => {
        console.log(`Cartridge "${gameData.scriptFile}" loaded.`);
        if (typeof startGame === 'function') {
            startGame(gameData.playlist);
        } else {
            gameContainer.innerHTML = `<h2>Error: startGame not found in ${gameData.scriptFile}.</h2>`;
        }
    };
    currentGameScript.onerror = () => {
        gameContainer.innerHTML = '<h2>Error: Could not load game file.</h2>';
    };
    document.body.appendChild(currentGameScript);
}

// ===================================================================
// ===        UNIVERSAL HELPER FUNCTIONS (SENSEI VERIFIED)         ===
// ===================================================================

function setupBackgrounds() {
    const heroWrapper = document.querySelector('#hero-section .background-video-wrapper');
    if (heroWrapper && siteData.siteConfig?.heroBgVideoId) {
        heroWrapper.appendChild(createBgVideo(siteData.siteConfig.heroBgVideoId));
    }
}

function setupPlayerControls() {
    document.getElementById('next-video').addEventListener('click', () => loadVideoInPlaylist(currentVideoIndex + 1));
    document.getElementById('prev-video').addEventListener('click', () => loadVideoInPlaylist(currentVideoIndex - 1));
}

function updateUpNextDisplay() {
    const upNextList = document.getElementById('up-next-list');
    if (!upNextList) return;
    upNextList.innerHTML = '';
    const playlist = siteData.content[currentContentId].playlist;
    let upNextCount = 0;
    for (let i = 1; i <= 3; i++) {
        const nextIndex = currentVideoIndex + i;
        if (nextIndex < playlist.length) {
            const nextVideo = playlist[nextIndex];
            const listItem = document.createElement('li');
            listItem.textContent = nextVideo.title;
            upNextList.appendChild(listItem);
            upNextCount++;
        }
    }
    if (upNextCount === 0) {
        const endMessage = document.createElement('li');
        endMessage.textContent = "You've reached the end of the playlist!";
        endMessage.style.listStyle = 'none';
        upNextList.appendChild(endMessage);
    }
}

function setupCarouselControls() {
    document.getElementById('worlds-carousel-prev').addEventListener('click', () => {
        if (worldsCurrentPage > 0) { worldsCurrentPage--; buildWorldsCarousel(); }
    });
    document.getElementById('worlds-carousel-next').addEventListener('click', () => {
        const allWorlds = siteData.worlds ? Object.keys(siteData.worlds).length : 0;
        const totalPages = Math.ceil(allWorlds / ITEMS_PER_PAGE);
        if (worldsCurrentPage < totalPages - 1) { worldsCurrentPage++; buildWorldsCarousel(); }
    });
    document.getElementById('content-carousel-prev').addEventListener('click', () => {
        if (contentCurrentPage > 0) { contentCurrentPage--; buildContentCarousel(); }
    });
    document.getElementById('content-carousel-next').addEventListener('click', () => {
        const allContent = siteData.content ? Object.values(siteData.content).filter(item => item.worldId === currentWorldId).length : 0;
        const totalPages = Math.ceil(allContent / ITEMS_PER_PAGE);
        if (contentCurrentPage < totalPages - 1) { contentCurrentPage++; buildContentCarousel(); }
    });
    document.getElementById('arcade-carousel-prev').addEventListener('click', () => {
        if (contentCurrentPage > 0) { contentCurrentPage--; buildContentCarousel(); }
    });
    document.getElementById('arcade-carousel-next').addEventListener('click', () => {
        const allContent = siteData.content ? Object.values(siteData.content).filter(item => item.worldId === 'the_arcade').length : 0;
        const totalPages = Math.ceil(allContent / ITEMS_PER_PAGE);
        if (contentCurrentPage < totalPages - 1) { contentCurrentPage++; buildContentCarousel(); }
    });
}

function updateCarouselNav(type, totalPages, currentPage) {
    const prevBtn = document.getElementById(`${type}-carousel-prev`);
    const nextBtn = document.getElementById(`${type}-carousel-next`);
    if (!prevBtn || !nextBtn) return;
    if (totalPages <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
        prevBtn.disabled = (currentPage === 0);
        nextBtn.disabled = (currentPage >= totalPages - 1);
    }
}

function createBgVideo(videoId) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1`;
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; encrypted-media';
    return iframe;
}

function createSidebarVideo(videoId, container) {
    if (!videoId) { container.innerHTML = '<div class="video-placeholder"></div>'; return; }
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1`;
    container.appendChild(iframe);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function buildSiteLinks() {
    const container = document.getElementById('site-links-container');
    if (!container || !siteData.siteLinks) return;
    container.innerHTML = '';
    siteData.siteLinks.forEach(link => {
        if (link.linkText && link.linkUrl) {
            const a = document.createElement('a');
            a.href = link.linkUrl;
            a.textContent = link.linkText;
            a.target = '_blank';
            container.appendChild(a);
        }
    });
}

   function silenceAllAudio() {
       console.log("Silencing all audio sources.");
       if (gatewayPlayer && typeof gatewayPlayer.stopVideo === 'function') {
           gatewayPlayer.stopVideo();
       }
       if (jukeboxPlayer && typeof jukeboxPlayer.stopVideo === 'function') {
           jukeboxPlayer.stopVideo();
       }
       
       // --- THIS IS THE CRITICAL PART ---
       // Update the master state and the button's appearance
       isMuted = true;
       document.getElementById('universal-mute-btn').classList.add('muted');
   }

   function startAudioPlayback() {
       console.log("Audio playback requested. Unmuting.");
       
       // --- THIS IS THE CRITICAL PART ---
       // Update the master state and the button's appearance
       isMuted = false;
       document.getElementById('universal-mute-btn').classList.remove('muted');

       // Unmute any active players
       if (gatewayPlayer && typeof gatewayPlayer.unMute === 'function') {
           gatewayPlayer.unMute();
       }
       if (jukeboxPlayer && typeof jukeboxPlayer.unMute === 'function') {
           jukeboxPlayer.unMute();
       }
   }







function onYouTubeIframeAPIReady() {}







