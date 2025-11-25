/* === MAIN PAGE CONTROLLER === */
var lastContentPage = 'posts.html'; 

$(document).ready(function () {
    
    // --- Inject Modal ---
    if ($('#content-modal').length === 0) {
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
    }

    // --- Event Listeners ---

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
    
    if (typeof filterYouTubeCards === 'function') {
        $('body').on('input change', '#youtube-search-box, #youtube-keyword-filter', filterYouTubeCards);
    }

    // Collapsible Menu
    $('.expand-button').click(function() {
         const targetId = $(this).data('target');
         const $target = $('#' + targetId);
         const $items = $target.find('a'); 
         const totalItems = $items.length;
         const increment = 3; 
         let visibleCount = $(this).data('visible-count') || parseInt($(this).data('initial-load'));
         
         if ($(this).text().includes("Show More") && !$target.data('initialized')) {
             if (totalItems > visibleCount) {
                $items.slice(visibleCount).addClass('hidden-item');
             }
             $target.data('initialized', true);
         } else {
             const newVisibleCount = visibleCount + increment;
             $items.slice(visibleCount, newVisibleCount).removeClass('hidden-item');
             $(this).data('visible-count', newVisibleCount);
             const remaining = totalItems - newVisibleCount;
             if (remaining <= 0) { $(this).hide(); } 
             else { $(this).text(`Show More (${remaining} more) \u25BC`); }
         }
    });
    $('.expand-button').click();

    // --- DEEP LINKING LOGIC ---
    const urlParams = new URLSearchParams(window.location.search);
    let deepLinkPage = null;
    let deepLinkTitle = null;

    if (urlParams.has('post')) {
        deepLinkPage = 'posts.html';
        deepLinkTitle = urlParams.get('post');
    } else if (urlParams.has('research')) {
        deepLinkPage = 'research.html';
        deepLinkTitle = urlParams.get('research');
    } else if (urlParams.has('tutorial')) {
        deepLinkPage = 'tutorials.html';
        deepLinkTitle = urlParams.get('tutorial');
    } else if (urlParams.has('cert')) {
        deepLinkPage = 'certificates.html';
        deepLinkTitle = urlParams.get('cert');
    } else if (urlParams.has('youtube')) {
        deepLinkPage = 'youtube_page.html?PLjfDEkXKdbvhdEK9dGFwSnmNnxS7QQWbQ,Programming,007acc'; 
    }

    if (deepLinkPage) {
        // Highlight nav
        $('.nav-link').removeClass('active-nav');
        let $navLink = $(`.nav-link[data-page="${deepLinkPage}"]`);
        if ($navLink.length === 0 && deepLinkPage.includes('youtube')) {
             $navLink = $(`.nav-link[data-page*="youtube_page.html"]`).first();
        }
        $navLink.addClass('active-nav');
        
        // Load with Callback
        loadContent(deepLinkPage, null, function() {
            if (deepLinkTitle) {
                // Use openCardByTitle only after content is confirmed loaded
                setTimeout(() => {
                     if (typeof openCardByTitle === 'function') {
                        openCardByTitle(deepLinkTitle);
                    } else {
                        console.error("openCardByTitle not found in cardLogic.js");
                    }
                }, 500); 
            }
        });
    } else {
        // Standard Initial Load
        const initialPage = $('.nav-link.active-nav');
        if (initialPage.length) {
            loadContent(initialPage.data('page'), initialPage.data('initial-load'));
        }
    }
});

/* --- LOAD CONTENT (Updated with callback) --- */
function loadContent(pageUrl, initialLoadOverride, onComplete) {
    const $contentArea = $('#content-area');
    $contentArea.empty();
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading...</p></div>');
    window.scrollTo({ top: $contentArea.offset().top - 20, behavior: 'auto' });

    $.ajax({
        url: pageUrl.split('?')[0],
        type: 'GET',
        success: function(data) {
            $contentArea.html(data); 

            if (pageUrl.includes('youtube_page.html')) {
                const params = pageUrl.substring(pageUrl.indexOf('?') + 1).split(',');
                // Pass onComplete to loadVids
                if (typeof loadVids === 'function') {
                    loadVids(params[0], params[1], params[2], initialLoadOverride, onComplete);
                }
            } else {
                // Synchronous setups
                if (pageUrl.includes('posts.html')) {
                    handleCardView($contentArea, initialLoadOverride);
                    populateSmartKeywords('#posts-card-list', '#post-keyword-filter');
                    populateCategoryFilter('#posts-card-list', '#post-category-filter');
                } else if (pageUrl.includes('certificates.html')) { 
                    handleCardView($contentArea, initialLoadOverride);
                    populateSmartKeywords('#cert-card-list', '#cert-keyword-filter');
                    populateCategoryFilter('#cert-card-list', '#cert-category-filter');
                } else if (pageUrl.includes('album.html')) { 
                     const urlParams = new URLSearchParams(pageUrl.split('?')[1]);
                     // Pass onComplete to loadPhotoAlbum
                     if (typeof loadPhotoAlbum === 'function') {
                         loadPhotoAlbum(urlParams.get('json'), initialLoadOverride, onComplete);
                         return; // Return here so we don't trigger onComplete twice
                     }
                } else if (pageUrl.includes('research.html')) { 
                    handleCardView($contentArea, initialLoadOverride);
                    populateSmartKeywords('#research-card-list', '#research-keyword-filter');
                    populateCategoryFilter('#research-card-list', '#research-category-filter');
                } else if (pageUrl.includes('tutorials.html')) {
                    handleCardView($contentArea, initialLoadOverride);
                    populateSmartKeywords('#tutorials-card-list', '#tutorials-keyword-filter');
                    populateCategoryFilter('#tutorials-card-list', '#tutorials-category-filter');
                }
                
                if (typeof initializeImageModal === 'function') {
                    initializeImageModal(); 
                }
                
                // Trigger callback for synchronous loads
                if (typeof onComplete === 'function') {
                    onComplete();
                }
            }
        },
        error: function() {
            $contentArea.html('<div class="error-message">Error loading content.</div>');
        }
    });
}
