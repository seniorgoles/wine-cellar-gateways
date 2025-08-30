// This code loads the YouTube Iframe Player API asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// This variable will hold our video player object.
var player;

// This function is called by the YouTube API when it's ready.
function onYouTubeIframeAPIReady() {
  player = new YT.Player('hero-video', {
    events: {
      'onReady': onPlayerReady
    }
  });
}

// The API will call this function when the video player is ready.
function onPlayerReady(event) {
  // The video is already playing muted because of the URL parameters.
  // We don't need to do anything here, but the function must exist.
}

// === Our Custom Code for the Button ===

// Get the button element from the HTML
const unmuteButton = document.getElementById('unmute-button');

// Add a click event listener to the button
unmuteButton.addEventListener('click', function() {
  // Check if the player exists and has the mute/unmute functions
  if (player && typeof player.isMuted === 'function') {
    
    if (player.isMuted()) {
      // If the video is muted, unmute it.
      player.unMute();
      unmuteButton.classList.remove('muted');
    } else {
      // If the video is not muted, mute it.
      player.mute();
      unmuteButton.classList.add('muted');
    }

  }
});

// ====================================================================
// ===                UPGRADED GATEWAY PLAYER LOGIC                 ===
// ====================================================================

let gatewayData = {}; // This will store our shows.json data
let gatewayPlayer;    // This will be our new YouTube player instance
let currentGatewayKey = '';
let currentVideoIndex = 0;
let gatewayData = {}; // This will store our shows.json data

// --- NEW HELPER FUNCTION: Shuffles an array in place ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

// --- 1. Fetch the show data and initialize the gateways ---
document.addEventListener('DOMContentLoaded', () => {
    fetch('shows.json')
      .then(response => {
          if (!response.ok) {
              throw new Error('Network response was not ok: ' + response.statusText);
          }
          return response.json();
      })
      .then(data => {
        gatewayData = data.gateways;
        console.log("Gateway data loaded successfully!");
        buildGatewayButtons();
      })
      .catch(error => {
          console.error("Fatal Error: Could not load or parse shows.json.", error);
          const buttonContainer = document.getElementById('gateway-buttons');
          if(buttonContainer) buttonContainer.innerHTML = '<p style="color:red;">Error: Could not load show data.</p>';
      });
});

// --- 2. Dynamically build the selection buttons ---
function buildGatewayButtons() {
    const buttonContainer = document.getElementById('gateway-buttons');
    if (!buttonContainer) return;

    // Clear any existing buttons
    buttonContainer.innerHTML = '';

    // Loop through the loaded gateway data and create a button for each show
    for (const key in gatewayData) {
        const show = gatewayData[key];
        const button = document.createElement('button');
        button.className = 'btn';
        button.textContent = show.title; // Use the title from the JSON
        
        // Add description as a hover tooltcommitedip
        button.title = show.description; 
        
        // IMPORTANT: We use an event listener instead of 'onclick' in the HTML
        button.addEventListener('click', () => loadGateway(key));
        
        buttonContainer.appendChild(button);
    }
}

// --- 3. This function is called when a user clicks a Gateway button ---
function loadGateway(gatewayKey) {
  if (!gatewayData[gatewayKey]) {
    console.error("Gateway not found:", gatewayKey);
    return;
  }
  // === THIS IS THE MAGIC LINE TO ADD ===
  shuffleArray(gatewayData[gatewayKey].playlist); 
 
 currentGatewayKey = gatewayKey;
  currentVideoIndex = 0;

  // Show the player and hide the selection buttons
  document.querySelector('.gateway-player-container').style.display = 'block';
  document.getElementById('gateway-selection-container').style.display = 'none';
  document.getElementById('gateway-title').innerText = gatewayData[currentGatewayKey].title;

  if (gatewayPlayer) {
    // If a player exists, just load the new playlist into it
    loadVideoInPlaylist(currentVideoIndex);
  } else {
    // If it's the first time, create the player
    gatewayPlayer = new YT.Player('gateway-player', {
      height: '390',
      width: '640',
      playerVars: {
          'playsinline': 1 // Important for mobile devices
      },
      events: {
        'onReady': onGatewayPlayerReady,
        'onStateChange': onGatewayPlayerStateChange
      }
    });
  }
}

// --- 4. These functions control the playlist ---
function onGatewayPlayerReady(event) {
  loadVideoInPlaylist(currentVideoIndex);
}

function loadVideoInPlaylist(index) {
    const playlist = gatewayData[currentGatewayKey].playlist;
    if (index >= 0 && index < playlist.length) {
        currentVideoIndex = index;
        const video = playlist[index];
        gatewayPlayer.loadVideoById({
            videoId: video.videoId,
            startSeconds: video.startSeconds,
            endSeconds: video.endSeconds
        });
        // Update the main gateway title with the current video's title
        document.getElementById('gateway-title').innerText = `${gatewayData[currentGatewayKey].title} - Now Playing: ${video.title}`;
    } else {
        // End of playlist, show the selection screen again
        goBackToGatewaySelection();
    }
}

function onGatewayPlayerStateChange(event) {
  if (event.data == YT.PlayerState.ENDED) {
    loadVideoInPlaylist(currentVideoIndex + 1);
  }
}

function goBackToGatewaySelection() {
    document.querySelector('.gateway-player-container').style.display = 'none';
    document.getElementById('gateway-selection-container').style.display = 'block';
    if(gatewayPlayer) gatewayPlayer.stopVideo();
}

// --- 5. Add functionality to our Next/Previous buttons (and a new Back button) ---
document.addEventListener('DOMContentLoaded', () => {
    // This button already exists
    document.getElementById('next-video').addEventListener('click', () => {
        loadVideoInPlaylist(currentVideoIndex + 1);
    });
    
    document.getElementById('prev-video').addEventListener('click', () => {
        loadVideoInPlaylist(currentVideoIndex - 1);
    });

    // We can add a "Back to Shows" button for a better user experience
    // Let's create it dynamically in the controls area
    const controls = document.getElementById('gateway-controls');
    if(controls) {
        const backButton = document.createElement('button');
        backButton.id = 'back-to-selection';
        backButton.textContent = 'Back to Shows';
        backButton.addEventListener('click', goBackToGatewaySelection);
        controls.appendChild(backButton);
    }
});
