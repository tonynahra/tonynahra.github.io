/* === MAIN PAGE CONTROLLER === */
var lastContentPage = 'posts.html'; 

$(document).ready(function () {
    
    // 1. Left Menu Navigation
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

    // 5. Theme Switcher
    function applyTheme(theme) {
        $('body').removeClass('theme-light theme-pastel theme-forest theme-cool');
        if (theme !== 'theme-dark') $('body').addClass(theme);
        localStorage.setItem('theme', theme);
        $('.theme-dot').removeClass('active');
        $(`.theme-dot[data-theme="${theme}"]`).addClass('active');
    }
    $('body').on('click', '.theme-dot', function() { applyTheme($(this).data('theme')); });
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) applyTheme(savedTheme); else $('.theme-dot[data-theme="theme-dark"]').addClass('active');

    // 6. Scroll to Top
    $('body').append('<button class="scroll-to-top" title="Go to top">&uarr;</button>');
    $(window).on('scroll', function() {
        if ($(window).scrollTop() > 300) $('.scroll-to-top').addClass('show'); else $('.scroll-to-top').removeClass('show');
    });
    $('body').on('click', '.scroll-to-top', function() { window.scrollTo({ top: 0, behavior: 'auto' }); });

    // 7. Filters
    $('body').on('input change', '#post-search-box, #post-category-filter, #post-keyword-filter', 
        () => filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10));
        
    $('body').on('input change', '#cert-search-box, #cert-category-filter, #cert-keyword-filter', 
        () => filterCardsGeneric('#cert-card-list', '#cert-search-box', '#cert-category-filter', '#cert-keyword-filter', '#cert-no-results', 12));

    $('body').on('input change', '#album-search-box, #album-category-filter, #album-keyword-filter', 
        () => filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20));

    $('body').on('input change', '#research-search-box, #research-category-filter, #research-keyword-filter', 
        () => filterCardsGeneric('#research-card-list', '#research-search-box', '#research-category-filter', '#research-keyword-filter', '#research-no-results', 10));

    $('body').on('input change', '#tutorials-search-box, #tutorials-category-filter, #tutorials-keyword-filter', 
        () => filterCardsGeneric('#tutorials-card-list', '#tutorials-search-box', '#tutorials-category-filter', '#tutorials-keyword-filter', '#tutorials-no-results', 10));

    // --- Initial Load ---
    const initialPage = $('.nav-link.active-nav');
    if (initialPage.length) {
        loadContent(initialPage.data('page'), initialPage.data('initial-load'));
    }
    
    // Collapsible Menu
    $('.expand-button').click(function() {
         const targetId = $(this).data('target');
         const $target = $('#' + targetId);
         const $items = $target.find('a'); 
         const totalItems = $items.length;
         const increment = 3; 
         let visibleCount = $(this).data('visible-count') || parseInt($(this).data('initial-load'));
         
         // Logic for initial hide
         if ($(this).text().includes("Show More") && !$target.data('initialized')) {
             if (totalItems > visibleCount) {
                $items.slice(visibleCount).addClass('hidden-item');
             }
             $target.data('initialized', true);
         } else {
             // Logic for show more
             const newVisibleCount = visibleCount + increment;
             $items.slice(visibleCount, newVisibleCount).removeClass('hidden-item');
             $(this).data('visible-count', newVisibleCount);
             const remaining = totalItems - newVisibleCount;
             if (remaining <= 0) { $(this).hide(); } 
             else { $(this).text(`Show More (${remaining} more) \u25BC`); }
         }
    });
    // Run initial collapsible logic
    $('.expand-button').click();
});

/* --- LOAD CONTENT --- */
function loadContent(pageUrl, initialLoadOverride) {
    const $contentArea = $('#content-area');
    $contentArea.empty();
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading...</p></div>');
    window.scrollTo({ top: $contentArea.offset().top - 20, behavior: 'auto' });

    $.ajax({
        url: pageUrl.split('?')[0],
        type: 'GET',
        success: function(data) {
            $contentArea.html(data); 

            // Parse page type and call specific logic
            if (pageUrl.includes('youtube_page.html')) {
                const params = pageUrl.substring(pageUrl.indexOf('?') + 1).split(',');
                loadVids(params[0], params[1], params[2], initialLoadOverride);
            } else if (pageUrl.includes('posts.html')) {
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#posts-card-list', '#post-keyword-filter');
                populateCategoryFilter('#posts-card-list', '#post-category-filter');
            } else if (pageUrl.includes('certificates.html')) { 
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#cert-card-list', '#cert-keyword-filter');
                populateCategoryFilter('#cert-card-list', '#cert-category-filter');
            } else if (pageUrl.includes('album.html')) { 
                const urlParams = new URLSearchParams(pageUrl.split('?')[1]);
                loadPhotoAlbum(urlParams.get('json'), initialLoadOverride);
            } else if (pageUrl.includes('research.html')) { 
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#research-card-list', '#research-keyword-filter');
                populateCategoryFilter('#research-card-list', '#research-category-filter');
            } else if (pageUrl.includes('tutorials.html')) {
                handleCardView($contentArea, initialLoadOverride);
                populateSmartKeywords('#tutorials-card-list', '#tutorials-keyword-filter');
                populateCategoryFilter('#tutorials-card-list', '#tutorials-category-filter');
            }
        },
        error: function() {
            $contentArea.html('<div class="error-message">Error loading content.</div>');
        }
    });
}
