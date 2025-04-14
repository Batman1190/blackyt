// YouTube API Configuration
import apiKeyRotator from './youtube-api.js';

// Initialize API keys
const API_KEYS = [
    'AIzaSyBRB8bXp-UFdoNFhTqh9n2hWdthpm--gXk',
    'AIzaSyBi9XME_hKIdmFyKT2sX9Qzq-YW4uwaPGc',
    'AIzaSyAaT_fn6jzNLUjee7n7hQIJAdjvQiKHSTU',
    'AIzaSyD0ZhRR292c95yMkSx-ZPWtsGL-FkwEH2Y',
    'AIzaSyB0z2xXRZX5dh8tMw3PZh9oqfSGgwiWx-U'
];

// Add API keys to the rotator
API_KEYS.forEach(key => {
    try {
        apiKeyRotator.addAPIKey(key.trim());
    } catch (error) {
        console.warn(`Failed to add API key: ${error.message}`);
    }
});

// Export configuration
export const YOUTUBE_CONFIG = {
    getAPIKey: () => {
        try {
            return apiKeyRotator.getKey();
        } catch (error) {
            console.error('No YouTube API keys available');
            return '';
        }
    }
};

// Validate configuration
if (API_KEYS.length === 0) {
    console.error('No YouTube API keys configured.');
}
