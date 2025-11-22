/* === GLOBAL VARIABLES === */
var currentCardList = []; // Stores the list of cards for modal navigation
var currentCardIndex = 0; // Stores the current position in the modal
var isModalInfoVisible = false; // Stores the state of the info toggle

// --- STOP_WORDS, REPLACEMENT_MAP, SYNONYM_MAP are in filterConfig.js ---

/**
 * Helper function to safely decode text.
 */
function decodeText(text) {
    if (!text) return "";
    try {
        var $textarea = $('<textarea></textarea>');
        $textarea.html(text);
        let decoded = $textarea.val();
        decoded = decodeURIComponent(decoded);
        return decoded;
    } catch (e) {
        return text;
    }
}

/* ==========================================================================
   GLOBAL HELPER FUNCTIONS
   (Defined outside $(document).ready so they are accessible to mainPage.js)
   ========================================================================== */

function handleCardView($scope, initialLoadOverride) {
    $scope.find('.card-list').each(function() {
        const $list = $(this);
        const $items = $list.children('.card-item');
        const totalItems = $items.length;
        const initialLimit = parseInt(initialLoadOverride) || 10;
        const increment = 10;
        
        $list.next('.toggle-card-button').remove(); 
        
        if (totalItems > initialLimit) {
            $items.slice(initialLimit).addClass('hidden-card-item');
            const remaining = totalItems - initialLimit;
            const $button = $(`<button class="toggle-card-button">Show More (${remaining} more) \u25BC</button>`);
            
            $button.data({'visible-count': initialLimit, 'increment': increment, 'total-items': totalItems});
            $list.after($button);
        }
    });
}

function showMoreCards($button, $list) {
    const $items = $list.children('.card-item');
    const totalItems = parseInt($button.data('total-items') || 0);
    const increment = parseInt($button.data('increment') || 10);
    const visibleCount = parseInt($button.data('visible-count') || 0);
    const newVisibleCount = visibleCount + increment;
    
    $items.slice(visibleCount, newVisibleCount).removeClass('hidden-card-item');
    $button.data('visible-count', newVisibleCount);
    
    const remaining = totalItems - newVisibleCount;
    if (remaining <= 0) { $button.hide(); } 
    else { $button.text(`Show More (${remaining} more) \u25BC`); }
}

function handleModalKeys(e) {
    if (!$('#content-modal').is(':visible')) {
        $(document).off('keydown.modalNav');
        return;
    }
    
    if ($(e.target).is('input, textarea, select')) {
        return;
    }

    switch (e.key) {
        case "Escape":
            $('.modal-close-btn').first().click();
            break;
        case "ArrowLeft":
            $('.modal-prev-btn').first().click();
            break;
        case "ArrowRight":
            $('.modal-next-btn').first().click();
            break;
        case " ": // Spacebar
            e.preventDefault(); 
            $('.modal-next-btn').first().click();
            break;
        case "i":
            e.preventDefault(); 
            $('.modal-info-btn').first().click();
            break;
    }
}

function populateCategoryFilter(listId, filterId) {
    const $filter = $(filterId);
    if (!$filter.length) return;

    const categoryCounts = {};

    try {
        $(`${listId} .card-item`).each(function() {
            const categories = $(this).data('category');
            if (categories) {
                String(categories).split(',').forEach(cat => {
                    const cleanCat = cat.trim();
                    if (cleanCat) {
                        categoryCounts[cleanCat] = (categoryCounts[cleanCat] || 0) + 1;
                    }
                });
            }
        });

        const sortedCategories = Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a); 

        $filter.children('option:not(:first)').remove(); 

        sortedCategories.forEach(([key, count]) => {
            $filter.append($('<option>', {
                value: key,
                text: `${key} (${count})`
            }));
        });

    } catch (error) {
        console.error("Error populating category filter:", error);
    }
}

function populateSmartKeywords(listId, filterId) {
    const $filter = $(filterId);
    if (!$filter.length) return; 

    const wordCounts = {}; 
    
    try {
        $(`${listId} .card-item`).each(function() {
            const $card = $(this);
            const localCardKeywords = new Set(); 
            
            const textSources = [
                $card.find('h3').text(),
                $card.find('p').text(),
                $card.find('.card-category').text(),
                $card.find('img').attr('alt'),
                $card.data('category'), 
                $card.data('keywords') 
            ];
            
            const combinedText = decodeText(textSources.join(' '));
            const words = combinedText.split(/[^a-zA-Z0-9'-]+/); 
            
            words.forEach(word => {
                let cleanWord = word.toLowerCase().trim().replace(/[^a-z0-9]/gi, ''); 
                
                if (typeof REPLACEMENT_MAP !== 'undefined' && REPLACEMENT_MAP[cleanWord]) {
                    cleanWord = REPLACEMENT_MAP[cleanWord];
                }
                
                if (cleanWord.length > 2 && cleanWord.length <= 15 && typeof STOP_WORDS !== 'undefined' && !STOP_WORDS.has(cleanWord) && isNaN(cleanWord)) {
                    localCardKeywords.add(cleanWord);
                }
            });

            localCardKeywords.forEach(key => {
                wordCounts[key] = (wordCounts[key] || 0) + 1;
            });
        });

        const sortedKeywords = Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 30); 

        $filter.children('option:not(:first)').remove();
        
        sortedKeywords.forEach(([key, count]) => {
            const displayText = key.length > 15 ? key.substring(0, 15) + '...' : key;
            
            $filter.append($('<option>', {
                value: key,
                text: `${displayText} (${count})` 
            }));
        });
    
    } catch (error) {
        console.error("Error populating smart keywords:", error);
    }
}

function getCardSearchableText($card) {
    const textSources = [
        $card.find('h3').text(),
        $card.find('p').text(),
        $card.find('.card-category').text(),
        $card.find('img').attr('alt'),
        $card.data('category'),
        $card.data('keywords')
    ];
    return decodeText(textSources.map(text => String(text || '')).join(' ').toLowerCase());
}

function checkKeywordMatch(cardText, selectedKeyword) {
    if (selectedKeyword === "all") return true;
    const synonyms = (typeof SYNONYM_MAP !== 'undefined') ? (SYNONYM_MAP[selectedKeyword] || []) : [];
    const keywordsToMatch = [selectedKeyword, ...synonyms];
    
    return keywordsToMatch.some(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'i'); 
        return regex.test(cardText);
    });
}

function filterCardsGeneric(listId, searchId, catFilterId, keyFilterId, noResultsId, initialLoad) {
    const searchTerm = decodeText($(searchId).val().toLowerCase());
    const selectedCategory = $(catFilterId).val();
    const selectedKeyword = $(keyFilterId).val();
    const $grid = $(listId);
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $(noResultsId);
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategory = $card.data('category'); 
            const cardText = getCardSearchableText($card); 
            
            const categoryMatch = (selectedCategory === "all" || String(cardCategory).includes(selectedCategory));
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword);

            if (categoryMatch && searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) $noResultsMessage.show(); else $noResultsMessage.hide();
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), initialLoad);
    }
}

/* === LOAD DATA FUNCTIONS === */

function loadPhotoAlbum(jsonUrl, initialLoadOverride) {
    const $albumList = $('#photo-album-list');
    $.getJSON(jsonUrl, function (albumData) {
        $('#album-title').text(decodeText(albumData.albumTitle));
        $albumList.empty(); 
        $.each(albumData.photos, function(index, photo) {
            const title = decodeText(photo.title);
            const category = decodeText(photo.category);
            const description = decodeText(photo.description);
            const cardHtml = `
                <div class="card-item" data-category="${category}" data-keywords="${title},${description}">
                    <a href="${photo.url}" data-load-type="image">
                        <img src="${photo.thumbnailUrl}" loading="lazy" class="card-image" alt="${title}">
                        <div class="photo-details"><h3>${title}</h3><p>${description}</p></div>
                    </a>
                </div>`;
            $albumList.append(cardHtml);
        });
        populateCategoryFilter('#photo-album-list', '#album-category-filter');
        populateSmartKeywords('#photo-album-list', '#album-keyword-filter');
        handleCardView($('#content-area'), initialLoadOverride);
    }).fail(function() { $('#album-title').text("Error Loading Album"); });
}

function loadVids(PL, Category, BKcol, initialLoadOverride) {
    $('#Grid').empty(); 
    var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'; 
    var URL = 'https://www.googleapis.com/youtube/v3/playlistItems';
    var options = { part: 'snippet', key: key, maxResults: 50, playlistId: PL };

    $.getJSON(URL, options, function (data) {
        $('#playlist-title').text(`Youtubelist: ${Category.replace(/_/g, ' ')}`);
        if (data.items) {
            $.each(data.items, function (i, item) {
                let thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '';
                const title = decodeText(item.snippet.title);
                const desc = decodeText(item.snippet.description);
                const vid = item.snippet.resourceId.videoId;
                $('#Grid').append(`
                <div data-category="${Cat}" class="card-item youtube-card-item" style="border-left-color: #${BKcol}">
                    <a href="https://www.youtube.com/embed/${vid}" data-load-type="iframe">
                       <img class="YTi" src="${thumb}" alt="${title}" ><h3>${title}</h3><p>${desc}</p>
                    </a>
                </div>`);
            });
            handleCardView($('#content-area'), initialLoadOverride);
            populateSmartKeywords('#Grid', '#youtube-keyword-filter');
            populateCategoryFilter('#Grid', '#youtube-category-filter');
        }
    });
}

function buildResearchModal(jsonUrl) {
    const $modalContent = $('#modal-content-area');
    const researchHtml = `
        <div class="research-modal-header">
            <h2 id="research-title-modal">Loading Research...</h2>
            <div class="modal-nav-right">
                <a href="#" class="open-new-window" target="_blank" rel="noopener noreferrer">Open in new window &nearr;</a>
                <button class="modal-close-btn" title="Close (Esc)">&times; Close</button>
            </div>
        </div>
        <div class="tab-nav" id="research-tab-nav-modal"></div>
        <div class="tab-content" id="research-tab-content-modal"><div class="content-loader"><div class="spinner"></div></div></div>
    `;
    $modalContent.html(researchHtml);

    $.getJSON(jsonUrl, function (data) {
        $('#research-title-modal').text(decodeText(data.title));
        $modalContent.find('.open-new-window').attr('href', jsonUrl);
        const $tabNav = $('#research-tab-nav-modal');
        $tabNav.empty(); 
        $.each(data.tickers, function(index, ticker) {
            const $button = $(`<button class="tab-button"></button>`);
            $button.text(ticker.name);
            $button.attr('data-content-url', ticker.contentUrl);
            if (index === 0) { $button.addClass('active'); loadModalTabContent(ticker.contentUrl, '#research-tab-content-modal'); }
            $tabNav.append($button);
        });
        
        // Attach close handler to the button we just created inside the modal content
        $modalContent.find('.modal-close-btn').on('click', function() { 
             // Trigger the main close logic by finding the button in the main header (even if hidden) or calling the function directly
             // But since main header might be hidden, let's just trigger the same logic:
             $('.modal-close-btn').first().click(); 
        });
    });
}

function loadModalTabContent(htmlUrl, targetId) {
    const $target = $(targetId);
    $target.html(''); 
    $target.closest('#modal-content-area').find('.research-modal-header .open-new-window').attr('href', htmlUrl);
    $target.html(`<div class="iframe-wrapper"><iframe src="${htmlUrl}" class="loaded-iframe"></iframe></div>`);
}

/* === LOAD MODAL CONTENT === */

function loadModalContent(index) {
    if (index < 0 || index >= currentCardList.length) {
        return;
    }

    const $link = currentCardList[index];
    if (!$link.length) return;
    
    currentCardIndex = index;
    
    const $modal = $('#content-modal');
    const $modalContent = $('#modal-content-area');
    const $modalOpenLink = $modal.find('.open-new-window');
    const $modalInfoBtn = $modal.find('.modal-info-btn');

    $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>');
    
    const loadUrl = $link.attr('href');
    let loadType = $link.data('load-type');
    const jsonUrl = $link.data('json-url');
    const manifestUrl = $link.data('manifest-url'); // For Tutorials
    
    // 1. Research Logic
    if (loadType === 'research' && jsonUrl) {
        $modal.addClass('research-mode'); 
        $modalOpenLink.attr('href', jsonUrl); 
        buildResearchModal(jsonUrl); 
        return; 
    } 
    
    // 2. Tutorial Logic
    if (loadType === 'tutorial' && manifestUrl) {
        $modal.addClass('tutorial-mode'); 
        $modal.removeClass('research-mode');
        $modal.find('.modal-header').hide();
        
        $modalOpenLink.attr('href', manifestUrl);
        
        const playerHtml = `
            <div class="iframe-wrapper" style="height: 100%; width: 100%;">
                <iframe src="tutorial_player.html?manifest=${encodeURIComponent(manifestUrl)}" class="loaded-iframe" style="border: none; width: 100%; height: 100%;"></iframe>
            </div>
            <button class="modal-close-btn" style="position: absolute; top: 10px; right: 10px; z-index: 2000; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 20px;">&times;</button>
        `;
        $modalContent.html(playerHtml);
        
        $modalContent.find('.modal-close-btn').on('click', function() {
            $('.modal-close-btn').first().click();
        });
        
        return;
    }

    // 3. Regular Logic
    $modal.removeClass('research-mode'); 
    $modal.removeClass('tutorial-mode'); 
    $modal.find('.modal-header').show();
    
    $modalOpenLink.attr('href', loadUrl);
    $modalContent.find('.modal-photo-info').remove();
    $modalInfoBtn.hide(); 
    
    if (!loadType) {
        if (loadUrl.startsWith('http')) {
            if (loadUrl.includes('github.com') || loadUrl.includes('google.com')) {
                loadType = 'blocked'; 
            } else {
                loadType = 'iframe';
            }
        } else if (/\.(jpg|jpeg|png|gif)$/i.test(loadUrl)) {
            loadType = 'image';
        } else if (loadUrl.endsWith('.html')) {
            loadType = 'html';
        } else {
            loadType = 'newtab'; 
        }
    }
    
    const $card = $link.closest('.card-item');
    const title = $card.find('h3').text() || $card.find('img').attr('alt');
    const desc = $card.find('p').text();
    let infoHtml = '';

    if (title) {
        const infoVisibleClass = isModalInfoVisible ? 'info-visible' : '';
        infoHtml = `
            <div class="modal-photo-info ${infoVisibleClass}">
                <h3>${title}</h3>
                <p>${desc}</p>
            </div>`;
    }

    switch (loadType) {
        case 'html':
            $.ajax({
                url: loadUrl, type: 'GET',
                success: function(data) { 
                    $modalContent.html(data); 
                    if (infoHtml) {
                        $modalContent.append(infoHtml);
                        $modalInfoBtn.show();
                    }
                },
                error: function() { $modalContent.html('<div class="error-message">Could not load content.</div>'); }
            });
            break;
        case 'image':
            $modalContent.html(`
                <div class="image-wrapper">
                    <img src="${loadUrl}" class="loaded-image" alt="Loaded content">
                    ${infoHtml}
                </div>`);
            if (infoHtml) { $modalInfoBtn.show(); }
            break;
        case 'iframe':
            $modalContent.html(`
                <div class="iframe-wrapper">
                    <iframe src="${loadUrl}" class="loaded-iframe"></iframe>
                    ${infoHtml}
                </div>`);
            if (infoHtml) { $modalInfoBtn.show(); }
            break;
        case 'blocked':
            $modalContent.html('<div class="error-message">This site (e.g., GitHub) blocks being loaded here.Please use the "Open in new window" button.</div>');
            break;
        default: 
            $modalContent.html('<div class="error-message">This link cannot be opened here. Please use the "Open in new window" button.</div>');
            break;
    }
    
    $('.modal-prev-btn').prop('disabled', index <= 0);
    $('.modal-next-btn').prop('disabled', index >= currentCardList.length - 1);
}

function filterYouTubeCards() {
    const searchTerm = decodeText($('#youtube-search-box').val().toLowerCase());
    const selectedKeyword = $('#youtube-keyword-filter').val();
    
    const $grid = $('#Grid');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#youtube-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardText = getCardSearchableText($card); 
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword);
            if (searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), parseInt($('.nav-link[data-page*="youtube_page.html"]').data('initial-load')) || 10);
    }
}
