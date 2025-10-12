// DOM Elements
const menuIcon = document.querySelector('.mobile-menu-toggle');
const sidebar = document.querySelector('.sidebar');
const container = document.querySelector('.container');
const content = document.querySelector('.content');

// State
let isSidebarOpen = false;
let overlayTimeout = null;
let resizeTimeout = null;

// Toggle sidebar function
function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    
    if (window.innerWidth <= 767) {
        // Mobile view
        if (isSidebarOpen) {
            // Prevent body scroll when sidebar is open
            document.body.style.overflow = 'hidden';
            
            if (sidebar) sidebar.classList.add('active');
            // Add overlay to prevent interaction with content
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            // Add active class after a small delay to allow for transition
            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });
            
            overlay.addEventListener('click', () => {
                toggleSidebar();
            });
        } else {
            document.body.style.overflow = '';
            if (sidebar) sidebar.classList.remove('active');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('active');
                // Remove overlay after transition
                clearTimeout(overlayTimeout);
                overlayTimeout = setTimeout(() => {
                    if (overlay && overlay.parentNode) {
                        document.body.removeChild(overlay);
                    }
                    overlayTimeout = null;
                }, 300);
            }
        }
    } else {
        // Desktop view
        if (sidebar) sidebar.classList.toggle('collapsed');
        if (content) content.style.marginLeft = isSidebarOpen ? '250px' : '70px';
        
        // Handle text visibility in sidebar links
        document.querySelectorAll('.nav-link span, .sidebar-image-link span').forEach(span => {
            span.style.display = isSidebarOpen ? 'block' : 'none';
        });
    }
}

// Event Listeners
if (menuIcon) {
    menuIcon.addEventListener('click', toggleSidebar);
}

// Handle responsive behavior
function handleResize() {
    if (window.innerWidth <= 767) {
        // Mobile view
        if (sidebar) sidebar.classList.remove('collapsed');
        if (content) content.style.marginLeft = '0';
        if (!isSidebarOpen) {
            if (sidebar) sidebar.classList.remove('active');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                document.body.removeChild(overlay);
            }
        }
        document.body.style.overflow = '';
    } else {
        // Desktop view
        if (sidebar) sidebar.classList.remove('active');
        if (content) content.style.marginLeft = isSidebarOpen ? '250px' : '70px';
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        document.body.style.overflow = '';
    }
}

// Listen for window resize with debouncing
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 150);
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    clearTimeout(overlayTimeout);
    clearTimeout(resizeTimeout);
    overlayTimeout = null;
    resizeTimeout = null;
    document.body.style.overflow = '';
});

// Initial setup
handleResize();