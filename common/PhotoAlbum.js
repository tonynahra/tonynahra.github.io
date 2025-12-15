document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // BASE_URL MUST end with '?' to append the album name as a query string (e.g., ?nature)
    const BASE_URL = 'https://mediamaze.com/json/?'; 
    const PHOTOS_PER_LOAD = 30; // The initial limit and subsequent load size

    // --- DOM Elements ---
    const photoGrid = document.getElementById('photo-grid');
    const showMoreBtn = document.getElementById('show-more-btn');
    const filterInput = document.getElementById('filter-input');
    const keywordFilter = document.getElementById('keyword-filter');
    const categoryFilter = document.getElementById('category-filter');
    const albumTitle = document.getElementById('album-title');

    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalInfo = document.getElementById('modal-info');

    // --- Global State ---
    let allPhotos = [];
    let filteredPhotos = [];
    let currentDisplayCount = 0;
    let currentPhotoIndex = -1;
    let isInfoVisible = true;

    // --- Data Loading ---
    function getAlbumName() {
        // Reads the album name from the URL query parameter (e.g., album.html?nature)
        const params = new URLSearchParams(window.location.search);
        let albumName = '';
        
        // Find the first non-empty query parameter key or value
        for (const [key, value] of params.entries()) {
            albumName = key || value;
            break;
        }
        return albumName.replace('.json', '');
    }

    async function loadAlbumData() {
        const albumName = getAlbumName();
        if (!albumName) {
            albumTitle.textContent = "Error Loading Album";
            alert("Error: Missing album name in URL (e.g., album.html?nature)");
            return;
        }

        // Construct the URL as required by your proxy: https://mediamaze.com/json/?nature
        const fetchUrl = `${BASE_URL}${albumName}`;

        try {
            const response = await fetch(fetchUrl);
            const data = await response.json();

            albumTitle.textContent = data.albumTitle || 'Photo Album';

            // Filter out any entries that might be missing required photo data if needed
            allPhotos = (data.photos || []).filter(p => p.url && (p.title || p.description));
            filteredPhotos = allPhotos;

            // Initialize filters and rendering
            populateFilters(allPhotos);
            renderPhotos();
        } catch (error) {
            console.error('Failed to load album data from proxy:', fetchUrl, error);
            albumTitle.textContent = "Error: Check Console";
            alert('Could not load album data. Check the proxy URL and file name.');
        }
    }

    // --- Filter Population ---
    function populateFilters(photos) {
        const keywords = {};
        const categories = {};

        photos.forEach(photo => {
            // Count Categories
            const cat = photo.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;

            // Count Keywords
            const photoKeywords = (photo.keywords || '').split(',').map(k => k.trim()).filter(k => k);
            photoKeywords.forEach(k => {
                keywords[k] = (keywords[k] || 0) + 1;
            });
        });

        // Helper to sort and append options
        const appendOptions = (selectElement, counts) => {
            const sorted = Object.entries(counts).sort(([keyA, countA], [keyB, countB]) => {
                if (countB !== countA) return countB - countA; // Sort by count (desc)
                return keyA.localeCompare(keyB); // Then by name (asc)
            });

            // Clear previous options (except "All")
            selectElement.innerHTML = `<option value="">All ${selectElement.id.replace('-filter', '').replace('keyword', 'keyword').replace('category', 'category')}s</option>`;

            sorted.forEach(([name, count]) => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = `${name} (${count})`;
                selectElement.appendChild(option);
            });
        };

        appendOptions(categoryFilter, categories);
        appendOptions(keywordFilter, keywords);
    }

    // --- Filtering Logic ---
    function applyFilters() {
        const searchText = filterInput.value.toLowerCase();
        const selectedKeyword = keywordFilter.value;
        const selectedCategory = categoryFilter.value;

        filteredPhotos = allPhotos.filter(photo => {
            // 1. Search Text Filter (Title or Keywords, minimum 3 characters)
            if (searchText.length >= 3) {
                const title = photo.title.toLowerCase();
                const keywords = (photo.keywords || '').toLowerCase();
                if (!title.includes(searchText) && !keywords.includes(searchText)) {
                    return false;
                }
            } else if (searchText.length > 0 && searchText.length < 3) {
                 // Prevent filtering if less than 3 chars are typed, but still apply dropdowns
            }

            // 2. Keyword Dropdown Filter
            if (selectedKeyword) {
                const keywords = (photo.keywords || '').split(',').map(k => k.trim());
                if (!keywords.includes(selectedKeyword)) {
                    return false;
                }
            }

            // 3. Category Dropdown Filter
            if (selectedCategory) {
                if ((photo.category || 'Uncategorized') !== selectedCategory) {
                    return false;
                }
            }

            return true;
        });

        // Reset and re-render the photos with the new filter
        currentDisplayCount = 0;
        photoGrid.innerHTML = '';
        renderPhotos();
    }

    // --- Rendering Logic ---
    function createPhotoElement(photo, index) {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.dataset.index = index; // Store the index in the filteredPhotos array

        const img = document.createElement('img');
        img.src = photo.thumbnailUrl || photo.url;
        img.alt = photo.title || 'Photo';
        img.loading = 'lazy';

        item.appendChild(img);
        item.addEventListener('click', () => openModal(index));

        return item;
    }

    function renderPhotos() {
        const newCount = Math.min(filteredPhotos.length, currentDisplayCount + PHOTOS_PER_LOAD);

        for (let i = currentDisplayCount; i < newCount; i++) {
            const photo = filteredPhotos[i];
            const element = createPhotoElement(photo, i);
            photoGrid.appendChild(element);
        }

        currentDisplayCount = newCount;

        // Update "Show More" button visibility
        if (currentDisplayCount < filteredPhotos.length) {
            showMoreBtn.style.display = 'block';
            showMoreBtn.textContent = `Show More Photos (${filteredPhotos.length - currentDisplayCount} remaining)`;
        } else {
            showMoreBtn.style.display = 'none';
        }
    }

    // --- Modal Functions ---
    function updateModalContent(index) {
        if (index < 0 || index >= filteredPhotos.length) {
            return;
        }
        currentPhotoIndex = index;
        const photo = filteredPhotos[currentPhotoIndex];

        // Update main image and info
        modalImage.src = photo.url;
        modalTitle.textContent = photo.title;
        modalDescription.textContent = photo.description || 'No description available.';

        // Ensure info visibility respects the current state
        modalInfo.style.opacity = isInfoVisible ? 1 : 0;
    }

    function openModal(index) {
        updateModalContent(index);
        modal.style.display = 'flex';
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        // Exit fullscreen if active
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        currentPhotoIndex = -1;
    }

    function navigatePhoto(direction) {
        let newIndex = currentPhotoIndex + direction;
        
        // Wrap around logic
        if (newIndex < 0) {
            newIndex = filteredPhotos.length - 1; 
        } else if (newIndex >= filteredPhotos.length) {
            newIndex = 0;
        }
        updateModalContent(newIndex);
    }

    function toggleInfo() {
        isInfoVisible = !isInfoVisible;
        modalInfo.style.opacity = isInfoVisible ? 1 : 0;
        document.getElementById('toggle-info-btn').textContent = isInfoVisible ? 'Hide Info' : 'Show Info';
    }

    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen on the modal content
            modal.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                alert('Full-screen mode could not be enabled by the browser.');
            });
            modal.classList.add('fullscreen');
        } else {
            document.exitFullscreen();
            modal.classList.remove('fullscreen');
        }
    }

    // --- Event Listeners ---

    // Load initial data when the script starts
    loadAlbumData();

    // Show More button
    showMoreBtn.addEventListener('click', renderPhotos);

    // Filters
    filterInput.addEventListener('input', applyFilters);
    keywordFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);

    // Modal Events
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('prev-btn').addEventListener('click', () => navigatePhoto(-1));
    document.getElementById('next-btn').addEventListener('click', () => navigatePhoto(1));
    document.getElementById('toggle-info-btn').addEventListener('click', toggleInfo);
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullScreen);

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'Escape') {
                closeModal(); // Exit modal/fullscreen
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigatePhoto(-1); // Previous
            } else if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                navigatePhoto(1); // Next (Spacebar also works)
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                toggleInfo(); // Toggle Info
            }
        }
    });

    // Clean up modal class when leaving full screen via ESC or browser UI
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            modal.classList.remove('fullscreen');
        }
    });
});
