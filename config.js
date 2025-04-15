// YouTube API Configuration
const YOUTUBE_API_KEYS = [
    'AIzaSyBRB8bXp-UFdoNFhTqh9n2hWdthpm--gXk',
    'AIzaSyBi9XME_hKIdmFyKT2sX9Qzq-YW4uwaPGc',
    'AIzaSyAaT_fn6jzNLUjee7n7hQIJAdjvQiKHSTU',
    'AIzaSyD0ZhRR292c95yMkSx-ZPWtsGL-FkwEH2Y',
    'AIzaSyB0z2xXRZX5dh8tMw3PZh9oqfSGgwiWx-U',
    'AIzaSyByQDjEkBdrbJqi3O35UUyOEgGrEqImoXU',
    'AIzaSyA4iPnRBOkNcVnG6i2Osdplr-6KOOidJso',
    'AIzaSyBp1KT6xYFkP5pkq5vldiS5M-275Jyhk1o',
    'AIzaSyBSUK5rvC9NUIfGg7Ol-c5fByZDLxkV4MA',
    'AIzaSyBBN1oCDauSMk_QdRMKfriv3KsP--jGgIE',
    'AIzaSyBzD1zDrYqVl-RH3vTwfmXDkGqjdH3Zlr0',
    'AIzaSyDzoPLaJUFjAB0kSSPRGQfUwiMlywWIO4I',
    'AIzaSyCSMlS_3EpigNZYoyxU7L6mnLPfpFbJ6vA',
    'AIzaSyAvw2xoR4eaQOzsyEBjthCQSFo5x60jNV8',
    'AIzaSyDOd-fwjmHblCWYZWFtu6V0QNGHNBMb0Tw'
];

let currentKeyIndex = 0;
let lastUsedKeyIndex = -1;
let lastKeyUsageTime = 0;
const MIN_KEY_USAGE_INTERVAL = 200; // Reduced to 200ms for better performance

export const YOUTUBE_CONFIG = {
    async getAPIKey() {
        const now = Date.now();
        
        // If we've used all keys, start over
        if (currentKeyIndex === lastUsedKeyIndex) {
            currentKeyIndex = 0;
        }
        
        // If we're using the same key too quickly, wait
        if (now - lastKeyUsageTime < MIN_KEY_USAGE_INTERVAL) {
            await new Promise(resolve => setTimeout(resolve, MIN_KEY_USAGE_INTERVAL));
        }
        
        const key = YOUTUBE_API_KEYS[currentKeyIndex];
        lastUsedKeyIndex = currentKeyIndex;
        lastKeyUsageTime = now;
        
        // Log the key rotation
        console.log(`Using API key index: ${currentKeyIndex} (Total keys: ${YOUTUBE_API_KEYS.length})`);
        
        // Rotate to next key
        currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
        return key;
    },
    
    rotateKey() {
        // Force rotation to next key
        currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
        console.log(`Manually rotating to API key index: ${currentKeyIndex}`);
        return YOUTUBE_API_KEYS[currentKeyIndex];
    },
    
    // Get total number of available keys
    getKeyCount() {
        return YOUTUBE_API_KEYS.length;
    },
    
    // Get current key index (for debugging)
    getCurrentKeyIndex() {
        return currentKeyIndex;
    }
};
