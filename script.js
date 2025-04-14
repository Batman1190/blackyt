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

// YouTube Player
let player = null;
let playerReady = false;
const videoQueue = [];

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

// Video Player Controls
function closeVideoPlayer() {
    if (player && player.stopVideo) {
        player.stopVideo();
    }
    if (videoPlayerContainer) {
        videoPlayerContainer.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

document.getElementById('back-to-home').addEventListener('click', function() {
    closeVideoPlayer();
});

// Add home button click handler
document.querySelector('[data-page="home"]').addEventListener('click', function(e) {
    e.preventDefault();
    fetchRecommendedVideos();
});

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
        
        historyContainer.appendChild(videoCard);
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
});

// Make functions globally available
window.playVideo = playVideo;
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Auth State Management
function updateAuthState(user) {
    const authButton = document.getElementById('auth-button');
    const protectedLinks = document.querySelectorAll('.nav-link.protected');
    const authModal = document.getElementById('auth-modal');

    if (user) {
        console.log('User is signed in:', user.email);
        authButton.innerHTML = `
            <i class="material-icons">account_circle</i>
            <span>Sign Out</span>
        `;
        authButton.onclick = handleSignOut;
        protectedLinks.forEach(link => {
            link.classList.remove('disabled');
        });
    } else {
        console.log('User is signed out');
        authButton.innerHTML = `
            <i class="material-icons">account_circle</i>
            <span>Sign In</span>
        `;
        authButton.onclick = () => authModal.classList.remove('hidden');
        protectedLinks.forEach(link => {
            link.classList.add('disabled');
        });
    }
}

// Auth Event Handlers
function handleSignIn() {
    showLoading();
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log('Sign in successful:', result.user);
            document.getElementById('auth-modal').classList.add('hidden');
            hideLoading();
        })
        .catch((error) => {
            console.error('Sign in error:', error);
            let errorMessage = 'Failed to sign in. ';
            if (error.code === 'auth/popup-blocked') {
                errorMessage += 'Please allow popups for this site.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage += 'Sign-in was cancelled.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage += 'Network error. Please check your connection.';
            } else if (window.location.hostname === 'localhost') {
                errorMessage += 'Make sure Firebase emulator is running locally.';
            }
            showError(errorMessage);
            hideLoading();
        });
}

function handleSignOut() {
    showLoading();
    signOut(auth)
        .then(() => {
            console.log('Sign out successful');
            hideLoading();
        })
        .catch((error) => {
            console.error('Sign out error:', error);
            showError('Failed to sign out. Please try again.');
            hideLoading();
        });
}

// Initialize Auth State
onAuthStateChanged(auth, updateAuthState);

// Event Listeners
document.getElementById('google-sign-in').addEventListener('click', handleSignIn);
document.querySelector('.menu-icon').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('small-sidebar');
    document.querySelector('.container').classList.toggle('large-container');
});

// Search Functionality
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

// Region selector event listener
document.getElementById('region-select').addEventListener('change', (e) => {
    const selectedRegion = e.target.value;
    fetchTrendingVideos(selectedRegion);
});

// Initial Load
fetchTrendingVideos('US');
