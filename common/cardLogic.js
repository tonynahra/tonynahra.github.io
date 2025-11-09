/* === GLOBAL VARIABLES === */
var currentCardList = []; // Stores the list of cards for modal navigation
var currentCardIndex = 0; // Stores the current position in the modal

// --- List of common words to ignore ---
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 
    'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 
    'were', 'will', 'with', 'part', 'op', 'web', 'at', 'al', 'com', 'org', 'www',
    'https', 'http', 'pdf', 'html', 'sheet', 'cheat', 'for', 'github', 'master',
    'file', 'files', 'user', 'users', 'server', 'servers', 'link', 'more', 'read',
    'view', 'full', 'size', 'click', 'introductory', 'introduction', 'advanced',
    'comprehensive', 'dummies', 'glance', 'handout', 'part 1', 'v1',
    'photo', 'usa', 'new', 'york', 'amazing', 'island'
]);

// --- NEW: Keyword Dictionaries ---
const REPLACEMENT_MAP = {
    'javascript': 'js',
    'artificial': 'ai',
    'intelligence': 'ai',
    'llms': 'llm',
    'python': 'python',
    'statistics': 'stats',
    'statistical': 'stats',
    'powerbi': 'bi',
    'power': 'bi',
    'analysis': 'data',
    'analytics': 'data'
};
const SYNONYM_MAP = {
    'js': ['javascript'],
    'ai': ['artificial', 'intelligence'],
    'llm': ['llms'],
    'stats': ['statistics', 'statistical'],
    'bi': ['powerbi', 'power'],
    'data': ['analysis', 'analytics']
};
// --- END NEW ---


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
                <div id="modal-content-area">
                    <!-- Content (iframe, image, html, research tabs) will be loaded here -->
                </div>
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
        $(document).off('keydown.modalNav');
    });
    
    // Listener for Modal backdrop click
    $('body').on('click', '#content-modal', function(e) {
        if (e.target.id === 'content-modal') {
            $(this).find('.modal-close-btn').click();
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
        $('#modal-content-area').find('.modal-photo-info').toggleClass('info-visible');
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

    // --- Research Tab listener ---
    $('#content-modal').on('click', '.tab-button', function() {
        $(this).siblings().removeClass('active');
        $(this).addClass('active');
        
        const htmlUrl = $(this).data('content-url');
        loadModalTabContent(htmlUrl, '#research-tab-content-modal');
    });

});


/* === CARD VIEW (Show More) LOGIC === */
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


/* === YOUTUBE PLAYLIST CORE FUNCTIONS === */
var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'; // Your API Key
var URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

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
            </a>
        </div>
        `);
    });
}

/* === PHOTO ALBUM LOGIC === */
function loadPhotoAlbum(jsonUrl, initialLoadOverride) {
    const $albumList = $('#photo-album-list');
    
    $.getJSON(jsonUrl, function (albumData) {
        $('#album-title').text(decodeText(albumData.albumTitle));
        $albumList.empty(); 
        
        const categories = new Set();

        $.each(albumData.photos, function(index, photo) {
            const title = decodeText(photo.title);
            const category = decodeText(photo.category);
            const description = decodeText(photo.description);
            
            categories.add(category);

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
        
        populateAlbumCategories(categories);
        populateSmartKeywords('#photo-album-list', '#album-keyword-filter');
        handleCardView($('#content-area'), initialLoadOverride);

    }).fail(function(jqXHR, textStatus, errorThrown) {
        $('#album-title').text("Error Loading Album");
        $albumList.html(`<p class="error-message">Could not load album data from ${jsonUrl}. Error: ${textStatus}</p>`);
        console.error("Photo Album AJAX failed:", textStatus, errorThrown);
    });
}

function populateAlbumCategories(categories) {
    const $filter = $('#album-category-filter');
    if (!$filter.length) return;
    const sortedCategories = Array.from(categories).sort();
    sortedCategories.forEach(key => {
        $filter.append($('<option>', {
            value: key,
            text: key
        }));
    });
}

/* === --- RESEARCH TAB LOGIC --- === */

/**
 * Builds the tabbed interface inside the modal.
 */
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

/**
 * Fetches an HTML fragment and loads it into the *modal's* tab container.
 */
function loadModalTabContent(htmlUrl, targetId) {
    const $target = $(targetId);
    $target.html('<div class="content-loader"><div class="spinner"></div></div>'); 
    
    $.ajax({
        url: htmlUrl,
        type: 'GET',
        success: function(data) {
            $target.html(data);
        },
        error: function() {
            $target.html('<div class="error-message">Could not load content.</div>');
        }
    });
}


/* === --- SMART KEYWORD LOGIC --- === */
function populateSmartKeywords(listId, filterId) {
    const $filter = $(filterId);
    if (!$filter.length) return; 

    const wordCounts = {};
    
    try {
        $(`${listId} .card-item`).each(function() {
            const $card = $(this);
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
                
                // --- THIS IS THE FIX ---
                // Apply replacements
                if (REPLACEMENT_MAP[cleanWord]) {
                    cleanWord = REPLACEMENT_MAP[cleanWord];
                }
                
                // Check length *after* replacement
                if (cleanWord.length > 2 && cleanWord.length <= 15 && !STOP_WORDS.has(cleanWord) && isNaN(cleanWord)) {
                    wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
                }
                // --- END FIX ---
            });
        });

        const sortedKeywords = Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 30)
            .map(([word]) => word);

        $filter.children('option:not(:first)').remove();
        
        sortedKeywords.forEach(key => {
            // --- THIS IS THE FIX ---
            // Truncate display text to 8 chars, but use full word as value
            const displayText = key.length > 8 ? key.substring(0, 8) + '...' : key;
            // --- END FIX ---
            
            $filter.append($('<option>', {
                value: key,
                text: displayText
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


/* === --- MODAL NAVIGATION HELPER --- === */
function handleModalKeys(e) {
    if (!$('#content-modal').is(':visible')) {
        $(document).off('keydown.modalNav');
        return;
    }
    
    // Don't interfere if user is typing
    if ($(e.target).is('input, textarea, select')) {
        return;
    }

    switch (e.key) {
        case "Escape":
            $('.modal-close-btn').click();
            break;
        case "ArrowLeft":
            $('.modal-prev-btn').click();
            break;
        case "ArrowRight":
            $('.modal-next-btn').click();
            break;
        case " ": // Spacebar
            e.preventDefault(); 
            $('.modal-next-btn').click();
            break;
        case "i":
            e.preventDefault(); 
            $('.modal-info-btn').click();
            break;
    }
}

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
    
    if (loadType === 'research' && jsonUrl) {
        $modal.addClass('research-mode'); 
        $modalOpenLink.attr('href', jsonUrl); 
        buildResearchModal(jsonUrl); 
        return; 
    } 
    
    $modal.removeClass('research-mode'); 
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

    const customHeight = $link.data('height') || '85vh';
    
    const $card = $link.closest('.card-item');
    const title = $card.find('h3').text() || $card.find('img').attr('alt');
    const desc = $card.find('p').text();
    let infoHtml = '';

    if (title) {
        infoHtml = `
            <div class="modal-photo-info">
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
                    <iframe src="${loadUrl}" class="loaded-iframe" style="height: ${customHeight};"></iframe>
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


/* === --- FILTERING LOGIC --- === */
function checkKeywordMatch(cardText, selectedKeyword) {
    if (selectedKeyword === "all") return true;
    const keywordsToMatch = [selectedKeyword, ...(SYNONYM_MAP[selectedKeyword] || [])];
    return keywordsToMatch.some(key => cardText.includes(key));
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
V
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
