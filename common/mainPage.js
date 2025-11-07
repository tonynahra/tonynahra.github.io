/* === GLOBAL SETUP === */
$(document).ready(function () {
    
    // 1. Initialize all collapsible sections (YouTube menu)
    initializeCollapsibleSections();
    
    // 2. Attach event listener to all expand buttons (YouTube menu)
    $('.expand-button').on('click', function() {
        toggleCollapsibleSection($(this));
    });
    
    // 3. Attach event listener to all dynamic navigation links
    $('.nav-link').on('click', function(e) {
        e.preventDefault();
        
        // Update active state in the left menu
        $('.nav-link').removeClass('active-nav');
        $(this).addClass('active-nav');
        
        // Load the new content
        const pageUrl = $(this).data('page');
        loadContent(pageUrl);
    });
    
    // 4. Load initial content (the first link marked 'active-nav')
    const initialPage = $('.nav-link.active-nav').data('page');
    if (initialPage) {
        loadContent(initialPage);
    }
});


/* === DYNAMIC CONTENT LOADING LOGIC === */

/**
 * Loads content from a given URL into the #content-area.
 * @param {string} pageUrl - The URL of the content file (e.g., 'posts.html').
 */
function loadContent(pageUrl) {
    const $contentArea = $('#content-area');
    
    // 1. Show loading state
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading Content...</p></div>');
    
    // 2. Fetch the content
    $.ajax({
        url: pageUrl,
        type: 'GET',
        success: function(data) {
            // Check if the URL contains a query string (for YouTube pages)
            if (pageUrl.includes('?')) {
                // If it's a YouTube page, only load the container content, not the whole HTML page
                // We assume the YouTube page has a #youtube-card-container
                const $html = $(data);
                const $youtubeContent = $html.find('#youtube-card-container').html();
                $contentArea.html($youtubeContent);
                
                // If the YouTube script needs to run, call it here (details below)
                // runYoutubeScript(pageUrl);
            } else {
                // For Posts and Certificates, just load the HTML fragment
                $contentArea.html(data);
            }

            // 3. Apply card logic after content is loaded
            handleCardView($contentArea);
            
            // 4. Re-initialize image modals if applicable
            if (window.initializeImageModal) {
                window.initializeImageModal(); 
            }
        },
        error: function() {
            $contentArea.html('<div class="error-message">Could not load content. Please try again.</div>');
        }
    });
}

/* === CARD VIEW (Show More) LOGIC === */

/**
 * Finds all .card-list elements and applies the initial 10-item limit.
 * @param {object} $scope - The jQuery object containing the newly loaded content.
 */
function handleCardView($scope) {
    $scope.find('.card-list').each(function() {
        const $list = $(this);
        const $items = $list.children();
        const initialLimit = 10;
        
        // Remove existing button just in case
        $list.next('.toggle-card-button').remove(); 
        
        if ($items.length > initialLimit) {
            // Hide all items after the limit
            $items.slice(initialLimit).addClass('hidden-card-item');
            
            // Create and append the "Show More" button
            const $button = $(`<button class="toggle-card-button" data-state="collapsed">
                Show More (${$items.length - initialLimit} more) \u25BC
            </button>`);
            
            $button.on('click', function() {
                toggleCardList($list, $button, initialLimit);
            });
            
            $list.after($button);
        }
    });
}

/**
 * Toggles the expanded state of a card list.
 * @param {object} $list - The jQuery object of the card list container.
 * @param {object} $button - The jQuery object of the toggle button.
 * @param {number} initialLimit - The number of initially visible cards.
 */
function toggleCardList($list, $button, initialLimit) {
    const isExpanded = $button.data('state') === 'expanded';
    const $items = $list.children();
    const totalCount = $items.length;
    const hiddenCount = totalCount - initialLimit;

    if (!isExpanded) {
        // EXPAND: Show all items
        $items.slice(initialLimit).removeClass('hidden-card-item');
        $button.text(`Show Less \u25B2`);
        $button.data('state', 'expanded');
    } else {
        // COLLAPSE: Hide items past the limit
        $items.slice(initialLimit).addClass('hidden-card-item');
        $button.text(`Show More (${hiddenCount} more) \u25BC`);
        $button.data('state', 'collapsed');
    }
}


/* === COLLAPSIBLE MENU LOGIC (Re-used for YouTube menu on left) === */
// (Keep the original initializeCollapsibleSections and toggleCollapsibleSection functions 
// from the previous response here, as they manage the left-side YouTube menu)

// ... (Your previous initializeCollapsibleSections and toggleCollapsibleSection functions here) ...

/* === YOUTUBE PLAYLIST LOGIC ADAPTATION === */

// IMPORTANT: This script is only an adaptation. 
// The real YouTube video loading logic should be run on the loaded page (e.g., youtube_page.html)
// or called from here if the loading logic is self-contained. 
// I recommend keeping the core YouTube logic in a separate file for the dedicated page, 
// and updating the loaded content via AJAX.

// ... (Your original YouTube functions loadVids, resultsLoop, etc., can be removed 
// from this file unless you are making this the central script to also run the YouTube AJAX call) ...

function topFunction() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}
