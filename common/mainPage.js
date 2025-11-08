var lastContentPage = 'tech-posts.html'; 

$(document).ready(function () {
    
    initializeCollapsibleSections();
    
    $('.expand-button').on('click', function() {
        toggleCollapsibleSection($(this));
    });
    
    // --- EVENT LISTENERS (DELEGATED) ---

    // Listener for LEFT MENU
    $('body').on('click', '.nav-link', function(e) {
        e.preventDefault();
        
        if ($(this).closest('.profile-summary').length) {
            $('.nav-link').removeClass('active-nav');
            $(this).addClass('active-nav');
        }
        
        const pageUrl = $(this).data('page');
        
        if (pageUrl && pageUrl.includes('.html') && !pageUrl.includes('guide.html') && !pageUrl.includes('about.html')) {
            lastContentPage = pageUrl; 
        }
        loadContent(pageUrl);
    });

    // Listener for ALL CARDS
    $('body').on('click', '.card-item, .item', function(e) {
        const $link = $(this).find('a').first(); 
        if (!$link.length) { return; } 
        if (e.target.tagName === 'A' || $(e.target).closest('a').length) {
            return;
        }
        e.preventDefault(); 
        e.stopPropagation(); 
        
        const loadUrl = $link.attr('href');
        const $contentArea = $('#content-area');

        const $cardPage = $contentArea.find('.card-list-page').first();
        if ($cardPage.length) {
            $cardPage.hide();
        } else {
            console.warn("Could not find .card-list-page to hide.");
        }

        const backButtonHtml = `
            <div class="back-button-wrapper">
                <button class="js-back-to-list">
                    &larr; Back
                </button>
                <a href="${loadUrl}" class="open-new-window" target="_blank" rel="noopener noreferrer">
                    Open in new window &nearr;
                </a>
            </div>
        `;
        const $contentWrapper = $('<div class="loaded-content-wrapper"></div>');
        $contentWrapper.html(backButtonHtml); 

        let loadType = $link.data('load-type');
        if (!loadType) {
            if (loadUrl.startsWith('http')) { loadType = 'iframe'; }
            else if (/\.(jpg|jpeg|png|gif)$/i.test(loadUrl)) { loadType = 'image'; }
            else { loadType = 'html'; }
        }
        const customHeight = $link.data('height') || '85vh';

        switch (loadType) {
            case 'html':
                $.ajax({
                    url: loadUrl, type: 'GET',
                    success: function(data) { $contentWrapper.append(data); },
                    error: function() { $contentWrapper.append('<div class="error-message">Could not load content.</div>'); },
                    complete: function() { $contentArea.append($contentWrapper); }
                });
                break;
            case 'image':
                $contentWrapper.append(`<div class="image-wrapper"><img src="${loadUrl}" class="loaded-image" alt="Loaded content"></div>`);
                $contentArea.append($contentWrapper);
                break;
            case 'iframe':
                $contentWrapper.append(`<iframe src="${loadUrl}" class="loaded-iframe" style="height: ${customHeight};"></iframe>`);
                $contentArea.append($contentWrapper);
                break;
            default:
                window.open(loadUrl, '_blank');
        }
    });

    // Listener for the "Back" button
    $('body').on('click', '.js-back-to-list', function() {
        const $contentArea = $('#content-area');
        $contentArea.find('.loaded-content-wrapper').remove();
        $contentArea.find('.card-list-page').first().show();
    });

    // --- UPDATED: All filter listeners ---
    $('body').on('input', '#youtube-search-box', filterYouTubeCards);
    $('body').on('change', '#youtube-keyword-filter', filterYouTubeCards);

    $('body').on('input', '#post-search-box', filterPostCards);
    $('body').on('change', '#post-category-filter', filterPostCards);
    $('body').on('change', '#post-keyword-filter', filterPostCards);
    
    $('body').on('input', '#cert-search-box', filterCertCards);
    $('body').on('change', '#cert-category-filter', filterCertCards);
    $('body').on('change', '#cert-keyword-filter', filterCertCards);
    // --- END UPDATED FILTERS ---
    
    // Theme Switcher Logic
    function applyTheme(theme) {
        $('body').removeClass('theme-light theme-pastel');
        if (theme !== 'theme-dark') { $('body').addClass(theme); }
        localStorage.setItem('theme', theme);
        $('.theme-dot').removeClass('active');
        $(`.theme-dot[data-theme="${theme}"]`).addClass('active');
    }
    $('body').on('click', '.theme-dot', function() {
        applyTheme($(this).data('theme'));
    });
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) { applyTheme(savedTheme); }
    else { $('.theme-dot[data-theme="theme-dark"]').addClass('active'); }

    // Load initial content
    const initialPage = $('.nav-link.active-nav').data('page');
    if (initialPage) {
        lastContentPage = initialPage;
        loadContent(initialPage);
    }
});


/* === COLLAPSIBLE MENU LOGIC === */
function initializeCollapsibleSections() {
    $('.expand-button').each(function() {
        const $button = $(this);
        const targetId = $button.data('target');
        const $target = $('#' + targetId);
        const maxItems = parseInt($button.data('max') || 3);
        let $items = [];
        if ($target.hasClass('collapsible-content') && $target.find('a').length) {
            $items = $target.find('a'); 
        }
        if ($items.length > maxItems) {
            $items.slice(maxItems).addClass('hidden-item');
            const hiddenCount = $items.length - maxItems;
            $button.text(`Show More (${hiddenCount}) \u25BC`).removeClass('expanded').show();
        } else {
            $button.hide(); 
        }
    });
}
function toggleCollapsibleSection($button) {
    const targetId = $button.data('target');
    const $target = $('#' + targetId);
    const isExpanded = $button.hasClass('expanded');
    const maxItems = parseInt($button.data('max') || 3);
    let $items = [];
    if ($target.find('a').length) { $items = $target.find('a'); }
    const hiddenCount = $items.length - maxItems;
    if (!isExpanded) {
        $items.slice(maxItems).removeClass('hidden-item');
        $button.text(`Show Less \u25B2`);
    } else {
        $items.slice(maxItems).addClass('hidden-item');
        $button.text(`Show More (${hiddenCount}) \u25BC`);
    }
    $target.toggleClass('expanded', !isExpanded);
    $button.toggleClass('expanded', !isExpanded);
}


/* === DYNAMIC CONTENT LOADING IMPLEMENTATION === */
function loadContent(pageUrl) {
    const $contentArea = $('#content-area');
    $contentArea.empty();
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading Content...</p></div>');

    $.ajax({
        url: pageUrl,
        type: 'GET',
        success: function(data) {
            $contentArea.html(data); 

            const isYouTubePage = pageUrl.includes('youtube_page.html');
            const isPostsPage = pageUrl.includes('posts.html'); 
            const isCertsPage = pageUrl.includes('certificates.html');
            
            if (isYouTubePage) {
                const paramString = pageUrl.substring(pageUrl.indexOf('?') + 1);
                const params = paramString.split(',');
                if (params.length === 3 && typeof loadVids === 'function') {
                    loadVids(params[0], params[1], params[2]);
                } else {
                    $contentArea.html('<div class="error-message">YouTube parameter error.</div>');
                }
            } else if (isPostsPage) {
                handleCardView($contentArea);
                // Auto-populate keywords from data-keywords attribute
                populateKeywordFilter('#posts-card-list', '#post-keyword-filter', 'data-keywords');
            } else if (isCertsPage) { 
                handleCardView($contentArea);
                // Auto-populate keywords from data-category attribute
                populateKeywordFilter('#cert-card-list', '#cert-keyword-filter', 'data-category');
            }
            
            if (typeof initializeImageModal === 'function') {
                initializeImageModal(); 
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $contentArea.html(`<div class="error-message">Could not load content from ${pageUrl}. Status: ${textStatus} (${errorThrown})</div>`);
        }
    });
}

/* === CARD VIEW (Show More) LOGIC === */
function handleCardView($scope) {
    $scope.find('.card-list').each(function() {
        const $list = $(this);
        const $items = $list.children('.card-item');
        const totalItems = $items.length;
        const initialLimit = 10;
        const increment = 10;
        
        $list.next('.toggle-card-button').remove(); 
        
        if (totalItems > initialLimit) {
            $items.slice(initialLimit).addClass('hidden-card-item');
            const remaining = totalItems - initialLimit;
            const $button = $(`<button class="toggle-card-button">Show More (${remaining} more) \u25BC</button>`);
            
            $button.data({'visible-count': initialLimit, 'increment': increment, 'total-items': totalItems});
            $button.on('click', function() { showMoreCards($(this), $list); });
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

function loadVids(PL, Category, BKcol) {
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
        handleCardView($('#content-area'));
        // Auto-populate keywords from YouTube tags
        populateKeywordFilter('#Grid', '#youtube-keyword-filter', 'data-keywords');

    }).fail(function(jqXHR, textStatus, errorThrown) {
        $('#Grid').html(`<p class="error-message">API Error (Hard): ${jqXHR.status} - ${errorThrown}.</p>`);
    });
}
    
function resultsLoop(data, Cat, BKcol) {
    $.each(data.items, function (i, item) {
        if (!item.snippet.resourceId || !item.snippet.resourceId.videoId) return;
        
        const thumb = item.snippet.thumbnails.medium.url;
        const title = item.snippet.title;
        const desc = item.snippet.description ? item.snippet.description.substring(0, 100) + '...' : 'No description available.';
        const vid = item.snippet.resourceId.videoId;
        // --- NEW: Get tags ---
        const tags = (item.snippet.tags || []).join(',');

        $('#Grid').append(`
        <div data-category="${Cat}" data-keywords="${tags}" class="card-item youtube-card-item" style="border-left-color: #${BKcol}">
            <a href="https://www.youtube.com/embed/${vid}" data-load-type="iframe">
               <img class="YTi" src="${thumb}" alt="${title}" >
               <h3>${title}</h3>
               <p>${desc}</p>
            </a>
        </div>
        `);
    });
}

/* === NEW: KEYWORD FILTERING LOGIC === */

/**
 * Auto-populates a <select> dropdown by reading data attributes from cards.
 * @param {string} listId - The ID of the card list (e.g., "#posts-card-list").
 * @param {string} filterId - The ID of the <select> dropdown (e.g., "#post-keyword-filter").
 * @param {string} dataAttribute - The name of the data attribute to read (e.g., "data-keywords").
 */
function populateKeywordFilter(listId, filterId, dataAttribute) {
    const $filter = $(filterId);
    if (!$filter.length) return; // Don't run if the filter isn't on the page

    const keywords = new Set();
    
    // Find all cards and get their keywords
    $(`${listId} .card-item`).each(function() {
        const keywordString = $(this).attr(dataAttribute); // Use .attr() for 'data-keywords'
        if (keywordString) {
            const keys = keywordString.split(',');
            keys.forEach(key => {
                const trimmedKey = key.trim();
                if (trimmedKey) {
                    keywords.add(trimmedKey);
                }
            });
        }
    });

    // Sort keywords alphabetically
    const sortedKeywords = Array.from(keywords).sort();

    // Create and append <option> tags
    sortedKeywords.forEach(key => {
        $filter.append($('<option>', {
            value: key,
            text: key
        }));
    });
}

function filterYouTubeCards() {
    const searchTerm = $('#youtube-search-box').val().toLowerCase();
    const selectedKeyword = $('#youtube-keyword-filter').val(); // <-- NEW
    
    const $grid = $('#Grid');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#youtube-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedKeyword !== "all") { // <-- UPDATED
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const title = $card.find('h3').text().toLowerCase();
            const desc = $card.find('p').text().toLowerCase();
            const keywords = $card.data('keywords'); // <-- NEW

            const searchMatch = (searchTerm === "" || title.includes(searchTerm) || desc.includes(searchTerm));
            const keywordMatch = (selectedKeyword === "all" || keywords.includes(selectedKeyword)); // <-- NEW

            if (searchMatch && keywordMatch) { // <-- UPDATED
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else {
                $card.hide();
            }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
        
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'));
    }
}

function filterPostCards() {
    const searchTerm = $('#post-search-box').val().toLowerCase();
    const selectedCategory = $('#post-category-filter').val();
    const selectedKeyword = $('#post-keyword-filter').val(); // <-- NEW
    
    const $grid = $('#posts-card-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#posts-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") { // <-- UPDATED
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategory = $card.data('category'); 
            const keywords = $card.data('keywords'); // <-- NEW
            const title = $card.find('h3').text().toLowerCase();
            const desc = $card.find('p').text().toLowerCase();

            const categoryMatch = (selectedCategory === "all" || cardCategory === selectedCategory);
            const searchMatch = (searchTerm === "" || title.includes(searchTerm) || desc.includes(searchTerm));
            const keywordMatch = (selectedKeyword === "all" || (keywords && keywords.includes(selectedKeyword))); // <-- NEW

            if (categoryMatch && searchMatch && keywordMatch) { // <-- UPDATED
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else {
                $card.hide();
            }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
        
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'));
    }
}

function filterCertCards() {
    const searchTerm = $('#cert-search-box').val().toLowerCase();
    const selectedCategory = $('#cert-category-filter').val();
    const selectedKeyword = $('#cert-keyword-filter').val(); // <-- NEW
    
    const $grid = $('#cert-card-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#cert-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") { // <-- UPDATED
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategories = $card.data('category'); // This is our keyword source
            const title = $card.find('img').attr('alt').toLowerCase();

            const categoryMatch = (selectedCategory === "all" || cardCategories.includes(selectedCategory));
            const searchMatch = (searchTerm === "" || title.includes(searchTerm));
            const keywordMatch = (selectedKeyword === "all" || cardCategories.includes(selectedKeyword)); // <-- NEW

            if (categoryMatch && searchMatch && keywordMatch) { // <-- UPDATED
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else {
                $card.hide();
            }
        });

        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
        
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'));
    }
}
