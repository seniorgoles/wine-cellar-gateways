// ====================================================================
// ===   Whispers of Aurorachrome - Main Script v3.1 (Final Clean)  ===
// ====================================================================

// --- Global State ---
let siteData = {};
let gatewayPlayer;
let currentContentId = '';
let currentVideoIndex = 0;
let currentWorldId = ''; // This will store the currently active world

// Carousel State
const ITEMS_PER_PAGE = 5;
let worldsCurrentPage = 0;
let contentCurrentPage = 0;

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
}

function setupBackgrounds() {
    const heroWrapper = document.querySelector('#hero-section .background-video-wrapper');
    if (heroWrapper && siteData.siteConfig?.heroBgVideoId) {
        heroWrapper.appendChild(createBgVideo(siteData.siteConfig.heroBgVideoId));
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
    const container = document.getElementById('content-buttons');
    // Let's see what we're working with
    console.log("Current World ID to filter by:", currentWorldId);
    console.log("All content items:", Object.values(siteData.content || {}));




    const allContent = siteData.content ? Object.values(siteData.content).filter(item => item.worldId === currentWorldId) : [];
    if (!container) return;
    
    console.log(`Building content for world '${currentWorldId}'. Found ${allContent.length} items.`);

    const totalPages = Math.ceil(allContent.length / ITEMS_PER_PAGE);
    container.innerHTML = '';
    const startIndex = contentCurrentPage * ITEMS_PER_PAGE;
    const pageContent = allContent.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    pageContent.forEach(item => {
        const button = createDynamicButton(item, 'content');
        button.addEventListener('click', () => loadContent(item.contentId));
        container.appendChild(button);
    });
    updateCarouselNav('content', totalPages, contentCurrentPage);
}

function createDynamicButton(item, type) {
    const button = document.createElement('button');
    
    // Set the base classes
    button.className = `btn btn-${type}`; // e.g., btn-world or btn-content
    
    // --- THIS IS THE CRITICAL FIX ---
    // Add the data attribute that our CSS is looking for
    if (type === 'content') {
        button.setAttribute('data-content-type', item.type + 's'); // e.g., 'wine' -> 'wines'
    }
    // --- END OF CRITICAL FIX ---

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
    currentWorldId = worldId; // Set the global state for the current world
    contentCurrentPage = 0;   // Reset content page to the beginning
    console.log(`World selected: ${currentWorldId}`);
    
    const theaterSection = document.getElementById('theater-section');
    theaterSection.style.display = 'block';
    theaterSection.scrollIntoView({ behavior: 'smooth' });

    buildContentCarousel(); // Build the content for the newly selected world

    const theaterBgWrapper = document.querySelector('#theater-section .background-video-wrapper');
    if (theaterBgWrapper) {
        theaterBgWrapper.innerHTML = '';
        const bgVideoId = siteData.siteConfig?.gatewaysBgVideoId; // Default for now
        if (bgVideoId) {
            theaterBgWrapper.appendChild(createBgVideo(bgVideoId));
        }
    }
}

function loadContent(contentId) {
    const contentData = siteData.content[contentId];
    if (!contentData) return;

    currentContentId = contentId;
    currentVideoIndex = 0;

    if (contentData.playlist) {
        shuffleArray(contentData.playlist);
    }
    
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

// --- Carousel Control Logic ---

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

// --- Player Logic ---
function onYouTubeIframeAPIReady() {}

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
        updateUpNextDisplay(); // <-- CALL THE NEW FUNCTION HERE
    } else {
        if(gatewayPlayer.stopVideo) gatewayPlayer.stopVideo();
        const mainTitle = siteData.content[currentContentId].title;
        document.getElementById('gateway-title').innerText = `Playlist finished: ${mainTitle}`;
        updateUpNextDisplay(); // <-- AND CALL IT HERE TO SHOW THE END MESSAGE
    }
}

function onGatewayPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        const playlist = siteData.content[currentContentId].playlist;
        const nextVideoIndex = (currentVideoIndex + 1) % playlist.length;
        loadVideoInPlaylist(nextVideoIndex);
    }
}

    function updateUpNextDisplay() {
    const upNextList = document.getElementById('up-next-list');
    if (!upNextList) return; // Exit if the element doesn't exist

    // Clear the previous list
    upNextList.innerHTML = '';

    const playlist = siteData.content[currentContentId].playlist;
    let upNextCount = 0;

    // Loop to find the next 3 videos
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

    // If we're at the end of the playlist, show a message
    if (upNextCount === 0) {
        const endMessage = document.createElement('li');
        endMessage.textContent = "You've reached the end of the playlist!";
        endMessage.style.listStyle = 'none'; // No number for this message
        upNextList.appendChild(endMessage);
    }
}










function setupPlayerControls() {
    document.getElementById('next-video').addEventListener('click', () => loadVideoInPlaylist(currentVideoIndex + 1));
    document.getElementById('prev-video').addEventListener('click', () => loadVideoInPlaylist(currentVideoIndex - 1));
}

// --- Universal Helper Functions (must be present) ---
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
