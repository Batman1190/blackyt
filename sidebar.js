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
    
    // Handle mobile vs desktop view differently
    if (window.innerWidth <= 768) {
        if (isSidebarOpen) {
            sidebar.style.width = '100%';
            sidebar.style.transform = 'translateX(0)';
            content.style.marginLeft = '0';
        } else {
            sidebar.style.width = '100%';
            sidebar.style.transform = 'translateX(-100%)';
            content.style.marginLeft = '0';
        }
    } else {
        sidebar.style.transform = 'translateX(0)';
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
}

// Event Listeners
menuIcon.addEventListener('click', toggleSidebar);

// Handle responsive behavior
function handleResize() {
    if (window.innerWidth <= 768) {
        sidebar.style.width = '100%';
        content.style.marginLeft = '0';
        content.style.marginBottom = '60px';
        if (!isSidebarOpen) {
            sidebar.style.transform = 'translateX(-100%)';
        } else {
            sidebar.style.transform = 'translateX(0)';
        }
    } else {
        sidebar.style.transform = 'translateX(0)';
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