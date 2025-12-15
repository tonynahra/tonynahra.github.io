document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Configuration & DOM Elements & Global State ---
    const BASE_URL = 'https://mediamaze.com/json/?'; 
    const PHOTOS_PER_LOAD = 30; 

    // DOM Elements
    const photoGrid = document.getElementById('photo-grid');
    const showMoreBtn = document.getElementById('show-more-btn');
    const filterInput = document.getElementById('filter-input');
    const keywordFilter = document.getElementById('keyword-filter');
    const categoryFilter = document.getElementById('category-filter');
    const albumTitle = document.getElementById('album-title');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const showMetaBtn = document.getElementById('show-meta-btn');
    
    // Modal Elements
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalInfo = document.getElementById('modal-info');
    
    // Meta Modal Elements
    const metaModal = document.getElementById('meta-modal');
    const metaModalTitle = document.getElementById('meta-modal-title');
    const metaModalCreated = document.getElementById('meta-modal-created');
    const metaModalNote = document.getElementById('meta-modal-note');
    const closeMetaBtn = document.getElementById('close-meta-btn');

    // Global State
    let albumMetaData = {}; // To store the meta data
    let allPhotos = [];
    let filteredPhotos = [];
    let currentDisplayCount = 0;
    let currentPhotoIndex = -1;
    let isInfoVisible = true;

    // --- 2. Utility & Helper Functions (Defined BEFORE they are called) ---

    function getAlbumName() {
        const params = new URLSearchParams(window.location.search);
        let albumName = '';
        for (const [key, value] of params.entries()) {
            albumName = key || value;
            break;
        }
        return albumName.replace('.json', '');
    }

    // Fisher-Yates (Knuth) Shuffle Algorithm
    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function handleShuffle() {
        // Shuffle the master list of photos
        shuffleArray(allPhotos);
        
        // Apply the current filters to the newly shuffled list
        applyFilters(); 
        
        // Note: applyFilters handles clearing the grid and rerendering the first batch.
    }

    function populateFilters(photos) {
        const keywords = {};
        const categories = {};

        photos.forEach(photo => {
            const cat = photo.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;

            const photoKeywords = (photo.keywords || '').split(',').map(k => k.trim()).filter(k => k);
            photoKeywords.forEach(k => {
                keywords[k] = (keywords[k] || 0) + 1;
            });
        });

        const appendOptions = (selectElement, counts) => {
            const sorted = Object.entries(counts).sort(([keyA, countA], [keyB, countB]) => {
                if (countB !== countA) return countB - countA;
                return keyA.localeCompare(keyB);
            });
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

    function createPhotoElement(photo, index) {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.dataset.index = index;

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

        if (currentDisplayCount < filteredPhotos.length) {
            showMoreBtn.style.display = 'block';
            showMoreBtn.textContent = `Show More Photos (${filteredPhotos.length - currentDisplayCount} remaining)`;
        } else {
            showMoreBtn.style.display = 'none';
        }
    }

    function applyFilters() {
        const searchText = filterInput.value.toLowerCase();
        const selectedKeyword = keywordFilter.value;
        const selectedCategory = categoryFilter.value;

        filteredPhotos = allPhotos.filter(photo => {
            // 1. Search Text Filter (Simple "Search" - no 3+ char requirement, applies to title/keywords)
            if (searchText.length > 0) {
                const title = (photo.title || '').toLowerCase();
                const keywords = (photo.keywords || '').toLowerCase();
                if (!title.includes(searchText) && !keywords.includes(searchText)) {
                    return false;
                }
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

        currentDisplayCount = 0;
        photoGrid.innerHTML = '';
        renderPhotos();
    }

    // --- Modal Functions ---

    function updateModalContent(index) {
        if (index < 0 || index >= filteredPhotos.length) {
            return;
        }
        currentPhotoIndex = index;
        const photo = filteredPhotos[currentPhotoIndex];

        modalImage.src = photo.url;
        modalTitle.textContent = photo.title;
        modalDescription.textContent = photo.description || 'No description available.';

        modalInfo.style.opacity = isInfoVisible ? 1 : 0;
    }

    function openModal(index) {
        updateModalContent(index);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('toggle-info-btn').textContent = isInfoVisible ? 'Hide Info' : 'Show Info';
    }

    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        currentPhotoIndex = -1;
    }

    function navigatePhoto(direction) {
        let newIndex = currentPhotoIndex + direction;
        
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
    
    // --- Meta Modal Functions ---
    function openMetaModal() {
        if (Object.keys(albumMetaData).length === 0) return;

        metaModalTitle.textContent = albumMetaData.albumTitle || 'Album Details';
        metaModalCreated.textContent = `Created: ${albumMetaData.meta.created || 'N/A'}`;
        metaModalNote.textContent = `Note: ${albumMetaData.meta.note || 'No note provided'}`;

        metaModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeMetaModal() {
        metaModal.style.display = 'none';
        document.body.style.overflow = '';
    }


    // --- 3. Core Execution Function ---

    async function loadAlbumData() {
        const albumName = getAlbumName();
        if (!albumName) {
            albumTitle.textContent = "Error Loading Album";
            return;
        }

        const fetchUrl = `${BASE_URL}${albumName}`;

        try {
            const response = await fetch(fetchUrl);
            const data = await response.json();

            // Store all data for meta and photos
            albumMetaData = data;
            
            // Set Page Header Title from JSON
            albumTitle.textContent = data.albumTitle || 'Photo Album';
            if (data.meta && (data.meta.created || data.meta.note)) {
                showMetaBtn.style.display = 'block';
            }

            allPhotos = (data.photos || []).filter(p => p.url);
            filteredPhotos = allPhotos;

            populateFilters(allPhotos); 
            renderPhotos();
        } catch (error) {
            console.error('Failed to load album data from proxy:', fetchUrl, error);
            albumTitle.textContent = "Error: Check Console";
        }
    }

    // --- 4. Execution Call & Event Listeners ---

    loadAlbumData();

    // Show More / Shuffle / Filters
    showMoreBtn.addEventListener('click', renderPhotos);
    shuffleBtn.addEventListener('click', handleShuffle);
    filterInput.addEventListener('input', applyFilters);
    keywordFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);

    // Meta Modal
    showMetaBtn.addEventListener('click', openMetaModal);
    closeMetaBtn.addEventListener('click', closeMetaModal);

    // Image Modal
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('prev-btn').addEventListener('click', () => navigatePhoto(-1));
    document.getElementById('next-btn').addEventListener('click', () => navigatePhoto(1));
    document.getElementById('toggle-info-btn').addEventListener('click', toggleInfo);
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullScreen);

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (modal.style.display === 'flex') {
            if (e.key === 'Escape') {
                closeModal();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigatePhoto(-1);
            } else if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                navigatePhoto(1);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                toggleInfo();
            }
        } else if (metaModal.style.display === 'flex' && e.key === 'Escape') {
            closeMetaModal();
        }
    });

    // Handle browser exit from full screen
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            modal.classList.remove('fullscreen');
        }
    });
});
