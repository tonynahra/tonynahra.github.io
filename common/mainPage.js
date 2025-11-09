var lastContentPage = 'tech-posts.html'; 

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


$(document).ready(function () {
    
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
        
        const initialLoad = $(this).data('initial-load');
        loadContent(pageUrl, initialLoad);
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
        const loadType = $link.data('load-type'); // Get the *explicit* type

        // ONLY load content in-page if data-load-type is specified.
        if (loadType) {
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
            $contentArea.prepend($contentWrapper);
            
            const $scrollToElement = $contentArea.find('.loaded-content-wrapper');
            if ($scrollToElement.length) {
                const scrollToTarget = $scrollToElement.offset().top - 20;
                // Use native INSTANT scroll
                window.scrollTo({ top: scrollToTarget, behavior: 'auto' });
            }

            const customHeight = $link.data('height') || '85vh';

            switch (loadType) {
                case 'html':
                    $.ajax({
                        url: loadUrl, type: 'GET',
                        success: function(data) { $contentWrapper.append(data); },
                        error: function() { $contentWrapper.append('<div class="error-message">Could not load content.</div>'); }
                    });
                    break;
                case 'image':
                    $contentWrapper.append(`<div class="image-wrapper"><img src="${loadUrl}" class="loaded-image" alt="Loaded content"></div>`);
                    break;
                case 'iframe':
                    $contentWrapper.append(`<iframe src="${loadUrl}" class="loaded-iframe" style="height: ${customHeight};"></iframe>`);
                    break;
                default:
                    window.open(loadUrl, '_blank');
            }
        } 
        else {
            window.open(loadUrl, '_blank');
        }
    });

    // Listener for the "Back" button
    $('body').on('click', '.js-back-to-list', function() {
        const $contentArea = $('#content-area');
        $contentArea.find('.loaded-content-wrapper').remove();
        const $cardPage = $contentArea.find('.card-list-page').first().show();

        if ($cardPage.length) {
            const scrollToTarget = $cardPage.offset().top - 20;
            // Use native INSTANT scroll
            window.scrollTo({ top: scrollToTarget, behavior: 'auto' });
        }
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


/* === COLLAPSIBLE MENU LOGIC (LEFT-SIDE PLAYLISTS) === */
function initializeCollapsibleSections() {
    $('.expand-button').each(function() {
        const $button = $(this);
        const targetId = $button.data('target');
        const $target = $('#' + targetId);
        const $items = $target.find('a'); 
        const totalItems = $items.length;
        const initialLimit = parseInt($button.data('initial-load') || 3);
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
function loadContent(pageUrl, initialLoadOverride) {
    const $contentArea = $('#content-area');
    $contentArea.empty();
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading Content...</p></div>');
    
    const scrollToTarget = $contentArea.offset().top - 20; 
    window.scrollTo({ top: scrollToTarget, behavior: 'auto' });

    $.ajax({
        url: pageUrl.split('?')[0],
        type: 'GET',
        success: function(data) {
            $contentArea.html(data); 

            const isYouTubePage = pageUrl.includes('youtube_page.html');
            const isPostsPage = pageUrl.includes('posts.html'); 
            const isCertsPage = pageUrl.includes('certificates.html');
            const isAlbumPage = pageUrl.includes('album.html');
            const isResearchPage = pageUrl.includes('research.html'); 

            if (isYouTubePage) {
                const paramString = pageUrl.substring(pageUrl.indexOf('?') + 1);
                const params = paramString.split(',');
                if (params.length === 3 && typeof loadVids === 'function') {
                    loadVids(params[0], params[1], params[2], initialLoadOverride);
                } else {
                    $contentArea.html('<div class="error-message">YouTube parameter error.</div>');
                }
            } else if (isPostsPage) {
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#posts-card-list', '#post-keyword-filter');
                populateCategoryFilter('#posts-card-list', '#post-category-filter'); // <-- ADDED
            } else if (isCertsPage) { 
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#cert-card-list', '#cert-keyword-filter');
                populateCategoryFilter('#cert-card-list', '#cert-category-filter'); // <-- ADDED
            } else if (isAlbumPage) { 
                const queryString = pageUrl.split('?')[1];
                if (queryString) {
                    const urlParams = new URLSearchParams(queryString);
                    const jsonUrl = urlParams.get('json');
                    
                    if (jsonUrl) {
                        loadPhotoAlbum(jsonUrl, initialLoadOverride); // This now calls populateCategoryFilter
                    } else {
                        $contentArea.html('<div class="error-message">No JSON URL specified for album.</div>');
                    }
                } else {
                     $contentArea.html('<div class="error-message">No JSON URL specified for album.</div>');
                }
            } else if (isResearchPage) { 
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#research-card-list', '#research-keyword-filter');
                populateCategoryFilter('#research-card-list', '#research-category-filter'); // <-- ADDED
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

