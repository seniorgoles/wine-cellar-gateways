// ====================================================================
// ===          YOUTUBE IFRAME API LOADER (CRITICAL CODE)           ===
// ====================================================================
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
// ====================================================================


// ====================================================================
// ===       Whispers Wine Cellar - Main Script v2.2 (Corrected)    ===
// ====================================================================

// --- Global Variables ---
let siteData = {};
let gatewayPlayer;
let currentContentKey = '';
let currentContentType = '';
let currentVideoIndex = 0;

// --- Helper Functions ---
function createBgVideo(videoId) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1`;
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; encrypted-media';
    return iframe;
}

function createSidebarVideo(videoId, container) {
    if (!videoId) {
        container.innerHTML = '<div class="video-placeholder"></div>';
        return;
    }
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

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetch('shows.json')
      .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
      })
      .then(data => {
        siteData = data;
        console.log("Site data loaded successfully!", siteData);
        initializePage();
      })
      .catch(error => {
          console.error("Fatal Error: Could not load or parse shows.json.", error);
      });
});

function initializePage() {
    if (siteData.siteConfig?.heroBgVideoId) {
        document.getElementById('hero-video-wrapper').appendChild(createBgVideo(siteData.siteConfig.heroBgVideoId));
    }
    if (siteData.siteConfig?.winesBgVideoId) {
        document.querySelector('#our-wines .background-video-wrapper').appendChild(createBgVideo(siteData.siteConfig.winesBgVideoId));
    }
    if (siteData.siteConfig?.gatewaysBgVideoId) {
        document.querySelector('#gateways .background-video-wrapper').appendChild(createBgVideo(siteData.siteConfig.gatewaysBgVideoId));
    }
    buildDynamicButtons('wines', '#wine-buttons-container');
    buildDynamicButtons('gateways', '#gateway-buttons');
    buildSiteLinks();
   
}

function buildDynamicButtons(type, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container || !siteData.content || !siteData.content[type]) return;
    container.innerHTML = '';
    for (const key in siteData.content[type]) {
        const item = siteData.content[type][key];
        const button = document.createElement('button');
        button.className = 'btn';
        button.textContent = item.title;
        button.title = item.description;
        button.dataset.contentKey = key;
        button.dataset.contentType = type;
        button.addEventListener('click', () => loadContent(type, key));
        container.appendChild(button);
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

// --- Player Logic ---
function onYouTubeIframeAPIReady() {
  // This function is CALLED BY THE YOUTUBE API. It does nothing on its own.
  // We will create the player instance on the first click.
}

function loadContent(type, key) {
    const contentData = siteData.content[type][key];
    if (!contentData) {
        console.error("Content not found:", type, key);
        return;
    }
    
    // --- 1. PREPARE DATA ---
    currentContentType = type;
    currentContentKey = key;
    currentVideoIndex = 0;

    if (contentData.playlist) {
        shuffleArray(contentData.playlist);
    }
    
    // --- 2. UPDATE VISUALS ---
    createSidebarVideo(contentData.leftSidebarVideoId, document.getElementById('left-sidebar'));
    createSidebarVideo(contentData.rightSidebarVideoId, document.getElementById('right-sidebar'));
    
    // Highlight the active button
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    // Use a more robust selector to find the button
    const activeButton = document.querySelector(`.btn[data-content-key='${key}']`);
    if (activeButton) activeButton.classList.add('active');

    // ** THIS IS THE CRITICAL FIX **
    // Find the wrapper and explicitly set its display style to flex
    const playerWrapper = document.querySelector('.gateway-player-wrapper');
    if (playerWrapper) {
        playerWrapper.style.display = 'flex';
    } else {
        console.error("FATAL: Could not find .gateway-player-wrapper element!");
    }
    
    // --- 3. LOAD OR CREATE THE PLAYER ---
    if (gatewayPlayer && typeof gatewayPlayer.loadVideoById === 'function') {
        loadVideoInPlaylist(0);
    } else {
        gatewayPlayer = new YT.Player('gateway-player', {
            playerVars: { 'playsinline': 1 },
            events: {
                'onReady': onGatewayPlayerReady,
                'onStateChange': onGatewayPlayerStateChange
            }
        });
    }
}

function onGatewayPlayerReady(event) {
    // This function is only called ONCE by the API when the player is first created and ready.
    setupPlayerControls(); // <-- ADD THE CALL HERE. IT IS NOW SAFE

    // NOW it's safe to load the video.
    loadVideoInPlaylist(currentVideoIndex);
    
   // Add the state change listener only once the player is ready
    event.target.addEventListener('onStateChange', onGatewayPlayerStateChange);  
}

function loadVideoInPlaylist(index) {
    // Check if the player and its functions are actually ready before trying to use them.
    if (!gatewayPlayer || typeof gatewayPlayer.loadVideoById !== 'function') {
        console.error("Player is not ready or does not exist.");
        return;
    }

    const playlist = siteData.content[currentContentType][currentContentKey].playlist;
    if (index >= 0 && index < playlist.length) {
        currentVideoIndex = index;
        const video = playlist[index];
        gatewayPlayer.loadVideoById({
            videoId: video.videoId,
            startSeconds: parseInt(video.startSeconds || 0),
            endSeconds: parseInt(video.endSeconds || 0)
        });
        document.getElementById('gateway-title').innerText = `Now Playing: ${video.title}`;
    } else {
        if(gatewayPlayer.stopVideo) gatewayPlayer.stopVideo();
        const mainTitle = siteData.content[currentContentType][currentContentKey].title;
        document.getElementById('gateway-title').innerText = `Playlist finished: ${mainTitle}`;
    }
}

function onGatewayPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        loadVideoInPlaylist(currentVideoIndex + 1);
    }
}

function setupPlayerControls() {
    document.getElementById('next-video').addEventListener('click', () => {
        loadVideoInPlaylist(currentVideoIndex + 1);
    });
    
    document.getElementById('prev-video').addEventListener('click', () => {
        loadVideoInPlaylist(currentVideoIndex - 1);
    });
}
