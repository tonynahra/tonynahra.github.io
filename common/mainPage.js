var lastContentPage = 'tech-posts.html'; 

// --- List of common words to ignore ---
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 
    'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 
    'were', 'will', 'with', 'part', 'op', 'web', 'at', 'al', 'com', 'org', 'www',
    'https', 'http', 'pdf', 'html', 'sheet', 'cheat', 'for', 'github', 'master',
    'file', 'files', 'user', 'users', 'server', 'servers', 'link', 'more', 'read',
    'view', 'full', 'size', 'click', 'introductory', 'introduction', 'advanced',
    'comprehensive', 'dummies', 'glance', 'handout', 'part 1', 'v1'
]);

/**
 * Helper function to safely decode text.
 * @param {string} text - The text to decode.
 * @returns {string} - The decoded text.
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


$(document).ready(function () {
    
    // --- NEW: Inject the modal HTML on page load ---
    $('body').append(`
        <div id="content-modal" class="modal-backdrop">
            <div class="modal-content">
                <div class="modal-header">
                    <button class="modal-close-btn">&larr; Close</button>
                    <a href="#" class="open-new-window" target="_blank" rel="noopener noreferrer">
                        Open in new window &nearr;
                    </a>
                </div>
                <div id="modal-content-area">
                    <!-- Content (iframe, image, html) will be loaded here -->
                </div>
            </div>
        </div>
    `);
    // --- END NEW ---

    initializeCollapsibleSections();
    
    // --- EVENT LISTENERS (DELEGATED) ---

    $('body').on('click', '.expand-button', function() {
        toggleCollapsibleSection($(this));
    });
    
    $('body').on('click', '.toggle-card-button', function() {
        const $button = $(this);
        const $list = $button.prev('.card-list');
        if ($list.length) {
            showMoreCards($button, $list);
        }
    });

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

    // --- UPDATED: Listener for ALL CARDS (now opens modal) ---
    $('body').on('click', '.card-item, .item', function(e) {
        const $link = $(this).find('a').first(); 
        if (!$link.length) { return; } 
        
        // Allow clicks on "Open in new window" *inside the modal* to work
        if ($(e.target).hasClass('open-new-window') || $(e.target).closest('.open-new-window').length) {
            return;
        }

        e.preventDefault(); 
        e.stopPropagation(); 
        
        const loadUrl = $link.attr('href');
        let loadType = $link.data('load-type'); // Get the *explicit* type
        
        // --- UPDATED LOGIC ---
        // If no type is specified, open in a new tab and STOP.
        if (!loadType) {
            window.open(loadUrl, '_blank');
            return; 
        }
        // --- END UPDATED LOGIC ---


        // --- NEW MODAL LOGIC ---
        const $modal = $('#content-modal');
        const $modalContent = $('#modal-content-area');
        const $modalOpenLink = $modal.find('.open-new-window');

        // 1. Clear old content
        $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>');
        
        // 2. Set the "Open in new window" link href
        $modalOpenLink.attr('href', loadUrl);
        
        // 3. Load new content
        const customHeight = $link.data('height') || '85vh';

        switch (loadType) {
            case 'html':
                $.ajax({
                    url: loadUrl, type: 'GET',
                    success: function(data) { $modalContent.html(data); },
                    error: function() { $modalContent.html('<div class="error-message">Could not load content.</div>'); }
                });
                break;
            case 'image':
                $modalContent.html(`<div class="image-wrapper"><img src="${loadUrl}" class="loaded-image" alt="Loaded content"></div>`);
                break;
            case 'iframe':
                // Check for sites that block iframes
                if (loadUrl.includes('github.com') || loadUrl.includes('google.com')) {
                    $modalContent.html('<div class="error-message">This site (e.g., GitHub) blocks being loaded here. Please use the "Open in new window" button.</div>');
                } else {
                    $modalContent.html(`<iframe src="${loadUrl}" class="loaded-iframe" style="height: ${customHeight};"></iframe>`);
                }
                break;
            default:
                // This case should no longer be reachable
                $modalContent.html('<div class="error-message">Unknown content type.</div>');
                return;
        }
        
        // 4. Show the modal
        $modal.fadeIn(200);
    });

    // --- NEW: Listener for the Modal "Close" button ---
    $('body').on('click', '.modal-close-btn', function() {
        const $modal = $('#content-modal');
        const $modalContent = $('#modal-content-area');
        
        // Hide the modal
        $modal.fadeOut(200);
        
        // Clear the content to stop videos/etc. from playing
        $modalContent.html('');
    });
    
    // Optional: Click backdrop to close
    $('body').on('click', '#content-modal', function(e) {
        if (e.target.id === 'content-modal') {
            $(this).find('.modal-close-btn').click();
        }
    });
    // --- END NEW MODAL LOGIC ---


    // --- All filter listeners ---
    $('body').on('input', '#youtube-search-box', filterYouTubeCards);
    $('body').on('change', '#youtube-keyword-filter', filterYouTubeCards);
    $('body').on('input', '#post-search-box', filterPostCards);
    $('body').on('change', '#post-category-filter', filterPostCards);
    $('body').on('change', '#post-keyword-filter', filterPostCards);
    $('body').on('input', '#cert-search-box', filterCertCards);
    $('body').on('change', '#cert-category-filter', filterCertCards);
    $('body').on('change', '#cert-keyword-filter', filterCertCards);
    
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


    // --- Scroll-to-Top Button Logic ---
    $('body').append('<button class="scroll-to-top" title="Go to top">&uarr;</button>');
    const $scrollTopBtn = $('.scroll-to-top');
    $(window).on('scroll', function() {
        if ($(window).scrollTop() > 300) {
            $scrollTopBtn.addClass('show');
        } else {
            $scrollTopBtn.removeClass('show');
        }
    });
    
    $('body').on('click', '.scroll-to-top', function() {
        window.scrollTo({ top: 0, behavior: 'auto' });
    });

    // Load initial content
    const initialPage = $('.nav-link.active-nav').data('page');
    if (initialPage) {
        lastContentPage = initialPage;
        loadContent(initialPage);
    }
});


/* === COLLAPSIBLE MENU LOGIC (LEFT-SIDE PLAYLISTS) === */
function initializeCollapsibleSections() {
    $('.expand-button').each(function() {
        const $button = $(this);
        const targetId = $button.data('target');
        const $target = $('#' + targetId);
        const $items = $target.find('a'); 
        const totalItems = $items.length;
        const initialLimit = parseInt($button.data('max') || 3);
        const increment = 3; 

        if (totalItems > initialLimit) {
            $items.slice(initialLimit).addClass('hidden-item');
            const remaining = totalItems - initialLimit;
            $button.text(`Show More (${remaining} more) \u25BC`);
            $button.data({'visible-count': initialLimit, 'increment': increment, 'total-items': totalItems});
            $button.show();
        } else {
            $button.hide(); 
        }
    });
}

function toggleCollapsibleSection($button) {
    const targetId = $button.data('target');
    const $target = $('#' + targetId);
    const $items = $target.find('a');

    const totalItems = parseInt($button.data('total-items') || 0);
    const increment = parseInt($button.data('increment') || 3);
    const visibleCount = parseInt($button.data('visible-count') || 0);
    
    const newVisibleCount = visibleCount + increment;

    $items.slice(visibleCount, newVisibleCount).removeClass('hidden-item');
    $button.data('visible-count', newVisibleCount);
    
    const remaining = totalItems - newVisibleCount;
    
    if (remaining <= 0) {
        $button.hide();
    } else {
        $button.text(`Show More (${remaining} more) \u25BC`);
    }
}


/* === DYNAMIC CONTENT LOADING IMPLEMENTATION === */
function loadContent(pageUrl) {
    const $contentArea = $('#content-area');
    $contentArea.empty();
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading Content...</p></div>');
    
    const scrollToTarget = $contentArea.offset().top - 20; 
    window.scrollTo({ top: scrollToTarget, behavior: 'auto' });

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
                populateSmartKeywords('#posts-card-list', '#post-keyword-filter');
            } else if (isCertsPage) { 
                handleCardView($contentArea);
                populateSmartKeywords('#cert-card-list', '#cert-keyword-filter');
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

/* === --- SMART KEYWORD LOGIC (UPDATED) --- === */

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
            ];
            
            const combinedText = decodeText(textSources.join(' '));
            const words = combinedText.split(/[^a-zA-Z0-9'-]+/); 
            
            words.forEach(word => {
                const cleanWord = word.toLowerCase().trim().replace(/[^a-z0-9]/gi, ''); 
                
                if (cleanWord.length > 2 && cleanWord.length <= 15 && !STOP_WORDS.has(cleanWord) && isNaN(cleanWord)) {
                    wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
                }
            });
        });

        const sortedKeywords = Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 30)
            .map(([word]) => word);

        $filter.children('option:not(:first)').remove();
        
        sortedKeywords.forEach(key => {
            const displayText = key.length > 8 ? key.substring(0, 8) + '...' : key;
            
            $filter.append($('<option>', {
                value: key,       // Value is the full word
                text: displayText  // Text is truncated
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
        $card.data('category')
    ];
    return decodeText(textSources
        .map(text => String(text || '')) 
        .join(' ')
        .toLowerCase());
}


/* === --- FILTERING LOGIC (UPDATED FOR NEW KEYWORDS) --- === */

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
            const keywordMatch = (selectedKeyword === "all" || cardText.includes(selectedKeyword));

            if (searchMatch && keywordMatch) {
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
            const keywordMatch = (selectedKeyword === "all" || cardText.includes(selectedKeyword));

            if (categoryMatch && searchMatch && keywordMatch) {
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
            const keywordMatch = (selectedKeyword === "all" || cardText.includes(selectedKeyword)); 

            if (categoryMatch && searchMatch && keywordMatch) {
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
