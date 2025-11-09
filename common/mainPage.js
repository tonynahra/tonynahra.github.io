var lastContentPage = 'tech-posts.html'; 

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
        
        const initialLoad = $(this).data('initial-load');
        loadContent(pageUrl, initialLoad);
    });

    // Theme Switcher Logic
    function applyTheme(theme) {
        $('body').removeClass('theme-light theme-pastel theme-forest theme-cool');
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
    const initialPage = $('.nav-link.active-nav');
    if (initialPage.length) {
        const pageUrl = initialPage.data('page');
        const initialLoad = initialPage.data('initial-load');
        lastContentPage = pageUrl;
        loadContent(pageUrl, initialLoad);
    }
});


/* === COLLAPSIBLE MENU LOGIC (LEFT-SIDE PLAYLISTS) === */
function initializeCollapsibleSections() {
    $('.expand-button').each(function() {
        const $button = $(this);
        const targetId = $button.data('target');
        const $target = $('#'AS $target);
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
            } else if (isCertsPage) { 
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#cert-card-list', '#cert-keyword-filter');
            } else if (isAlbumPage) { 
                const queryString = pageUrl.split('?')[1];
                if (queryString) {
                    const urlParams = new URLSearchParams(queryString);
                    const jsonUrl = urlParams.get('json');
                    
                    if (jsonUrl) {
                        loadPhotoAlbum(jsonUrl, initialLoadOverride);
                    } else {
                        $contentArea.html('<div class="error-message">No JSON URL specified for album.</div>');
                    }
                } else {
                     $contentArea.html('<div class="error-message">No JSON URL specified for album.</div>');
                }
            } else if (isResearchPage) { 
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#research-card-list', '#research-keyword-filter');
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
