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
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

let gatewayData = {}; // This will store our shows.json data
let gatewayPlayer;    // This will be our new YouTube player instance
let currentGatewayKey = '';
let currentVideoIndex = 0;

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
    document.querySelector('.gateway-player-wrapper').style.display = 'none'; // <-- ADD THIS LINE
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
        
        // Add description as a hover tooltip
        button.title = show.description; 
        
        // IMPORTANT: We use an event listener instead of 'onclick' in the HTML
        button.dataset.gatewayKey = key; // Add a data attribute to identify the button
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

  shuffleArray(gatewayData[gatewayKey].playlist); 

  currentGatewayKey = gatewayKey;
  // --- NEW: Highlight the active button ---
  // First, remove the 'active' class from all buttons
  const allButtons = document.querySelectorAll('#gateway-buttons .btn');
  allButtons.forEach(button => button.classList.remove('active'));

  // Now, find the specific button that was clicked and add the 'active' class
  // We need to find the button that corresponds to the gatewayKey
  const buttonsArray = Array.from(allButtons);
  const activeButton = buttonsArray.find(button => button.dataset.gatewayKey === gatewayKey);
  if (activeButton) {
      activeButton.classList.add('active');
  }
  
  currentVideoIndex = 0;

  // Show the player and hide the selection buttons
  document.querySelector('.gateway-player-wrapper').style.display = 'flex';
  
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

    // Check if the requested video index is valid (within the playlist)
    if (index >= 0 && index < playlist.length) {
        currentVideoIndex = index;
        const video = playlist[index];
        
        // Load the video into the player with specified start/end times
        gatewayPlayer.loadVideoById({
            videoId: video.videoId,
            startSeconds: video.startSeconds,
            endSeconds: video.endSeconds
        });
        
        // Update the title to show what's currently playing
        document.getElementById('gateway-title').innerText = `Now Playing: ${video.title}`;
    } else {
        // This runs when the playlist is finished (e.g., trying to load a video beyond the last one)
        if (gatewayPlayer) {
            gatewayPlayer.stopVideo();
        }
        
        // Reset the title to show the name of the playlist that just ended
        document.getElementById('gateway-title').innerText = `Playlist finished: ${gatewayData[currentGatewayKey].title}`;
    }
}



function onGatewayPlayerStateChange(event) {
  if (event.data == YT.PlayerState.ENDED) {
    loadVideoInPlaylist(currentVideoIndex + 1);
  }
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
    });
