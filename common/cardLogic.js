/* === GLOBAL VARIABLES === */
var currentCardList = []; // Stores the list of cards for modal navigation
var currentCardIndex = 0; // Stores the current position in the modal
var isModalInfoVisible = false; // Stores the state of the info toggle

// --- KEYWORD CONFIGURATION ---
// (If you moved these to filterConfig.js, ensure that file is loaded first in index.html)
// For safety, I'll check if they exist, otherwise define defaults here.
if (typeof STOP_WORDS === 'undefined') {
    var STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but']);
}
if (typeof REPLACEMENT_MAP === 'undefined') {
    var REPLACEMENT_MAP = {};
}
if (typeof SYNONYM_MAP === 'undefined') {
    var SYNONYM_MAP = {};
}


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
                
                if (cleanWord.length > 2 && cleanWord.length <= 15 && !STOP_WORDS.has(cleanWord) && isNaN(cleanWord)) {
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
    return decodeText(textSources
        .map(text => String(text || '')) 
        .join(' ')
        .toLowerCase());
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

/* === --- LOAD FUNCTIONS --- === */

function loadModalContent(index) {
    if (index < 0 || index >= currentCardList.length) { return; }

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
    const manifestUrl = $link.data('manifest-url');
    
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
            const $mainCloseBtn = $('#content-modal > .modal-content > .modal-header .modal-close-btn');
            $('#content-modal').removeClass('modal-open').fadeOut(200);
            $('#modal-content-area').html('');
            currentCardList = [];
            $(document).off('keydown.modalNav');
            $('#content-modal .modal-header').show();
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
        default: // newtab
            $modalContent.html('<div class="error-message">This link cannot be opened here. Please use the "Open in new window" button.</div>');
            break;
    }
    
    $('.modal-prev-btn').prop('disabled', index <= 0);
    $('.modal-next-btn').prop('disabled', index >= currentCardList.length - 1);
}

function buildResearchModal(jsonUrl) {
    const $modalContent = $('#modal-content-area');
    
    const researchHtml = `
        <div class="research-modal-header">
            <h2 id="research-title-modal">Loading Research...</h2>
            <div class="modal-nav-right">
                <a href="#" class="open-new-window" target="_blank" rel="noopener noreferrer">
                    Open in new window &nearr;
                </a>
                <button class="modal-close-btn" title="Close (Esc)">&times; Close</button>
            </div>
        </div>
        <div class="tab-nav" id="research-tab-nav-modal"></div>
        <div class="tab-content" id="research-tab-content-modal">
            <div class="content-loader"><div class="spinner"></div></div>
        </div>
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
            
            if (index === 0) {
                $button.addClass('active');
                loadModalTabContent(ticker.contentUrl, '#research-tab-content-modal');
            }
            $tabNav.append($button);
        });

    }).fail(function(jqXHR, textStatus, errorThrown) {
        $('#research-title-modal').text("Error Loading Research");
        $('#research-tab-content-modal').html(`<p class="error-message">Could not load research data from ${jsonUrl}. Error: ${textStatus}</p>`);
    });
}

function loadModalTabContent(htmlUrl, targetId) {
    const $target = $(targetId);
    $target.html(''); 
    
    $target.closest('#modal-content-area')
           .find('.research-modal-header .open-new-window')
           .attr('href', htmlUrl);

    const iframeHtml = `
        <div class="iframe-wrapper" style="height: 100%;">
            <iframe src="${htmlUrl}" class="loaded-iframe"></iframe>
        </div>
    `;
    $target.html(iframeHtml);
}

function loadVids(PL, Category, BKcol, initialLoadOverride) {
    $('#Grid').empty(); 
    var options = { part: 'snippet', key: key, maxResults: 50, playlistId: PL };

    $.getJSON(URL, options, function (data) {
        $('#playlist-title').text(`Youtubelist: ${Category.replace(/_/g, ' ')}`);
        $('#playlist-description').text(`The latest videos from the ${Category.replace(/_/g, ' ')} playlist.`);

        if (data.error) {
             $('#Grid').html(`<p class="error-message">API Key/Access Error: ${data.error.message}.</p>`);
             return; 
        }
        if (!data.items || data.items.length === 0) {
             $('#Grid').html(`<p class="error-message">Playlist is valid but contains no public videos.</p>`);
             return;
        }

        resultsLoop(data, Category, BKcol);
        handleCardView($('#content-area'), initialLoadOverride);
        populateSmartKeywords('#Grid', '#youtube-keyword-filter');
        populateCategoryFilter('#Grid', '#youtube-category-filter');

    }).fail(function(jqXHR, textStatus, errorThrown) {
        $('#Grid').html(`<p class="error-message">API Error (Hard): ${jqXHR.status} - ${errorThrown}.</p>`);
    });
}
    
function resultsLoop(data, Cat, BKcol) {
    $.each(data.items, function (i, item) {
        if (!item.snippet.resourceId || !item.snippet.resourceId.videoId) {
            console.warn("Skipping playlist item, missing resourceId:", item);
            return; // skip this item
        }
        
        let thumb = 'https://placehold.co/320x180/2c3e50/66fcf1?text=Video';
        if (item.snippet.thumbnails) { 
            if (item.snippet.thumbnails.medium && item.snippet.thumbnails.medium.url) {
                thumb = item.snippet.thumbnails.medium.url;
            } else if (item.snippet.thumbnails.default && item.snippet.thumbnails.default.url) {
                thumb = item.snippet.thumbnails.default.url;
            }
        }
        
        const title = decodeText(item.snippet.title);
        const desc = item.snippet.description ? decodeText(item.snippet.description.substring(0, 100) + '...') : 'No description available.';
        const vid = item.snippet.resourceId.videoId;

        $('#Grid').append(`
        <div data-category="${Cat}" class="card-item youtube-card-item" style="border-left-color: #${BKcol}">
            <a href="https://www.youtube.com/embed/${vid}" data-load-type="iframe">
               <img class="YTi" src="${thumb}" alt="${title}" >
               <h3>${title}</h3>
               <p>${desc}</p>
               <span class="card-category" style="display: none;">${Cat}</span>
            </a>
        </div>
        `);
    });
}

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
                <div class="card-item" 
                     data-category="${category}" 
                     data-keywords="${title},${description}">
                    
                    <a href="${photo.url}" data-load-type="image">
                        <img src="${photo.thumbnailUrl}" loading="lazy" class="card-image" alt="${title}">
                        
                        <div class="photo-details">
                            <h3>${title}</h3>
                            <p>${description}</p>
                        </div>
                    </a>
                </div>
            `;
            $albumList.append(cardHtml);
        });
        
        populateCategoryFilter('#photo-album-list', '#album-category-filter');
        populateSmartKeywords('#photo-album-list', '#album-keyword-filter');
        handleCardView($('#content-area'), initialLoadOverride);

    }).fail(function(jqXHR, textStatus, errorThrown) {
        $('#album-title').text("Error Loading Album");
        $albumList.html(`<p class="error-message">Could not load album data from ${jsonUrl}. Error: ${textStatus}</p>`);
        console.error("Photo Album AJAX failed:", textStatus, errorThrown);
    });
}


/* === --- FILTERING FUNCTIONS (Defined Globally) --- === */
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

function filterPostCards() {
    const searchTerm = decodeText($('#post-search-box').val().toLowerCase());
    const selectedCategory = $('#post-category-filter').val();
    const selectedKeyword = $('#post-keyword-filter').val();
    
    const $grid = $('#posts-card-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#posts-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategory = $card.data('category'); 
            const cardText = getCardSearchableText($card); 
            const categoryMatch = (selectedCategory === "all" || cardCategory === selectedCategory);
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword);

            if (categoryMatch && searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), parseInt($('.nav-link[data-page="posts.html"]').data('initial-load')) || 10);
    }
}

function filterCertCards() {
    const searchTerm = decodeText($('#cert-search-box').val().toLowerCase());
    const selectedCategory = $('#cert-category-filter').val();
    const selectedKeyword = $('#cert-keyword-filter').val();
    
    const $grid = $('#cert-card-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#cert-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategories = $card.data('category') || ''; 
            const cardText = getCardSearchableText($card); 
            const categoryMatch = (selectedCategory === "all" || cardCategories.includes(selectedCategory));
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword); 
            if (categoryMatch && searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), parseInt($('.nav-link[data-page="certificates.html"]').data('initial-load')) || 10);
    }
}

function filterAlbumCards() {
    const searchTerm = decodeText($('#album-search-box').val().toLowerCase());
    const selectedCategory = $('#album-category-filter').val();
    const selectedKeyword = $('#album-keyword-filter').val();
    
    const $grid = $('#photo-album-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#album-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategory = $card.data('category'); 
            const cardText = getCardSearchableText($card); 
            const categoryMatch = (selectedCategory === "all" || cardCategory === selectedCategory);
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword);
            if (categoryMatch && searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), parseInt($('.nav-link[data-page*="album.html"]').data('initial-load')) || 10);
    }
}

function filterResearchCards() {
    const searchTerm = decodeText($('#research-search-box').val().toLowerCase());
    const selectedCategory = $('#research-category-filter').val();
    const selectedKeyword = $('#research-keyword-filter').val();
    
    const $grid = $('#research-card-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#research-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategory = $card.data('category'); 
            const cardText = getCardSearchableText($card); 
            const categoryMatch = (selectedCategory === "all" || cardCategory === selectedCategory);
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword);
            if (categoryMatch && searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), parseInt($('.nav-link[data-page="research.html"]').data('initial-load')) || 10);
    }
}

function filterTutorialCards() {
    const searchTerm = decodeText($('#tutorials-search-box').val().toLowerCase());
    const selectedCategory = $('#tutorials-category-filter').val();
    const selectedKeyword = $('#tutorials-keyword-filter').val();
    const $grid = $('#tutorials-card-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#tutorials-no-results');
    let visibleCount = 0;
    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategory = $card.data('category'); 
            const cardText = getCardSearchableText($card); 
            const categoryMatch = (selectedCategory === "all" || cardCategory === selectedCategory);
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword);
            if (categoryMatch && searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), parseInt($('.nav-link[data-page*="tutorials.html"]').data('initial-load')) || 10);
    }
}


/* === --- EVENT LISTENERS (DELEGATED) --- === */
$(document).ready(function () {
    
    // --- Inject the modal HTML on page load ---
    $('body').append(`
        <div id="content-modal" class="modal-backdrop">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-nav-left">
                        <button class="modal-prev-btn" title="Previous (Left Arrow)">&larr; Prev</button>
                        <button class="modal-next-btn" title="Next (Right Arrow/Spacebar)">Next &rarr;</button>
                        <button class="modal-info-btn" title="Toggle Info (I)">Info</button>
                    </div>
                    <div class="modal-nav-right">
                        <a href="#" class="open-new-window" target="_blank" rel="noopener noreferrer">
                            Open in new window &nearr;
                        </a>
                        <button class="modal-close-btn" title="Close (Esc)">&times; Close</button>
                    </div>
                </div>
                <div id="modal-content-area"></div>
            </div>
        </div>
    `);

    // Listener for "Show More" (Cards)
    $('body').on('click', '.toggle-card-button', function() {
        const $button = $(this);
        const $list = $button.prev('.card-list');
        if ($list.length) {
            showMoreCards($button, $list);
        }
    });

    // Listener for ALL CARDS (opens modal)
    $('body').on('click', '.card-item, .item', function(e) {
        const $clickedCard = $(this);
        const $link = $clickedCard.find('a').first();
        if (!$link.length) { return; } 
        
        const $clickedLink = $(e.target).closest('a');
        if ($clickedLink.length > 0 && !$clickedLink.is($link)) {
            return;
        }
        
        e.preventDefault(); 
        e.stopPropagation(); 
        
        const $cardList = $clickedCard.closest('.card-list');
        const $allVisibleCards = $cardList.children('.card-item:visible, .item:visible');
        
        currentCardList = [];
        $allVisibleCards.each(function() {
            currentCardList.push($(this).find('a').first());
        });
        
        currentCardIndex = $allVisibleCards.index($clickedCard);
        
        if (currentCardList.length > 0) {
            loadModalContent(currentCardIndex);
            
            $('body').addClass('modal-open');
            $('#content-modal').fadeIn(200);
            
            $(document).on('keydown.modalNav', handleModalKeys);
        }
    });

    // Listener for Modal "Close" button
    $('body').on('click', '.modal-close-btn', function() {
        const $modal = $('#content-modal');
        const $modalContent = $('#modal-content-area');
        
        $('body').removeClass('modal-open');
        $modal.fadeOut(200);
        
        $modalContent.html(''); 
        
        currentCardList = [];
        currentCardIndex = 0;
        isModalInfoVisible = false; 
        $(document).off('keydown.modalNav');
    });
    
    // Listener for Modal backdrop click
    $('body').on('click', '#content-modal', function(e) {
        if (e.target.id === 'content-modal') {
            $(this).find('.modal-close-btn').first().click();
        }
    });
    
    // Listeners for Modal Prev/Next/Info buttons
    $('body').on('click', '.modal-prev-btn', function() {
        if (currentCardIndex > 0) {
            loadModalContent(currentCardIndex - 1);
        }
    });
    
    $('body').on('click', '.modal-next-btn', function() {
        if (currentCardIndex < currentCardList.length - 1) {
            loadModalContent(currentCardIndex + 1);
        }
    });

    $('body').on('click', '.modal-info-btn', function() {
        isModalInfoVisible = !isModalInfoVisible; // Toggle state
        $('#modal-content-area').find('.modal-photo-info').toggleClass('info-visible', isModalInfoVisible);
    });

    // --- All filter listeners ---
    $('body').on('input', '#youtube-search-box', filterYouTubeCards);
    $('body').on('change', '#youtube-keyword-filter', filterYouTubeCards);
    $('body').on('input', '#post-search-box', filterPostCards);
    $('body').on('change', '#post-category-filter', filterPostCards);
    $('body').on('change', '#post-keyword-filter', filterPostCards);
    $('body').on('input', '#cert-search-box', filterCertCards);
    $('body').on('change', '#cert-category-filter', filterCertCards);
    $('body').on('change', '#cert-keyword-filter', filterCertCards);
    $('body').on('input', '#album-search-box', filterAlbumCards);
    $('body').on('change', '#album-category-filter', filterAlbumCards);
    $('body').on('change', '#album-keyword-filter', filterAlbumCards);
    
    $('body').on('input', '#research-search-box', filterResearchCards);
    $('body').on('change', '#research-category-filter', filterResearchCards);
    $('body').on('change', '#research-keyword-filter', filterResearchCards);
    
    $('body').on('input', '#tutorials-search-box', filterTutorialCards);
    $('body').on('change', '#tutorials-category-filter', filterTutorialCards);
    $('body').on('change', '#tutorials-keyword-filter', filterTutorialCards);

    // --- Research Tab listener ---
    $('#content-modal').on('click', '.tab-button', function() {
        $(this).siblings().removeClass('active');
        $(this).addClass('active');
        
        const htmlUrl = $(this).data('content-url');
        loadModalTabContent(htmlUrl, '#research-tab-content-modal');
    });

});
