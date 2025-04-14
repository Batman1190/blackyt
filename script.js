// Import configuration and Firebase
import { YOUTUBE_CONFIG } from './config.js';
import { auth, provider, signInWithPopup, onAuthStateChanged, signOut } from './firebase-config.js';

// DOM Elements
const videoContainer = document.getElementById('video-container');
const videoPlayerContainer = document.getElementById('video-player-container');
const closePlayerBtn = document.getElementById('close-player');
const authButton = document.getElementById('auth-button');
const authModal = document.getElementById('auth-modal');
const googleSignInBtn = document.getElementById('google-sign-in');
const searchInput = document.querySelector('.search-box input');
const searchButton = document.querySelector('.search-box button');
const loadingSpinner = document.getElementById('loading');

// App State
const appState = {
    currentVideo: null,
    searchQuery: '',
    isLoading: false,
    watchHistory: []
};

// Load watch history from storage
function loadWatchHistory() {
    const user = auth.currentUser;
    if (user) {
        // If user is logged in, load from Firebase (implement later)
        return [];
    } else {
        // Load from local storage
        const history = localStorage.getItem('watchHistory');
        return history ? JSON.parse(history) : [];
    }
}

// Save watch history to storage
function saveWatchHistory() {
    const user = auth.currentUser;
    if (user) {
        // If user is logged in, save to Firebase (implement later)
    } else {
        // Save to local storage
        localStorage.setItem('watchHistory', JSON.stringify(appState.watchHistory));
    }
}

// Add video to watch history
function addToHistory(videoId, videoData) {
    const timestamp = new Date().toISOString();
    const historyEntry = {
        videoId,
        title: videoData.title,
        thumbnail: videoData.thumbnails?.medium?.url,
        channelTitle: videoData.channelTitle,
        watchedAt: timestamp
    };
    
    // Remove if already exists and add to beginning
    appState.watchHistory = appState.watchHistory.filter(v => v.videoId !== videoId);
    appState.watchHistory.unshift(historyEntry);
    
    // Keep only last 50 videos
    if (appState.watchHistory.length > 50) {
        appState.watchHistory.pop();
    }
    
    saveWatchHistory();
}

// Utility Functions
function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// YouTube API Functions
async function fetchTrendingVideos(regionCode = 'US') {
    try {
        const apiKey = YOUTUBE_CONFIG.getAPIKey();
        if (!apiKey) {
            throw new Error('No YouTube API keys available');
        }
        showLoading();
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=24&regionCode=${regionCode}&key=${apiKey}`);
        if (!response.ok) throw new Error('Failed to fetch trending videos');
        const data = await response.json();
        displayVideos(data.items);
    } catch (error) {
        console.error('Error fetching trending videos:', error);
        showError('Failed to load trending videos. Please try again.');
    } finally {
        hideLoading();
    }
}

async function fetchRecommendedVideos() {
    return fetchTrendingVideos('US');
}

async function searchVideos(query) {
    try {
        const apiKey = YOUTUBE_CONFIG.getAPIKey();
        if (!apiKey) {
            throw new Error('No YouTube API keys available');
        }
        showLoading();
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=24&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        displayVideos(data.items);
    } catch (error) {
        console.error('Search error:', error);
        const errorMessage = error.message === 'No YouTube API keys available' 
            ? 'No YouTube API keys are available. Please check your configuration.'
            : 'Failed to search videos. Please try again.';
        showError(errorMessage);
    } finally {
        hideLoading();
    }
}

async function fetchVideoStatistics(videoId, videoCard) {
    try {
        const apiKey = YOUTUBE_CONFIG.getAPIKey();
        if (!apiKey) return;
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`);
        if (!response.ok) throw new Error('Failed to fetch video statistics');
        const data = await response.json();
        if (data.items && data.items[0]) {
            const stats = data.items[0].statistics;
            const viewCount = parseInt(stats.viewCount).toLocaleString();
            videoCard.querySelector('.views').textContent = `${viewCount} views`;
        }
    } catch (error) {
        console.error('Error fetching video statistics:', error);
        videoCard.querySelector('.views').textContent = 'Views unavailable';
    }
}

async function fetchChannelIcon(channelId, videoCard) {
    try {
        const apiKey = YOUTUBE_CONFIG.getAPIKey();
        if (!apiKey) return;
        const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
        if (!response.ok) throw new Error('Failed to fetch channel data');
        const data = await response.json();
        if (data.items && data.items[0]) {
            const iconUrl = data.items[0].snippet.thumbnails.default.url;
            const img = videoCard.querySelector('.channel-icon img');
            img.src = iconUrl;
            img.classList.remove('loading');
        }
    } catch (error) {
        console.error('Error fetching channel icon:', error);
    }
}

// Display Videos
function displayVideos(videos) {
    console.log('Displaying videos:', videos);
    if (!videos || videos.length === 0) {
        videoContainer.innerHTML = '<div class="no-results">No videos available</div>';
        return;
    }

    videoContainer.innerHTML = '';
    videos.forEach(video => {
        try {
            const videoData = video.snippet;
            const videoId = video.id?.videoId || video.id;
            
            if (!videoData || !videoId) {
                console.error('Invalid video data:', video);
                return;
            }
            
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.dataset.videoId = videoId;
            videoCard.innerHTML = `
                <div class="thumbnail">
                    <img src="${videoData.thumbnails?.medium?.url || 'images/placeholder.jpg'}" 
                         alt="${escapeHtml(videoData.title)}"
                         onerror="this.src='images/placeholder.jpg'">
                    <div class="duration"></div>
                    <div class="play-button">
                        <i class="material-icons">play_circle_filled</i>
                    </div>
                </div>
                <div class="video-info">
                    <div class="channel-icon">
                        <img src="images/default-channel.svg" alt="Channel" class="loading">
                    </div>
                    <div class="details">
                        <h3>${escapeHtml(videoData.title)}</h3>
                        <p class="channel-name">${escapeHtml(videoData.channelTitle)}</p>
                        <p class="views-time">
                            <span class="views">Loading...</span> • 
                            <span class="time">${formatDate(videoData.publishedAt)}</span>
                        </p>
                    </div>
                </div>
            `;
            
            // Add click handler
            videoCard.addEventListener('click', function() {
                const id = this.dataset.videoId;
                console.log('Video card clicked:', id);
                if (id) {
                    playVideo(id);
                }
            });
            
            videoContainer.appendChild(videoCard);
            
            // Fetch video statistics
            fetchVideoStatistics(videoId, videoCard);
            fetchChannelIcon(videoData.channelId, videoCard);
        } catch (error) {
            console.error('Error creating video card:', error);
        }
    });
}

// Video Player
let player = null;
let playerReady = false;
const videoQueue = [];

// Video Player Controls
let isPlaying = false;
let currentVolume = 1;

function initializePlayerControls() {
    const playPauseBtn = document.querySelector('.play-pause');
    const backwardBtn = document.querySelector('.backward');
    const forwardBtn = document.querySelector('.forward');
    const volumeToggle = document.querySelector('.volume-toggle');
    const progressBar = document.querySelector('.progress-bar');
    const fullscreenBtn = document.querySelector('.fullscreen');
    const currentTimeDisplay = document.querySelector('.current-time');
    const totalTimeDisplay = document.querySelector('.total-time');

    if (!playPauseBtn || !backwardBtn || !forwardBtn || !volumeToggle || !progressBar || !fullscreenBtn) {
        console.error('Player control elements not found');
        return;
    }

    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            player.pauseVideo();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            player.playVideo();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        isPlaying = !isPlaying;
    });

    // Forward/Backward (10 seconds)
    backwardBtn.addEventListener('click', () => {
        const currentTime = player.getCurrentTime();
        player.seekTo(currentTime - 10, true);
    });

    forwardBtn.addEventListener('click', () => {
        const currentTime = player.getCurrentTime();
        player.seekTo(currentTime + 10, true);
    });

    // Volume Control
    volumeToggle.addEventListener('click', () => {
        if (currentVolume > 0) {
            player.setVolume(0);
            currentVolume = 0;
            volumeToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
            player.setVolume(1);
            currentVolume = 1;
            volumeToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    });

    // Progress Bar
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        player.seekTo(pos * player.getDuration(), true);
    });

    // Fullscreen
    fullscreenBtn.addEventListener('click', () => {
        const playerWrapper = document.querySelector('.player-wrapper');
        if (!document.fullscreenElement) {
            playerWrapper.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // Update time display
    setInterval(() => {
        if (player && player.getCurrentTime) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            
            currentTimeDisplay.textContent = formatTime(currentTime);
            totalTimeDisplay.textContent = formatTime(duration);
            
            // Update progress bar
            const progress = (currentTime / duration) * 100;
            document.querySelector('.progress-bar-fill').style.width = `${progress}%`;
        }
    }, 1000);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Initialize YouTube Player
function initYouTubePlayer() {
    if (typeof YT === 'undefined' || !YT.Player) {
        console.log('YouTube IFrame API not ready, waiting...');
        setTimeout(initYouTubePlayer, 100);
        return;
    }

    if (player) {
        console.log('Player already initialized');
        return;
    }

    const playerDiv = document.getElementById('player');
    if (!playerDiv) {
        console.error('Player element not found');
        return;
    }

    console.log('Initializing YouTube player...');
    try {
        player = new YT.Player('player', {
            width: '100%',
            height: '100%',
            playerVars: {
                'playsinline': 1,
                'autoplay': 1,
                'enablejsapi': 1,
                'origin': window.location.origin,
                'widget_referrer': window.location.origin,
                'rel': 0,
                'modestbranding': 1,
                'showinfo': 0,
                'controls': 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    } catch (error) {
        console.error('Error initializing player:', error);
        setTimeout(initYouTubePlayer, 1000);
    }
}

function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API Ready');
    initYouTubePlayer();
}

function onPlayerReady(event) {
    console.log('Player Ready Event:', event);
    playerReady = true;
    hideLoading();
    
    if (videoQueue.length > 0) {
        const nextVideo = videoQueue.shift();
        console.log('Playing queued video:', nextVideo);
        playVideo(nextVideo);
    }

    player = event.target;
    initializePlayerControls();
    showPlayerControls();
}

function onPlayerStateChange(event) {
    console.log('Player State Change:', event.data);
    if (event.data === YT.PlayerState.ENDED) {
        closeVideoPlayer();
    }
}

function onPlayerError(event) {
    console.error('Player Error:', event.data);
    hideLoading();
    showError('Error playing video. Please try again.');
    closeVideoPlayer();
}

function closeVideoPlayer() {
    if (player && player.stopVideo) {
        player.stopVideo();
    }
    if (videoPlayerContainer) {
        videoPlayerContainer.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function showVideoPlayer() {
    if (videoPlayerContainer) {
        videoPlayerContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function playVideo(videoId) {
    if (!videoId) {
        console.error('No video ID provided');
        return;
    }

    console.log('Attempting to play video:', videoId);
    showLoading();
    
    // Get video data and add to history
    const videoCard = document.querySelector(`.video-card[data-video-id="${videoId}"]`);
    if (videoCard) {
        const videoData = {
            title: videoCard.querySelector('.details h3').textContent,
            thumbnails: {
                medium: {
                    url: videoCard.querySelector('.thumbnail img').src
                }
            },
            channelTitle: videoCard.querySelector('.channel-name').textContent
        };
        addToHistory(videoId, videoData);
    }
    
    if (!playerReady || !player) {
        console.log('Player not ready, queueing video:', videoId);
        videoQueue.push(videoId);
        initYouTubePlayer(); // Try to initialize if not ready
        return;
    }

    try {
        console.log('Loading video:', videoId);
        showVideoPlayer();
        player.loadVideoById(videoId);
        hideLoading();
    } catch (error) {
        console.error('Error playing video:', error);
        hideLoading();
        showError('Error playing video. Please try again.');
        closeVideoPlayer();
    }
}

// Load YouTube API
function loadYouTubeAPI() {
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        return; // API already loading
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Display History
function displayHistory() {
    const historyContainer = document.getElementById('video-container');
    historyContainer.innerHTML = '';
    
    if (appState.watchHistory.length === 0) {
        historyContainer.innerHTML = '<div class="no-results">No watch history available</div>';
        return;
    }
    
    appState.watchHistory.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.dataset.videoId = video.videoId;
        videoCard.innerHTML = `
            <div class="thumbnail">
                <img src="${video.thumbnail || 'images/placeholder.jpg'}" 
                     alt="${escapeHtml(video.title)}"
                     onerror="this.src='images/placeholder.jpg'">
                <div class="play-button">
                    <i class="material-icons">play_circle_filled</i>
                </div>
            </div>
            <div class="video-info">
                <div class="channel-icon">
                    <img src="images/default-channel.svg" alt="Channel">
                </div>
                <div class="details">
                    <h3>${escapeHtml(video.title)}</h3>
                    <p class="channel-name">${escapeHtml(video.channelTitle)}</p>
                    <p class="views-time">
                        <span class="time">Watched ${formatDate(video.watchedAt)}</span>
                    </p>
                </div>
            </div>
        `;
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load YouTube API
    loadYouTubeAPI();
    
    // Load watch history
    appState.watchHistory = loadWatchHistory();

    // Close video player button
    const closePlayerBtn = document.getElementById('close-player');
    if (closePlayerBtn) {
        closePlayerBtn.addEventListener('click', closeVideoPlayer);
    }

    // Back button
    const backButton = document.getElementById('back-to-home');
    if (backButton) {
        backButton.addEventListener('click', closeVideoPlayer);
    }

    // Video card click handler
    const videoContainer = document.getElementById('video-container');
    if (videoContainer) {
        videoContainer.addEventListener('click', function(event) {
            const videoCard = event.target.closest('.video-card');
            if (videoCard) {
                const videoId = videoCard.dataset.videoId;
                if (videoId) {
                    console.log('Video card clicked:', videoId);
                    playVideo(videoId);
                }
            }
        });
    }

    // Home button
    const homeButton = document.querySelector('[data-page="home"]');
    if (homeButton) {
        homeButton.addEventListener('click', function(e) {
            e.preventDefault();
            fetchRecommendedVideos();
        });
    }

    // Search functionality
    const searchButton = document.querySelector('.search-box button');
    const searchInput = document.querySelector('.search-box input');
    
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                appState.searchQuery = query;
                searchVideos(query);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    appState.searchQuery = query;
                    searchVideos(query);
                }
            }
        });
    }

    // Region selector
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.addEventListener('change', (e) => {
            const selectedRegion = e.target.value;
            fetchTrendingVideos(selectedRegion);
        });
    }

    // Handle logo click to load home page
    const logoLink = document.querySelector('.logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Close video player if open
            if (videoPlayerContainer) {
                videoPlayerContainer.classList.add('hidden');
            }
            // Reset to home page content
            loadHomePage();
        });
    }

    // Handle sign-in button click
    const signInButton = document.getElementById('auth-button');
    if (signInButton) {
        signInButton.addEventListener('click', function() {
            const authModal = document.getElementById('auth-modal');
            if (authModal) {
                authModal.classList.remove('hidden');
            }
        });
    }

    // Handle Google sign-in
    const googleSignInBtn = document.getElementById('google-sign-in');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', function() {
            signInWithPopup(auth, provider)
                .then((result) => {
                    console.log('Sign-in successful:', result.user);
                    const authModal = document.getElementById('auth-modal');
                    if (authModal) {
                        authModal.classList.add('hidden');
                    }
                    updateAuthUI(result.user);
                })
                .catch((error) => {
                    console.error('Sign-in error:', error);
                    showError('Failed to sign in. Please try again.');
                });
        });
    }

    // Handle sign-out
    const signOutButton = document.getElementById('sign-out');
    if (signOutButton) {
        signOutButton.addEventListener('click', function() {
            signOut(auth)
                .then(() => {
                    console.log('Sign-out successful');
                    updateAuthUI(null);
                })
                .catch((error) => {
                    console.error('Sign-out error:', error);
                    showError('Failed to sign out. Please try again.');
                });
        });
    }

    // Update auth UI based on user state
    function updateAuthUI(user) {
        const signInButton = document.getElementById('auth-button');
        const signOutButton = document.getElementById('sign-out');
        const userProfile = document.getElementById('user-profile');
        
        if (user) {
            // User is signed in
            if (signInButton) signInButton.classList.add('hidden');
            if (signOutButton) signOutButton.classList.remove('hidden');
            if (userProfile) {
                userProfile.classList.remove('hidden');
                const profileImage = userProfile.querySelector('img');
                if (profileImage) {
                    profileImage.src = user.photoURL || 'images/default-avatar.png';
                }
            }
        } else {
            // User is signed out
            if (signInButton) signInButton.classList.remove('hidden');
            if (signOutButton) signOutButton.classList.add('hidden');
            if (userProfile) userProfile.classList.add('hidden');
        }
    }

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        updateAuthUI(user);
    });

    // Handle trending button click
    const trendingButton = document.querySelector('[data-page="trending"]');
    if (trendingButton) {
        trendingButton.addEventListener('click', function(e) {
            e.preventDefault();
            // Close video player if open
            if (videoPlayerContainer) {
                videoPlayerContainer.classList.add('hidden');
            }
            // Load trending videos
            fetchTrendingVideos('US');
        });
    }
});

// Make functions globally available
window.playVideo = playVideo;
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Initial Load
fetchTrendingVideos('US');

function showPlayerControls() {
    const controls = document.querySelector('.player-controls');
    if (controls) {
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';
    }
}

function hidePlayerControls() {
    const controls = document.querySelector('.player-controls');
    if (controls) {
        controls.style.opacity = '0';
        controls.style.pointerEvents = 'none';
    }
}

function loadHomePage() {
    // Clear any existing content
    const videoContainer = document.getElementById('video-container');
    if (!videoContainer) return;
    
    // Add loading indicator
    videoContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
    
    // Load trending videos
    fetchTrendingVideos('US');
}