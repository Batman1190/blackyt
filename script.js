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

function formatTimeAgo(dateString) {
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
async function fetchTrendingVideos(region = 'US') {
    try {
        const videoContainer = document.getElementById('video-container');
        if (!videoContainer) return;

        // Show loading state
        videoContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;

        let attempts = 0;
        const maxAttempts = YOUTUBE_CONFIG.getKeyCount();

        while (attempts < maxAttempts) {
            try {
                const apiKey = YOUTUBE_CONFIG.getAPIKey();
                console.log('Trying with API key index:', attempts);

                const response = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&chart=mostPopular&regionCode=${region}&maxResults=24&key=${apiKey}`);
                
                if (response.status === 403) {
                    console.log('API key quota exceeded, trying next key...');
                    attempts++;
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Clear loading state
                videoContainer.innerHTML = '';
                
                // Create video grid
                const videoGrid = document.createElement('div');
                videoGrid.className = 'video-grid';
                
                // Add videos to grid
                data.items.forEach(video => {
                    const videoCard = createVideoCard(video);
                    videoGrid.appendChild(videoCard);
                });
                
                videoContainer.appendChild(videoGrid);
                return; // Success, exit the function
            } catch (error) {
                console.error('Error with current API key:', error);
                attempts++;
            }
        }

        // If we get here, all API keys failed
        throw new Error('All API keys exhausted');

    } catch (error) {
        console.error('Error fetching trending videos:', error);
        const videoContainer = document.getElementById('video-container');
        if (videoContainer) {
            videoContainer.innerHTML = `
                <div class="error-message">
                    <p>Failed to load videos. Please try again later.</p>
                    <button onclick="fetchTrendingVideos('${region}')" class="retry-button">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

function createVideoCard(video) {
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';
    videoCard.innerHTML = `
        <div class="thumbnail" onclick="playVideo('${video.id}')">
            <img src="${video.snippet.thumbnails.medium.url}" alt="${escapeHtml(video.snippet.title)}">
            <div class="play-button">
                <i class="fas fa-play"></i>
            </div>
        </div>
        <div class="video-info">
            <div class="channel-icon">
                <img alt="${escapeHtml(video.snippet.channelTitle)}">
            </div>
            <div class="details">
                <h3>${escapeHtml(video.snippet.title)}</h3>
                <span class="channel-name">${escapeHtml(video.snippet.channelTitle)}</span>
                <div class="video-meta">
                    <span class="views">Loading views...</span>
                    <span class="separator">•</span>
                    <span class="time">${formatTimeAgo(video.snippet.publishedAt)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Fetch additional video data
    fetchVideoStatistics(video.id, videoCard);
    fetchChannelIcon(video.snippet.channelId, videoCard);
    
    return videoCard;
}

// Add styles for error message and retry button
const style = document.createElement('style');
style.textContent = `
    .error-message {
        text-align: center;
        padding: 20px;
        color: var(--primary-color);
    }
    
    .retry-button {
        margin-top: 15px;
        padding: 8px 16px;
        background: var(--hover-color);
        border: none;
        border-radius: 20px;
        color: var(--primary-color);
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .retry-button:hover {
        background: var(--border-color);
    }
`;
document.head.appendChild(style);

async function fetchRecommendedVideos() {
    return fetchTrendingVideos('US');
}

async function searchVideos(query) {
    try {
        const videoContainer = document.getElementById('video-container');
        if (!videoContainer) return;

        showLoading();
        videoContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;

        let attempts = 0;
        const maxAttempts = YOUTUBE_CONFIG.getKeyCount();

        while (attempts < maxAttempts) {
            try {
                const apiKey = YOUTUBE_CONFIG.getAPIKey();
                console.log('Searching with API key index:', attempts);

                const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=24&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`);
                
                if (response.status === 403) {
                    console.log('API key quota exceeded, trying next key...');
                    attempts++;
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Clear loading state
                videoContainer.innerHTML = '';
                
                // Create video grid
                const videoGrid = document.createElement('div');
                videoGrid.className = 'video-grid';
                
                // Process and display search results
                if (data.items && data.items.length > 0) {
                    data.items.forEach(item => {
                        // Convert search result format to video format
                        const video = {
                            id: item.id.videoId,
                            snippet: item.snippet
                        };
                        const videoCard = createVideoCard(video);
                        videoGrid.appendChild(videoCard);
                    });
                    videoContainer.appendChild(videoGrid);
                } else {
                    videoContainer.innerHTML = '<div class="no-results">No videos found</div>';
                }
                
                hideLoading();
                return; // Success, exit the function
            } catch (error) {
                console.error('Error with current API key:', error);
                attempts++;
            }
        }

        // If we get here, all API keys failed
        throw new Error('All API keys exhausted');

    } catch (error) {
        console.error('Search error:', error);
        hideLoading();
        const errorMessage = error.message === 'All API keys exhausted'
            ? 'Unable to perform search. Please try again later.'
            : 'Failed to search videos. Please try again.';
        
        if (videoContainer) {
            videoContainer.innerHTML = `
                <div class="error-message">
                    <p>${errorMessage}</p>
                    <button onclick="searchVideos('${encodeURIComponent(query)}')" class="retry-button">
                        Retry Search
                    </button>
                </div>
            `;
        }
    }
}

// Add event listeners for search
document.addEventListener('DOMContentLoaded', function() {
    // Existing search listeners
    const searchInput = document.querySelector('.search-box input');
    const searchButton = document.querySelector('.search-box button');

    // Add logo click handler
    const logoLink = document.querySelector('.logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Close video player if open
            closeVideoPlayer();
            // Load trending videos
            fetchTrendingVideos('US');
        });
    }

    // Add back button listener
    const backButton = document.getElementById('back-to-home');
    if (backButton) {
        backButton.addEventListener('click', () => {
            closeVideoPlayer();
            // Optionally refresh the video list
            fetchTrendingVideos('US');
        });
    }

    // Close player button listener
    const closePlayerBtn = document.getElementById('close-player');
    if (closePlayerBtn) {
        closePlayerBtn.addEventListener('click', () => {
            closeVideoPlayer();
        });
    }

    // Existing search listeners
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchVideos(query);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchVideos(query);
                }
            }
        });
    }
});

// Make searchVideos available globally
window.searchVideos = searchVideos;

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

        const img = videoCard.querySelector('.channel-icon img');
        if (!img) return;

        // Set a loading state
        img.style.opacity = '0';
        
        const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
        if (!response.ok) throw new Error('Failed to fetch channel data');
        
        const data = await response.json();
        if (data.items && data.items[0] && data.items[0].snippet.thumbnails) {
            const iconUrl = data.items[0].snippet.thumbnails.default.url;
            
            // Create a new image to preload
            const tempImg = new Image();
            tempImg.onload = () => {
                img.src = iconUrl;
                img.classList.add('loaded');
                img.style.opacity = '1';
            };
            tempImg.onerror = () => {
                console.error('Failed to load channel icon:', iconUrl);
                img.style.opacity = '1';
            };
            tempImg.src = iconUrl;
        }
    } catch (error) {
        console.error('Error fetching channel icon:', error);
        const img = videoCard.querySelector('.channel-icon img');
        if (img) {
            img.style.opacity = '1';
        }
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
    const videoPlayerContainer = document.getElementById('video-player-container');
    if (videoPlayerContainer) {
        videoPlayerContainer.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
    // Reset player state
    isPlaying = false;
    const playPauseBtn = document.querySelector('.play-pause');
    if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
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

// Make functions globally available
window.playVideo = playVideo;
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Initial Load
fetchTrendingVideos('US');