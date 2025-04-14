// YouTube API Configuration
const YOUTUBE_API_KEYS = [
    'AIzaSyBRB8bXp-UFdoNFhTqh9n2hWdthpm--gXk',
    'AIzaSyBi9XME_hKIdmFyKT2sX9Qzq-YW4uwaPGc',
    'AIzaSyAaT_fn6jzNLUjee7n7hQIJAdjvQiKHSTU',
    'AIzaSyD0ZhRR292c95yMkSx-ZPWtsGL-FkwEH2Y',
    'AIzaSyB0z2xXRZX5dh8tMw3PZh9oqfSGgwiWx-U',
    'AIzaSyByQDjEkBdrbJqi3O35UUyOEgGrEqImoXU',
    'AIzaSyA4iPnRBOkNcVnG6i2Osdplr-6KOOidJso'
];

let currentKeyIndex = 0;

export const YOUTUBE_CONFIG = {
    getAPIKey() {
        const key = YOUTUBE_API_KEYS[currentKeyIndex];
        // Rotate to next key
        currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
        return key;
    },
    
    rotateKey() {
        // Force rotation to next key
        currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
        return YOUTUBE_API_KEYS[currentKeyIndex];
    },
    
    // Get total number of available keys
    getKeyCount() {
        return YOUTUBE_API_KEYS.length;
    }
};
