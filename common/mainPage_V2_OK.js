/* === GLOBAL SETUP & DYNAMIC CONTENT LOADING LOGIC === */
var lastContentPage = 'tech-posts.html'; // Default to posts.html

$(document).ready(function () {
    
    // --- Inject Modal ---
    $('body').append(`
        <div id="content-modal" class="modal-backdrop">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-nav-left">
                        <button class="modal-prev-btn" title="Previous">&larr; Prev</button>
                        <button class="modal-next-btn" title="Next">Next &rarr;</button>
                        <button class="modal-info-btn" title="Toggle Info">Info</button>
                    </div>
                    <div class="modal-nav-right">
                        <a href="#" class="open-new-window" target="_blank">Open in new window &nearr;</a>
                        <button class="modal-close-btn" title="Close">&times; Close</button>
                    </div>
                </div>
                <div id="modal-content-area"></div>
            </div>
        </div>
    `);

    // --- Event Listeners (Delegated for dynamic content) ---

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

    // 2. Card Click (Open Modal)
    $('body').on('click', '.card-item, .item', function(e) {
        const $clickedCard = $(this);
        const $link = $clickedCard.find('a').first();
        if (!$link.length) return;
        
        // Ignore clicks on links inside the card
        if ($(e.target).is('a') || $(e.target).closest('a').length) {
             if (!$(e.target).is($link) && !$(e.target).closest('a').is($link)) return;
        }
        
        e.preventDefault(); 
        e.stopPropagation(); 
        
        const $cardList = $clickedCard.closest('.card-list');
        const $allVisibleCards = $cardList.children('.card-item:visible, .item:visible');
        
        currentCardList = [];
        $allVisibleCards.each(function() { currentCardList.push($(this).find('a').first()); });
        currentCardIndex = $allVisibleCards.index($clickedCard);
        
        if (currentCardList.length > 0) {
            loadModalContent(currentCardIndex);
            $('body').addClass('modal-open');
            $('#content-modal').fadeIn(200);
            $(document).on('keydown.modalNav', handleModalKeys);
        }
    });

    // 3. Modal Controls
    $('body').on('click', '.modal-close-btn', function() {
        $('body').removeClass('modal-open');
        $('#content-modal').fadeOut(200);
        $('#modal-content-area').html('');
        currentCardList = [];
        $(document).off('keydown.modalNav');
    });
    $('body').on('click', '#content-modal', function(e) {
        if (e.target.id === 'content-modal') $('.modal-close-btn').first().click();
    });
    $('body').on('click', '.modal-prev-btn', function() {
        if (currentCardIndex > 0) loadModalContent(currentCardIndex - 1);
    });
    $('body').on('click', '.modal-next-btn', function() {
        if (currentCardIndex < currentCardList.length - 1) loadModalContent(currentCardIndex + 1);
    });
    $('body').on('click', '.modal-info-btn', function() {
        isModalInfoVisible = !isModalInfoVisible;
        $('#modal-content-area').find('.modal-photo-info').toggleClass('info-visible', isModalInfoVisible);
    });

    // 4. Card "Show More" Button
    $('body').on('click', '.toggle-card-button', function() {
        const $list = $(this).prev('.card-list');
        if ($list.length) showMoreCards($(this), $list);
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
    // Use the generic filter for card lists
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
        
    // YouTube has a slightly different structure for now, so keeping separate
    $('body').on('input change', '#youtube-search-box, #youtube-keyword-filter', function() {
        // Assuming filterYouTubeCards is global in cardLogic.js or we can genericize it later
        // For now, let's just call the function if it exists
        if (typeof filterYouTubeCards === 'function') {
            filterYouTubeCards();
        }
    });

    // --- Initial Load ---
    const initialPage = $('.nav-link.active-nav');
    if (initialPage.length) {
        loadContent(initialPage.data('page'), initialPage.data('initial-load'));
    }
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
