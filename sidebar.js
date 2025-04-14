// DOM Elements
const menuIcon = document.querySelector('.menu-icon');
const sidebar = document.querySelector('.sidebar');
const container = document.querySelector('.container');
const content = document.querySelector('.content');

// State
let isSidebarOpen = true;

// Toggle sidebar function
function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    
    // Add/remove classes for animation
    sidebar.classList.toggle('collapsed');
    content.classList.toggle('expanded');
    
    // Update styles based on state
    if (!isSidebarOpen) {
        sidebar.style.width = '70px';
        content.style.marginLeft = '70px';
        
        // Hide text in sidebar links
        document.querySelectorAll('.nav-link span').forEach(span => {
            span.style.display = 'none';
        });
    } else {
        sidebar.style.width = '250px';
        content.style.marginLeft = '250px';
        
        // Show text in sidebar links
        document.querySelectorAll('.nav-link span').forEach(span => {
            span.style.display = 'block';
        });
    }
}

// Event Listeners
menuIcon.addEventListener('click', toggleSidebar);

// Handle responsive behavior
function handleResize() {
    if (window.innerWidth <= 768) {
        sidebar.style.width = '100%';
        content.style.marginLeft = '0';
        content.style.marginBottom = '60px';
    } else {
        if (isSidebarOpen) {
            sidebar.style.width = '250px';
            content.style.marginLeft = '250px';
        } else {
            sidebar.style.width = '70px';
            content.style.marginLeft = '70px';
        }
        content.style.marginBottom = '0';
    }
}

// Listen for window resize
window.addEventListener('resize', handleResize);

// Initial setup
handleResize();