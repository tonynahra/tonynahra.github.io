/* === GLOBAL VARIABLES === */
var currentCardList = []; 
var currentCardIndex = 0; 
var isModalInfoVisible = false; 

// --- STOP_WORDS, REPLACEMENT_MAP, SYNONYM_MAP are in filterConfig.js ---

function decodeText(text) {
    if (!text) return "";
    try {
        var $textarea = $('<textarea></textarea>');
        $textarea.html(text);
        return $textarea.val(); // Fixed minor decoding bug in previous snippet
    } catch (e) {
        return text;
    }
}

/* === --- EVENT LISTENERS (DELEGATED) --- === */
$(document).ready(function () {
    // ... (Modal Injection) ...
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

    // ... (Toggle/Card Click/Modal listeners same as before) ...
    $('body').on('click', '.toggle-card-button', function() {
        const $button = $(this);
        const $list = $button.prev('.card-list');
        if ($list.length) { showMoreCards($button, $list); }
    });

    $('body').on('click', '.card-item, .item', function(e) {
        const $clickedCard = $(this);
        const $link = $clickedCard.find('a').first();
        if (!$link.length) { return; } 
        
        const $clickedLink = $(e.target).closest('a');
        if ($clickedLink.length > 0 && !$clickedLink.is($link)) { return; }
        
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

    $('body').on('click', '.modal-close-btn', function() {
        const $modal = $('#content-modal');
        $('body').removeClass('modal-open');
        $modal.fadeOut(200);
        $('#modal-content-area').html(''); 
        currentCardList = [];
        currentCardIndex = 0;
        isModalInfoVisible = false; 
        $(document).off('keydown.modalNav');
    });
    
    $('body').on('click', '#content-modal', function(e) {
        if (e.target.id === 'content-modal') {
            $(this).find('.modal-close-btn').click();
        }
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
    
    // --- NEW: Tutorial Filters ---
    $('body').on('input', '#tutorials-search-box', filterTutorialCards);
    $('body').on('change', '#tutorials-category-filter', filterTutorialCards);
    $('body').on('change', '#tutorials-keyword-filter', filterTutorialCards);

    $('#content-modal').on('click', '.tab-button', function() {
        $(this).siblings().removeClass('active');
        $(this).addClass('active');
        const htmlUrl = $(this).data('content-url');
        loadModalTabContent(htmlUrl, '#research-tab-content-modal');
    });
});

// ... (handleCardView, showMoreCards, loadVids, resultsLoop, loadPhotoAlbum, etc. remain the same) ...
// ... (populateCategoryFilter, populateSmartKeywords, etc. remain the same) ...

// --- NEW: Filter function for Tutorials page ---
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

// ... (loadModalContent is the same as previous turn, ensuring it handles 'tutorial' loadType) ...
// ... (Copy the other functions from the previous cardLogic.js) ...
