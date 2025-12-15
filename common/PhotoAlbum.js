document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // Change the BASE_URL to point to your proxy file (e.g., index.php)
    // The album name will be appended as a query string (e.g., index.php?nature)
    const BASE_URL = 'https://mediamaze.com/json/?'; 
    const PHOTOS_PER_LOAD = 30; 

    // --- DOM Elements (omitted for brevity, assume they are still here) ---
    const photoGrid = document.getElementById('photo-grid');
    const showMoreBtn = document.getElementById('show-more-btn');
    const filterInput = document.getElementById('filter-input');
    const keywordFilter = document.getElementById('keyword-filter');
    const categoryFilter = document.getElementById('category-filter');
    const albumTitle = document.getElementById('album-title');

    const modal = document.getElementById('image-modal');
    // ... other modal elements ...

    // --- Global State (omitted for brevity, assume they are still here) ---
    let allPhotos = [];
    let filteredPhotos = [];
    let currentDisplayCount = 0;
    let currentPhotoIndex = -1;
    let isInfoVisible = true;

    // --- Data Loading (Crucially updated section) ---
    function getAlbumName() {
        // Get the album name from the URL query parameter (e.g., album.html?nature)
        const params = new URLSearchParams(window.location.search);
        // Assumes the format is ?albumName or ?key=albumName. Uses the first parameter.
        let albumName = '';
        for (const [key, value] of params.entries()) {
            albumName = key || value;
            break;
        }
        return albumName.replace('.json', '');
    }

    async function loadAlbumData() {
        const albumName = getAlbumName();
        if (!albumName) {
            alert("Error: Missing album name in URL (e.g., album.html?nature)");
            return;
        }

        // *** UPDATED: Construct the URL as required by your proxy ***
        // It will now look like: https://mediamaze.com/json/?nature
        const fetchUrl = `${BASE_URL}${albumName}`;

        try {
            const response = await fetch(fetchUrl);
            const data = await response.json();

            // Set the main album title
            albumTitle.textContent = data.albumTitle || 'Photo Album';

            allPhotos = data.photos || [];
            filteredPhotos = allPhotos;

            // Initialize filters and rendering
            populateFilters(allPhotos);
            renderPhotos();
        } catch (error) {
            console.error('Failed to load album data from proxy:', fetchUrl, error);
            alert('Could not load album data. Check the proxy URL and file name.');
        }
    }
    
    // --- Rest of the functions (populateFilters, applyFilters, renderPhotos, 
    //     modal functions, event listeners) remain the same. ---

    // Load initial data
    loadAlbumData();
    // ... rest of event listeners ...

});
