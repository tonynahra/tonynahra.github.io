// --- YOUTUBE API SETUP ---
var isYouTubeReady = false;
var ytPlayer = null;

window.onYouTubeIframeAPIReady = function() {
    isYouTubeReady = true;
    console.log("[DEBUG] YouTube API Ready");
    document.dispatchEvent(new Event('youtube_api_ready'));
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION CONSTANTS ---
    const BASE_URL = 'https://mediamaze.com/json/?'; 
    const DROPDOWN_TEXT_LIMIT = 50; 

    // --- SECURITY / INTEGRITY CHECK ---
    if (typeof window.lpEndLoaded === 'undefined' || typeof window.viewCountsLoaded === 'undefined') {
        document.body.innerHTML = '<div style="color:red;padding:50px;text-align:center;font-family:sans-serif;"><h1>System Error</h1><p>Required components are missing. Viewer cannot initialize.</p></div>';
        throw new Error("Integrity check failed: Components missing.");
    }

    // --- EFFECTS LIST ---
    const TRANSITIONS = [
        { name: "Fade", in: 'animate__fadeIn', out: 'animate__fadeOut' },
        { name: "Zoom", in: 'animate__zoomIn', out: 'animate__zoomOut' },
        { name: "Slide", in: 'animate__slideInRight', out: 'animate__slideOutLeft' },
        { name: "Flip Y", in: 'animate__flipInY', out: 'animate__flipOutY' },
        { name: "Flip X", in: 'animate__flipInX', out: 'animate__flipOutX' }, // New
        { name: "Rotate", in: 'animate__rotateIn', out: 'animate__rotateOut' },
        { name: "Roll", in: 'animate__rollIn', out: 'animate__rollOut' },
        { name: "Back Down", in: 'animate__backInDown', out: 'animate__backOutDown' },
        { name: "Zoom Up", in: 'animate__zoomInUp', out: 'animate__zoomOutUp' },
        { name: "LightSpeed", in: 'animate__lightSpeedInLeft', out: 'animate__lightSpeedOutRight' },
        { name: "Bounce", in: 'animate__bounceIn', out: 'animate__bounceOut' }, // New
        { name: "JackInBox", in: 'animate__jackInTheBox', out: 'animate__fadeOut' } // New (Custom out)
    ];

    let albumMetaData = {};
    let allPhotos = [];
    let currentFilteredPhotos = []; 
    let currentPhotoIndex = 0;
    let infoMode = 1; 
    let sortedCategories = []; 
    let currentCategoryIdx = -1;
    let musicPlaylist = [];
    let currentMusicIndex = 0;
    let isMusicEnabled = false; 
    let hasUserInteracted = false; 
    
    // Slideshow State
    let slideshowIntervalId = null;
    let currentSlideshowSpeed = 8000; 

    let isSilentMode = false;
    let mouseTimer = null;
    let requestFullscreenOnInteract = false; 
    let currentNoteIndex = -1; 

    // Visual State
    let forcedEffectIndex = -1; // -1 = Random

    // Resume State
    let resumeState = {
        slideshow: false,
        music: false
    };
    
    // --- 2. UTILITY ---
    function getEl(id) { return document.getElementById(id); }
    
    function bindClick(id, handler) {
        const el = getEl(id);
        if (el) el.addEventListener('click', handler);
    }
    
    function showToast(message, isBig = false, duration = 2000, force = false) {
        if (isSilentMode && !force) return;

        const c = getEl('toast-container');
        if(!c) return;
        c.innerHTML = ''; 
        const t = document.createElement('div');
        t.className = 'toast-message' + (isBig ? ' big' : '');
        t.innerHTML = message;
        c.appendChild(t);
        void t.offsetWidth; t.classList.add('show');
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => { if(t.parentNode) t.parentNode.removeChild(t); }, 300); }, duration);
    }

    async function loadExternalHtml(url, containerId) {
        const container = getEl(containerId);
        if (!container) return;
        try {
            const res = await fetch(url);
            if (res.ok) container.innerHTML = await res.text();
        } catch (e) { console.warn(`[LP] Error loading ${url}`, e); }
    }

    function loadYouTubeAPI() {
        if (document.getElementById('youtube-api-script')) return; 
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    function getAlbumName() {
        if (window.location.search && window.location.search.length > 1) {
            return window.location.search.substring(1).replace('.json', ''); 
        }
        const hash = window.location.hash.substring(1);
        if (hash.includes('/')) {
            return hash.split('#')[0].replace('.json', ''); 
        }
        return '';
    }
    
    function shouldStartWithInfo() {
        const s = window.location.search;
        const h = window.location.hash;
        return s.includes('/info') || h.includes('#info');
    }

    function updatePageMeta(data) {
        if (!data) return;
        const m = data.meta || {};
        document.title = m.og_title || m.twitter_title || data.albumTitle || 'Photo Album';
    }

    // --- 5. MAIN VIEWER LOGIC ---
    function updateMainImage(direction = 0) {
        if (currentFilteredPhotos.length === 0) return;
        
        if (infoMode === 2) setInfoMode(1);

        let newIndex = currentPhotoIndex + direction;
        if (newIndex < 0) newIndex = currentFilteredPhotos.length - 1;
        else if (newIndex >= currentFilteredPhotos.length) newIndex = 0;
        
        currentPhotoIndex = newIndex;
        const photo = currentFilteredPhotos[currentPhotoIndex];

        // Reset Notes Logic
        currentNoteIndex = -1;
        const notesBtn = getEl('notes-btn');
        if (notesBtn) {
            if (photo.notes && photo.notes.length > 0) {
                notesBtn.style.display = 'flex'; 
                notesBtn.classList.remove('notes-active');
            } else {
                notesBtn.style.display = 'none'; 
            }
        }
        
        updateNoteIndicator();

        getEl('photo-title').textContent = photo.title || 'Untitled';
        getEl('photo-desc').innerHTML = photo.description || ''; 
        getEl('photo-exif').innerHTML = '';

        const counter = getEl('photo-counter');
        if(counter) counter.textContent = `${currentPhotoIndex + 1} / ${currentFilteredPhotos.length}`;

        getEl('detail-title').textContent = photo.title || 'Untitled';
        getEl('detail-desc').innerHTML = photo.description || ''; 
        
        const detailExif = getEl('detail-exif');
        detailExif.innerHTML = '';
        if (photo.exif) {
            Object.entries(photo.exif).forEach(([k, v]) => {
                const s = document.createElement('span');
                s.className = 'exif-item'; s.textContent = `${k.toUpperCase()}: ${v}`;
                detailExif.appendChild(s);
            });
        }

        const wrapper = getEl('image-wrapper');
        const oldImages = Array.from(wrapper.querySelectorAll('img'));
        
        // --- EFFECT SELECTION ---
        let selectedEffect;
        if (forcedEffectIndex !== -1 && TRANSITIONS[forcedEffectIndex]) {
            selectedEffect = TRANSITIONS[forcedEffectIndex];
        } else {
            selectedEffect = TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)];
        }

        const newImg = document.createElement('img');
        newImg.src = photo.url;
        newImg.alt = photo.title;
        newImg.style.zIndex = "10"; 
        newImg.className = `animate__animated ${selectedEffect.in}`; 
        wrapper.appendChild(newImg);

        oldImages.forEach(oldImg => {
            oldImg.style.zIndex = "1";
            oldImg.className = ''; 
            oldImg.classList.add('animate__animated', selectedEffect.out);
            const cleanup = () => { if(oldImg.parentNode) oldImg.parentNode.removeChild(oldImg); };
            oldImg.addEventListener('animationend', cleanup, {once: true});
            setTimeout(cleanup, 1100); 
        });
        newImg.addEventListener('animationend', () => { newImg.classList.remove(selectedEffect.in); }, {once:true});
    }

    // --- EFFECT TOGGLE (E Key) ---
    function toggleFadeOnly() {
        if (forcedEffectIndex === -1) {
            forcedEffectIndex = 0; // Fade (Index 0)
            showToast("Effect: Fade Only");
        } else {
            forcedEffectIndex = -1; // Random
            showToast("Effect: Random");
        }
    }

    function updateNoteIndicator() {
        const indicator = getEl('note-indicator');
        if (!indicator) return;

        indicator.classList.add('hidden');

        if (isSilentMode) return;

        if (currentFilteredPhotos.length === 0) return;
        const photo = currentFilteredPhotos[currentPhotoIndex];
        const notesCount = (photo && photo.notes) ? photo.notes.length : 0;
        
        if (notesCount === 0) return; 

        const totalPages = notesCount + 1; 
        let text = "";

        if (infoMode === 2) {
            text = `Note ${totalPages} / ${totalPages}`;
        } else if (currentNoteIndex > -1) {
            text = `Note ${currentNoteIndex + 1} / ${totalPages}`;
        } else {
            text = `Original / ${totalPages}`;
        }

        indicator.textContent = text;
        indicator.classList.remove('hidden');
    }

    function applyNoteView() {
        if (currentFilteredPhotos.length === 0) return;
        const photo = currentFilteredPhotos[currentPhotoIndex];
        const notesBtn = getEl('notes-btn');
        const activeImg = getEl('image-wrapper').querySelector('img:last-child'); 

        if (currentNoteIndex === -1) {
            if(activeImg) activeImg.src = photo.url;
            if(notesBtn) notesBtn.classList.remove('notes-active');
            showToast("Showing Original");
        } else {
            if (photo.notes && photo.notes[currentNoteIndex]) {
                if(activeImg) activeImg.src = photo.notes[currentNoteIndex];
                if(notesBtn) notesBtn.classList.add('notes-active');
            }
        }
        updateNoteIndicator();
    }

    function toggleNotes() {
        if (currentFilteredPhotos.length === 0) return;
        const photo = currentFilteredPhotos[currentPhotoIndex];
        if (!photo.notes || photo.notes.length === 0) return;

        currentNoteIndex++;
        if (currentNoteIndex >= photo.notes.length) {
            currentNoteIndex = -1; 
        }
        applyNoteView();
    }

    function handleArrowUp() {
        const photo = currentFilteredPhotos[currentPhotoIndex];
        const notesCount = (photo && photo.notes) ? photo.notes.length : 0;

        if (infoMode === 0) {
            setInfoMode(1);
        } else if (infoMode === 1) {
            if (currentNoteIndex < notesCount - 1) {
                currentNoteIndex++;
                applyNoteView();
            } else {
                setInfoMode(2); 
            }
        }
    }

    function handleArrowDown() {
        const photo = currentFilteredPhotos[currentPhotoIndex];
        const notesCount = (photo && photo.notes) ? photo.notes.length : 0;

        if (infoMode === 2) {
            setInfoMode(1);
            if (notesCount > 0) {
                currentNoteIndex = notesCount - 1;
                applyNoteView();
            }
        } else if (infoMode === 1) {
            if (currentNoteIndex > -1) {
                currentNoteIndex--;
                applyNoteView();
            } else {
                setInfoMode(0);
            }
        }
    }

    function toggleSlideshow(speed) {
        if (speed) currentSlideshowSpeed = speed; 
        
        if (slideshowIntervalId) {
            stopSlideshow();
        } else {
            showToast(`Slideshow Started (${currentSlideshowSpeed/1000}s)`);
            slideshowIntervalId = setInterval(() => updateMainImage(1), currentSlideshowSpeed);
        }
    }

    function stopSlideshow() {
        if (slideshowIntervalId) {
            clearInterval(slideshowIntervalId);
            slideshowIntervalId = null;
            showToast("Slideshow Paused");
        }
    }

    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => {
                requestFullscreenOnInteract = true;
            });
        } else {
            document.exitFullscreen();
        }
    }

    document.addEventListener('mousemove', () => {
        document.body.classList.remove('hide-cursor');
        if (mouseTimer) clearTimeout(mouseTimer);
        
        if (document.fullscreenElement && isSilentMode) {
            mouseTimer = setTimeout(() => {
                if (document.fullscreenElement && isSilentMode) {
                    document.body.classList.add('hide-cursor');
                }
            }, 3000);
        }
    });

    function setInfoMode(mode) {
        infoMode = mode;
        const bottomOverlay = getEl('info-overlay');
        const detailModal = getEl('photo-details-modal');
        const counter = getEl('photo-counter');

        if (mode === 0) { 
            if(bottomOverlay) bottomOverlay.classList.add('hidden');
            if(detailModal) detailModal.style.display = 'none';
            if(counter) counter.classList.add('hidden'); 
            document.body.classList.remove('info-on');
        } else if (mode === 1) { 
            if(bottomOverlay) bottomOverlay.classList.remove('hidden');
            if(detailModal) detailModal.style.display = 'none';
            if(counter) counter.classList.remove('hidden'); 
            document.body.classList.add('info-on');
        } else if (mode === 2) { 
            if(bottomOverlay) bottomOverlay.classList.add('hidden'); 
            if(detailModal) detailModal.style.display = 'flex';    
            if(counter) counter.classList.add('hidden'); 
            document.body.classList.add('info-on');
        }
        updateNoteIndicator(); 
    }

    function toggleInfo() {
        if (infoMode > 0) setInfoMode(0);
        else setInfoMode(1);
    }

    function bindGlobalAudioUnlock() {
        const unlock = () => {
            if (hasUserInteracted) return; 
            hasUserInteracted = true;
            if (requestFullscreenOnInteract) {
                toggleFullScreen();
                requestFullscreenOnInteract = false;
            }
            if (isMusicEnabled) {
                setTimeout(() => { if(isMusicEnabled) playCurrentTrack(); }, 50);
            }
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
        document.addEventListener('touchstart', unlock);
    }

    function playCurrentTrack() {
        if(musicPlaylist.length === 0) return;
        const track = musicPlaylist[currentMusicIndex];
        const btn = getEl('music-btn');
        if(btn) btn.classList.add('music-active');
        
        if (track.type === 'mp3') {
            const audio = getEl('audio-element');
            audio.src = track.url;
            audio.play().then(() => {
                if(!isMusicEnabled) {
                    audio.pause();
                    if(btn) btn.classList.remove('music-active');
                }
            }).catch(e => { console.warn("Play blocked"); });
        } else if (track.type === 'youtube') {
            let vidId = track.url.split('v=')[1].split('&')[0];
            if (!isYouTubeReady) {
                document.addEventListener('youtube_api_ready', () => playCurrentTrack(), {once:true});
                return;
            }
            if (!ytPlayer) {
                ytPlayer = new YT.Player('youtube-player-placeholder', {
                    height: '0', width: '0', videoId: vidId,
                    events: { 'onReady': (e) => { 
                        e.target.playVideo(); 
                        setTimeout(() => { if(!isMusicEnabled) e.target.pauseVideo(); }, 500);
                    }}
                });
            } else {
                ytPlayer.loadVideoById(vidId);
                ytPlayer.playVideo();
            }
        }
    }

    function pauseMusic() {
        if(musicPlaylist.length === 0) return; 
        const btn = getEl('music-btn');
        const audio = getEl('audio-element');
        if(audio) audio.pause();
        if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
        if(btn) btn.classList.remove('music-active');
        showToast("Music Paused");
    }

    function nextMusicTrack() {
        if(musicPlaylist.length === 0) return;
        currentMusicIndex = (currentMusicIndex + 1) % musicPlaylist.length;
        if (!isMusicEnabled) {
            isMusicEnabled = true; hasUserInteracted = true;
        }
        playCurrentTrack();
        showToast(`Playing: ${musicPlaylist[currentMusicIndex].title}`);
    }

    function handleMusicToggle() {
        if(musicPlaylist.length === 0) return;
        isMusicEnabled = !isMusicEnabled;
        if (isMusicEnabled) {
            hasUserInteracted = true; 
            playCurrentTrack();
            showToast("Music On");
        } else {
            pauseMusic();
        }
    }

    function toggleSilentMode() {
        isSilentMode = !isSilentMode;
        if (isSilentMode) {
            showToast("Silent Mode ON (No Toasts)", false, 2000, true); 
        } else {
            showToast("Silent Mode OFF");
            document.body.classList.remove('hide-cursor'); 
            if(mouseTimer) clearTimeout(mouseTimer);
        }
        updateNoteIndicator(); 
    }

    function populateGridCategories() {
        const counts = {};
        allPhotos.forEach(p => {
            const rawCats = p.categories || p.category; 
            if (!rawCats) return;
            const tags = rawCats.split(',').map(s => s.trim()).filter(s => s.length > 0);
            tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
        });

        const select = getEl('grid-category-filter');
        select.innerHTML = '';

        if (Object.keys(counts).length === 0) {
            const noOpt = document.createElement('option');
            noOpt.textContent = "No Categories";
            noOpt.disabled = true;
            noOpt.selected = true; 
            select.appendChild(noOpt);
            select.disabled = true;
            sortedCategories = [];
        } else {
            const allOpt = document.createElement('option');
            allOpt.value = "";
            allOpt.textContent = "All Categories";
            select.appendChild(allOpt);

            const sortedKeys = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
            sortedCategories = sortedKeys; 

            sortedKeys.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = `${cat} (${counts[cat]})`;
                select.appendChild(opt);
            });
            
            select.disabled = false;
            select.onchange = () => { 
                const val = select.value;
                if(val === "") currentCategoryIdx = -1;
                else currentCategoryIdx = sortedCategories.indexOf(val);
                filterGridPhotos(val); 
            };
        }
        
        updateMetaCounts(Object.keys(counts).length);
    }

    function updateMetaCounts(catCount) {
        const display = getEl('meta-categories-display');
        if (!display) return;
        let text = "";
        if (catCount > 0) text += `Categories found: ${catCount}`;
        if (musicPlaylist.length > 0) {
            if (text !== "") text += ", ";
            text += `Music found: ${musicPlaylist.length}`;
        }
        if (text === "") display.style.display = 'none';
        else {
            display.textContent = text;
            display.style.display = 'block';
        }
    }

    function cycleCategory(direction) {
        if (sortedCategories.length === 0) return;
        let newIdx = currentCategoryIdx + direction;
        if (newIdx < -1) {
            currentCategoryIdx = -1; 
            showToast("Page Down for Categories");
            return;
        }
        if (newIdx >= sortedCategories.length) {
            currentCategoryIdx = sortedCategories.length - 1;
            showToast("No More Categories");
            return;
        }
        currentCategoryIdx = newIdx;
        let catName = "";
        if (currentCategoryIdx === -1) {
            catName = ""; 
            showToast("Showing all photos", false, 2000); 
        } else {
            catName = sortedCategories[currentCategoryIdx];
            showToast(`Category:<br><span style="font-size: 1.3em; font-weight: bold;">${catName}</span>`, false, 2000);
        }
        const select = getEl('grid-category-filter');
        if (select) select.value = catName;
        filterGridPhotos(catName);
        currentPhotoIndex = 0;
        updateMainImage(0);
    }

    function resetAlbum() {
        stopSlideshow();
        currentFilteredPhotos = [...allPhotos];
        currentCategoryIdx = -1;
        const select = getEl('grid-category-filter');
        if(select) select.value = "";
        currentPhotoIndex = 0;
        if (getEl('grid-modal').style.display === 'flex') renderGrid();
        updateMainImage(0);
        showToast("Album Reset");
    }

    function filterGridPhotos(category) {
        if (!category) {
            currentFilteredPhotos = [...allPhotos];
        } else {
            currentFilteredPhotos = allPhotos.filter(p => {
                const raw = p.categories || p.category;
                if(!raw) return false;
                const tags = raw.split(',').map(s => s.trim());
                return tags.includes(category);
            });
        }
        if (getEl('grid-modal').style.display === 'flex') renderGrid();
    }

    function renderGrid() {
        const grid = getEl('photo-grid');
        grid.innerHTML = ''; 
        currentFilteredPhotos.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'photo-item';
            const img = document.createElement('img');
            img.src = photo.thumbnailUrl || photo.url;
            img.loading = "lazy";
            item.appendChild(img);
            item.onclick = () => {
                currentPhotoIndex = index;
                updateMainImage(0); 
                closeAllModals(); 
            };
            grid.appendChild(item);
        });
    }

    // --- STATE SUSPENSION LOGIC ---
    function suspendState() {
        resumeState.slideshow = !!slideshowIntervalId;
        resumeState.music = isMusicEnabled; 

        if (slideshowIntervalId) {
            clearInterval(slideshowIntervalId);
            slideshowIntervalId = null;
        }
        
        if (resumeState.music) {
            const audio = getEl('audio-element');
            if(audio) audio.pause();
            if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
        }
    }

    function restoreState() {
        if (resumeState.slideshow) {
            toggleSlideshow(currentSlideshowSpeed);
        }
        
        if (resumeState.music) {
            const audio = getEl('audio-element');
            if(audio) audio.play().catch(e => console.warn(e));
            if (ytPlayer && typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
        }
        
        resumeState.slideshow = false;
        resumeState.music = false;
    }

    // --- MODAL HANDLERS ---
    function openGrid() {
        suspendState(); 
        closeAllModals(false); 
        if (getEl('grid-category-filter').options.length <= 1) populateGridCategories();
        renderGrid(); 
        getEl('grid-modal').style.display = 'flex';
    }

    function closeAllModals(shouldRestore = true) {
        document.querySelectorAll('.overlay-modal').forEach(m => m.style.display = 'none');
        if(getEl('modal-music-status')) getEl('modal-music-status').textContent = '';
        if (infoMode === 2) setInfoMode(1);
        
        if (shouldRestore) {
            restoreState(); 
        }
    }

    function openHelp() {
        suspendState();
        closeAllModals(false);
        getEl('help-modal').style.display = 'flex';
    }

    function openAbout() {
        suspendState();
        closeAllModals(false);
        getEl('meta-album-title').textContent = albumMetaData.albumTitle || 'Album';
        getEl('meta-created').textContent = albumMetaData.meta?.created || 'N/A';
        getEl('meta-note').textContent = albumMetaData.meta?.note || '';
        if(getEl('meta-og-desc')) getEl('meta-og-desc').textContent = albumMetaData.meta?.og_description || '';
        
        const hasMusic = musicPlaylist.length > 0;
        const closeBtn = getEl('close-meta-btn');
        const startupOpts = getEl('startup-options');

        if (hasMusic) {
            closeBtn.style.display = 'none';
            startupOpts.style.display = 'flex';
            setTimeout(() => {
                const silentBtn = getEl('btn-view-silent');
                if(silentBtn) silentBtn.focus();
            }, 100);
        } else {
            closeBtn.style.display = 'block';
            startupOpts.style.display = 'none';
        }
        getEl('meta-modal').style.display = 'flex';
    }

    function openAdmin() {
        const photo = currentFilteredPhotos[currentPhotoIndex];
        if(!photo) return;
        suspendState();
        getEl('admin-json').textContent = getAlbumName() + ".json";
        getEl('admin-id').textContent = photo.id;
        const adminLink = `https://mediamaze.com/tony/PhotoAlbum/public/?${getAlbumName()}#${photo.id}`;
        getEl('admin-url').href = adminLink;
        getEl('admin-url').textContent = "Link";
        getEl('admin-modal').style.display = 'flex';
    }

    function openAssistant() {
        suspendState();
        closeAllModals(false);
        getEl('assistant-modal').style.display = 'flex';
        populateAssistantDropdowns(); 
        updateAssistantLink(); 
    }

    function openEndScreen() {
        suspendState();
        closeAllModals(false);
        if(typeof window.openEndScreen === 'function') window.openEndScreen();
    }

    // --- ASSISTANT POPULATION ---
    function populateAssistantDropdowns() {
        const catSelect = getEl('opt-cat');
        if(catSelect) {
            while (catSelect.options.length > 1) catSelect.remove(1);
            
            const counts = {};
            allPhotos.forEach(p => {
                const rawCats = p.categories || p.category;
                if (!rawCats) return;
                const tags = rawCats.split(',').map(s => s.trim()).filter(s => s.length > 0);
                tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
            });

            sortedCategories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = `${cat} (${counts[cat] || 0})`; 
                catSelect.appendChild(opt);
            });
        }

        const idSelect = getEl('opt-id');
        if(idSelect) {
            while (idSelect.options.length > 1) idSelect.remove(1);
            allPhotos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                
                let fullText = `ID: ${p.id} - ${p.title || "Untitled"}`;
                
                if (fullText.length > DROPDOWN_TEXT_LIMIT) {
                    fullText = fullText.substring(0, DROPDOWN_TEXT_LIMIT - 3) + "...";
                }
                
                opt.textContent = fullText;
                idSelect.appendChild(opt);
            });
        }
        
        const efxSelect = getEl('opt-effect');
        if(efxSelect) {
            while (efxSelect.options.length > 1) efxSelect.remove(1);
            TRANSITIONS.forEach((t, idx) => {
                const opt = document.createElement('option');
                opt.value = idx + 1; 
                opt.textContent = `${t.name} (E${idx + 1})`;
                efxSelect.appendChild(opt);
            });
        }
    }

    function initAssistant() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                getEl(btn.dataset.tab).classList.add('active');
            });
        });

        const inputs = ['opt-silent','opt-notes','opt-random','opt-full','opt-info','opt-end','opt-id','opt-cat','opt-kw','opt-speed','opt-effect'];
        inputs.forEach(id => {
            const el = getEl(id);
            if(el) {
                el.addEventListener('input', () => {
                    if (id === 'opt-kw') updateKeywordCount();
                    updateAssistantLink();
                });
                el.addEventListener('change', updateAssistantLink);
            }
        });

        bindClick('btn-copy-link', () => {
            const link = getEl('generated-link');
            link.select();
            document.execCommand('copy');
            showToast("Link Copied");
        });

        bindClick('btn-apply-link', () => {
            const link = getEl('generated-link').value;
            window.location.href = link;
            window.location.reload();
        });
        
        bindClick('close-assistant-btn', () => closeAllModals());
    }

    function updateKeywordCount() {
        const input = getEl('opt-kw');
        if(!input) return;
        
        const kw = input.value.trim().toLowerCase();
        const countBadge = getEl('kw-count');
        if (!countBadge) return;

        if (!kw) {
            countBadge.textContent = "0 matches";
            return;
        }
        const matches = allPhotos.filter(p => (p.title || "").toLowerCase().includes(kw)).length;
        countBadge.textContent = `${matches} match${matches !== 1 ? 'es' : ''}`;
    }

    function updateAssistantLink() {
        const baseUrl = window.location.href.split('#')[0];
        let hashParts = [];

        if (getEl('opt-random').checked) hashParts.push('R');
        if (getEl('opt-silent').checked) hashParts.push('S');
        if (getEl('opt-notes').checked) hashParts.push('N');
        if (getEl('opt-full').checked) hashParts.push('F');
        if (getEl('opt-info').checked) hashParts.push('I');
        if (getEl('opt-end').checked) hashParts.push('E');

        const speed = getEl('opt-speed').value;
        if (speed) {
            const digit = parseInt(speed) - 2;
            if (digit >= 1 && digit <= 9) hashParts.push(digit);
        }
        
        const efx = getEl('opt-effect').value;
        if (efx && efx !== "0") {
            hashParts.push(`E${efx}`); 
        }

        const catEl = getEl('opt-cat');
        if (catEl && catEl.value) hashParts.push(`CAT-${catEl.value}`);
        
        const kwEl = getEl('opt-kw');
        if (kwEl && kwEl.value.trim()) hashParts.push(`KW-${kwEl.value.trim()}`);

        const idEl = getEl('opt-id');
        if (idEl && idEl.value) hashParts.push(idEl.value);

        const hash = hashParts.length > 0 ? '#' + hashParts.join(',') : '';
        getEl('generated-link').value = baseUrl + hash;
    }

    function parseHashOptions(hash) {
        const parts = hash.split(',');
        const opts = { 
            startId: null,
            filters: { category: null, keyword: null },
            flags: { silent: false, notes: false, fullscreen: false, randomize: false },
            actions: { slideshowSpeed: null, openInfo: false, openEnd: false, effectIndex: -1 }
        };

        parts.forEach(part => {
            const p = part.trim();
            if (!p) return;

            if (/^[1-9]$/.test(p)) {
                opts.actions.slideshowSpeed = (parseInt(p) + 2) * 1000;
            }
            else if (p === 'S') opts.flags.silent = true;
            else if (p === 'N') opts.flags.notes = true;
            else if (p === 'R') opts.flags.randomize = true;
            else if (p === 'F') opts.flags.fullscreen = true;
            else if (p === 'I') opts.actions.openInfo = true;
            else if (p === 'E') opts.actions.openEnd = true;
            
            else if (p.toUpperCase().startsWith('E') && /^\d+$/.test(p.substring(1))) {
                const eIdx = parseInt(p.substring(1));
                if (eIdx === 0) opts.actions.effectIndex = -1;
                else opts.actions.effectIndex = eIdx - 1;
            }
            
            else if (p.toUpperCase().startsWith('CAT-')) {
                opts.filters.category = p.substring(4).toLowerCase(); 
            }
            else if (p.toUpperCase().startsWith('KW-')) {
                opts.filters.keyword = p.substring(3).toLowerCase();
            }
            else {
                opts.startId = p;
            }
        });
        return opts;
    }

    async function init() {
        const name = getAlbumName();
        setInfoMode(1);

        if (!name) {
            // getEl('main-viewer').innerHTML = '<div class="error-message">Error: No album specified in URL.</div>';
            window.location.href = "about.html";
            return;
        }

        loadExternalHtml('common/LP_first.html', 'lp-first-content');
        loadExternalHtml('common/LP_help.html', 'lp-help-content');

        try {
            const res = await fetch(`${BASE_URL}${name}`);
            if(!res.ok) throw new Error("Fetch Failed");
            const data = await res.json();
            
            if (data._security && data._security.mode === 'Private') {
                document.body.innerHTML = `
                    <div class="private-overlay">
                        <div class="private-box">
                            <h1>🔒 Private Album</h1>
                            <p>This album is private.</p>
                        </div>
                    </div>`;
                return; 
            }
            
            albumMetaData = data;
            updatePageMeta(data);

            allPhotos = (data.photos || []).filter(p => p.url && (!p.mode || p.mode !== 'Private'));
            
            const hashString = window.location.hash.substring(1); 
            const startupOpts = parseHashOptions(hashString);

            if (startupOpts.flags.randomize) {
                allPhotos.sort(() => Math.random() - 0.5);
                showToast("Randomized"); 
            }

            if (startupOpts.filters.keyword) {
                const kw = startupOpts.filters.keyword;
                allPhotos = allPhotos.filter(p => (p.title || "").toLowerCase().includes(kw));
            }

            currentFilteredPhotos = [...allPhotos];
            
            populateGridCategories();
            
            if (startupOpts.filters.category) {
                const targetCat = startupOpts.filters.category;
                const actualCat = sortedCategories.find(c => c.toLowerCase() === targetCat);
                if (actualCat) {
                    currentCategoryIdx = sortedCategories.indexOf(actualCat);
                    filterGridPhotos(actualCat);
                    const select = getEl('grid-category-filter');
                    if(select) select.value = actualCat;
                }
            }

            if (startupOpts.startId) {
                const foundIdx = currentFilteredPhotos.findIndex(p => String(p.id) === startupOpts.startId);
                if (foundIdx !== -1) currentPhotoIndex = foundIdx;
            }

            if(data.music && data.music.length > 0) {
                musicPlaylist = data.music;
                isMusicEnabled = false; 
                const hasYoutube = musicPlaylist.some(t => t.type === 'youtube');
                if(hasYoutube) loadYouTubeAPI();
                bindGlobalAudioUnlock(); 
            } else {
                const mBtn = getEl('music-btn');
                if(mBtn) mBtn.style.display = 'none';
                const helpLiMusic = document.querySelector('li[data-action="music"]');
                if(helpLiMusic) helpLiMusic.style.display = 'none';
                const helpLiNext = document.querySelector('li[data-action="next-track"]');
                if(helpLiNext) helpLiNext.style.display = 'none';
            }
            
            if (startupOpts.flags.silent) toggleSilentMode();
            if (startupOpts.flags.notes) {
                setTimeout(() => toggleNotes(), 100); 
            }
            if (startupOpts.flags.fullscreen) {
                requestFullscreenOnInteract = true;
            }
            
            if (startupOpts.actions.effectIndex !== -1) {
                forcedEffectIndex = startupOpts.actions.effectIndex;
            }

            if (currentFilteredPhotos.length > 0) {
                updateMainImage(0); 
            } else {
                getEl('main-viewer').innerHTML = '<div class="error-message">No photos found (Check filters).</div>';
            }

            if (startupOpts.actions.slideshowSpeed) {
                toggleSlideshow(startupOpts.actions.slideshowSpeed);
            }

            if (startupOpts.actions.openEnd) {
                openEndScreen();
            } else if (startupOpts.actions.openInfo) {
                openAbout();
            } else if (shouldStartWithInfo()) {
                openAbout();
            }

        } catch (e) {
            console.error(e);
            getEl('main-viewer').innerHTML = '<div class="error-message">Failed to load album data.</div>';
        }
    }

    bindClick('prev-btn', () => { updateMainImage(-1); });
    bindClick('next-btn', () => { updateMainImage(1); });
    bindClick('grid-btn', openGrid);
    bindClick('help-btn', openHelp);
    bindClick('about-btn', openAbout);
    bindClick('fullscreen-btn', toggleFullScreen);
    bindClick('music-btn', handleMusicToggle);
    bindClick('close-grid-btn', closeAllModals);
    bindClick('close-help-btn', closeAllModals);
    bindClick('close-meta-btn', closeAllModals); 
    bindClick('close-admin-btn', () => getEl('admin-modal').style.display = 'none');
    bindClick('close-detail-btn', () => { setInfoMode(1); });
    bindClick('btn-view-music', () => {
        isMusicEnabled = true; hasUserInteracted = true;
        playCurrentTrack(); closeAllModals();
    });
    bindClick('btn-view-silent', () => {
        isMusicEnabled = false; pauseMusic(); closeAllModals();
    });
    bindClick('nav-instruction-btn', () => { closeAllModals(); openHelp(); });
    bindClick('notes-btn', toggleNotes);

    initAssistant(); 

    function bindHelpClicks() {
        const lists = [getEl('help-list-nav'), getEl('help-list-info')];
        lists.forEach(list => {
            if (!list) return;
            list.addEventListener('click', (e) => {
                const li = e.target.closest('li');
                if (!li) return;
                const action = li.getAttribute('data-action');
                
                closeAllModals(true); 

                switch(action) {
                    case 'next': updateMainImage(1); break;
                    case 'prev': updateMainImage(-1); break;
                    case 'fullscreen': toggleFullScreen(); break;
                    case 'slideshow': toggleSlideshow(); break;
                    case 'stop': stopSlideshow(); break;
                    case 'info': toggleInfo(); break;
                    case 'music': handleMusicToggle(); break;
                    case 'help': openHelp(); break; 
                    case 'info-modal': openAbout(); break; 
                    case 'grid': openGrid(); break;        
                    case 'shuffle': 
                        currentFilteredPhotos.sort(() => Math.random() - 0.5); 
                        currentPhotoIndex = 0; updateMainImage(0); 
                        showToast("Randomized"); 
                        break;
                    case 'category-nav': showToast("Use PageUp / PageDown keys"); break;
                    case 'reset': resetAlbum(); break; 
                    case 'next-track': nextMusicTrack(); break; 
                    case 'end': openEndScreen(); break;
                    case 'silent': toggleSilentMode(); break;
                    case 'notes': toggleNotes(); break;
                    case 'effect': toggleFadeOnly(); break; // NEW
                    case 'assist': openAssistant(); break;
                }
            });
        });
    }
    bindHelpClicks();

    document.addEventListener('keydown', (e) => {
        const grid = getEl('grid-modal');
        const isGridOpen = grid && grid.style.display === 'flex';
        const details = getEl('photo-details-modal');
        const isDetailsOpen = details && details.style.display === 'flex';
        const metaModal = getEl('meta-modal');
        const isMetaOpen = metaModal && metaModal.style.display === 'flex';
        const helpModal = getEl('help-modal');
        const isHelpOpen = helpModal && helpModal.style.display === 'flex';
        const endModal = getEl('end-screen-modal');
        const isEndOpen = endModal && endModal.style.display === 'flex';
        const assistModal = getEl('assistant-modal');
        const isAssistOpen = assistModal && assistModal.style.display === 'flex';
        const anyModal = document.querySelector('.overlay-modal[style*="flex"]');

        if ((e.key === 'Escape' || e.key === '0') && slideshowIntervalId) {
            e.preventDefault(); stopSlideshow(); return;
        }

        if (isMetaOpen) {
            const navKeys = ['ArrowRight', 'ArrowLeft', ' ', 'Enter'];
            if (navKeys.includes(e.key)) {
                e.preventDefault();
                isMusicEnabled = false; 
                pauseMusic();
                closeAllModals();
            } else if (e.key === 'Escape') {
                closeAllModals(); return;
            } else {
                return; 
            }
        }

        if (isHelpOpen || isAssistOpen) {
            const navKeys = ['ArrowRight', 'ArrowLeft', ' ', 'Enter', 'Home', 'PageUp', 'PageDown'];
            if (navKeys.includes(e.key)) closeAllModals();
            else if (e.key === 'Escape') { closeAllModals(); return; }
            else return;
        }

        if (isEndOpen) {
            if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
                e.preventDefault();
                if (typeof window.lpEndNav === 'function') window.lpEndNav(e.key);
                return;
            }
            const closeKeys = ['ArrowRight', 'ArrowLeft', ' ', 'Home', 'PageUp', 'PageDown', 'Escape'];
            if (closeKeys.includes(e.key)) {
                closeAllModals();
                return;
            }
            return;
        }

        if (isGridOpen) {
            if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { closeAllModals(); return; }
            const navKeys = ['ArrowRight', 'ArrowLeft', ' ', 'ArrowUp', 'ArrowDown', 'f', 'h', 'm', 'i'];
            if (navKeys.includes(e.key) || navKeys.includes(e.key.toLowerCase())) {
                closeAllModals(); 
            } else { return; }
        }

        if (isDetailsOpen) {
            if (e.key === 'Escape') { setInfoMode(1); return; }
        } else if (anyModal && !isMetaOpen && !isHelpOpen && !isEndOpen && !isAssistOpen) {
            if (e.key === 'Escape') closeAllModals();
            return; 
        }

        if (e.shiftKey && e.key.toLowerCase() === 'a') { openAdmin(); return; }
        
        switch(e.key) {
            case 'ArrowRight': case ' ': updateMainImage(1); break;
            case 'ArrowLeft': updateMainImage(-1); break;
            case 'ArrowUp': e.preventDefault(); handleArrowUp(); break;
            case 'ArrowDown': e.preventDefault(); handleArrowDown(); break;
            case 'f': case 'F': toggleFullScreen(); break; // RESTORED
            case 'e': case 'E': toggleFadeOnly(); break; // CHANGED
            case 'h': case 'H': openHelp(); break;
            case 'm': case 'M': handleMusicToggle(); break;
            case 'i': case 'I': openAbout(); break; 
            case 'p': case 'P': openGrid(); break;  
            case '0': if(slideshowIntervalId) toggleSlideshow(); break;
            case 'PageUp': e.preventDefault(); cycleCategory(-1); break;
            case 'PageDown': e.preventDefault(); cycleCategory(1); break;
            case 'Home': e.preventDefault(); resetAlbum(); break; 
            case 'Insert': e.preventDefault(); nextMusicTrack(); break; 
            case 'End': e.preventDefault(); openEndScreen(); break; 
            case 's': case 'S': toggleSilentMode(); break; 
            case 'r': case 'R': 
                currentFilteredPhotos.sort(() => Math.random() - 0.5); 
                currentPhotoIndex = 0; updateMainImage(0); 
                showToast("Randomized"); 
                break;
            case 'n': case 'N': toggleNotes(); break; 
            case 'a': case 'A': openAssistant(); break;
        }
        
        if (e.key >= '1' && e.key <= '9') {
            if(slideshowIntervalId) clearInterval(slideshowIntervalId);
            const speed = (parseInt(e.key) + 2) * 1000;
            slideshowIntervalId = setInterval(() => updateMainImage(1), speed);
            showToast(`Slideshow: ${speed/1000}s`);
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) document.body.classList.add('is-fullscreen');
        else document.body.classList.remove('is-fullscreen');
    });

    init();
});
