/* === GLOBAL SETUP & DYNAMIC CONTENT LOADING LOGIC === */

$(document).ready(function () {
    
    // 1. Initialize all collapsible sections (YouTube menu on the left)
    // NOTE: This MUST be defined before it is called.
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
    
    // Your existing scroll-to-top logic (if you added the button)
    // mybutton = document.getElementById("myBtn");
    // window.onscroll = function() {scrollFunction()};
    // ... (rest of scrollFunction) ...
});


/* === COLLAPSIBLE MENU LOGIC (Left Side YouTube Menu) === */

/**
 * Hides all elements in a list/container that exceed a defined limit (data-max).
 * Updates the button text.
 */
function initializeCollapsibleSections() {
    $('.expand-button').each(function() {
        const $button = $(this);
        const targetId = $button.data('target');
        const $target = $('#' + targetId);
        const maxItems = parseInt($button.data('max') || 3); // Default to 3 visible items
        let $items = [];

        // In this context, we target the anchor tags (the playlist links)
        if ($target.hasClass('collapsible-content') && $target.find('a').length) {
            // Use only anchor tags
            $items = $target.find('a'); 
        }

        if ($items.length > maxItems) {
            // Hide items beyond the limit
            $items.slice(maxItems).addClass('hidden-item');
            
            // Set initial button text to show the number of hidden items
            const hiddenCount = $items.length - maxItems;
            $button.text(`Show More (${hiddenCount}) \u25BC`); // Down arrow
            $button.removeClass('expanded');
            $button.show(); // Ensure button is visible if there are hidden items
            
        } else {
            // If few items, hide the button
            $button.hide(); 
        }
    });
}

/**
 * Toggles the expanded state of a collapsible section.
 * @param {object} $button - The jQuery object for the clicked button.
 */
function toggleCollapsibleSection($button) {
    const targetId = $button.data('target');
    const $target = $('#' + targetId);
    const isExpanded = $button.hasClass('expanded');
    const maxItems = parseInt($button.data('max') || 3);

    // Toggle the visual class for the content wrapper (for CSS transition)
    $target.toggleClass('expanded', !isExpanded);
    $button.toggleClass('expanded', !isExpanded);
    
    // Find all the list items/links to show/hide
    let $items = [];
    if ($target.find('a').length) {
        $items = $target.find('a');
    }
    
    const hiddenCount = $items.length - maxItems;

    if (!isExpanded) {
        // EXPAND: Show all items and update button text/style
        $items.slice(maxItems).removeClass('hidden-item');
        $button.text(`Show Less \u25B2`); // Up arrow
    } else {
        // COLLAPSE: Hide the items beyond the limit and revert button text/style
        $items.slice(maxItems).addClass('hidden-item');
        $button.text(`Show More (${hiddenCount}) \u25BC`); // Down arrow
    }
}


/* === DYNAMIC CONTENT LOADING IMPLEMENTATION === */

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
            // Determine if content is YouTube (requires special handling)
            const isYouTubePage = pageUrl.includes('youtube_page.html');
            
            if (isYouTubePage) {
                // For YouTube, extract the inner container content
                const $html = $(data);
                const $youtubeContent = $html.find('#youtube-card-container').parent().html(); 
                $contentArea.html($youtubeContent);
                
                // Extract parameters from the URL
                const paramString = pageUrl.substring(pageUrl.indexOf('?') + 1);
                
                // Initialize the YouTube content using the script
                // We assume 'youtubeLoader.js' will be loaded separately or included here.
                if (typeof loadVids === 'function') {
                    // This assumes your old YouTube functions are now global or in this file
                    const params = paramString.split(',');
                    loadVids(params[0], params[1], params[2]);
                } else {
                    console.error("YouTube loading functions not found. Check youtubeLoader.js is included.");
                }

            } else {
                // For Posts and Certificates, just load the HTML fragment
                $contentArea.html(data);
            }

            // 3. Apply card logic after content is loaded
            handleCardView($contentArea);
            
            // 4. Re-initialize image modals (if defined globally)
            if (window.initializeImageModal) {
                window.initializeImageModal(); 
            }
        },
        error: function() {
            $contentArea.html('<div class="error-message">Could not load content. Please try again.</div>');
        }
    });
}


/* === CARD VIEW (Show More) LOGIC (Right Side Content) === */

/**
 * Finds all .card-list elements and applies the initial 10-item limit.
 */
function handleCardView($scope) {
    $scope.find('.card-list').each(function() {
        const $list = $(this);
        const $items = $list.children('.card-item'); // Target direct children with card-item class
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
 */
function toggleCardList($list, $button, initialLimit) {
    const isExpanded = $button.data('state') === 'expanded';
    const $items = $list.children('.card-item');
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

/* === YOUTUBE PLAYLIST CORE FUNCTIONS (YOUR ORIGINAL CODE ADAPTED) === */

// IMPORTANT: Your old YouTube script used a global 'PARAM'. Here we use arguments 
// passed from the loadContent function to make it work dynamically.
var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'  ; // Ensure your key is here
var URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

function loadVids(PL, Category, BKcol) {

    // Clear the grid first, as content is re-loaded dynamically
    $('#Grid').empty(); 

    var options = {
        part: 'snippet',
        key: key,
        maxResults: 20, // Request up to 20 videos
        playlistId: PL
    }

    $.getJSON(URL, options, function (data) {
        resultsLoop(data, Category, BKcol);
        
        // After loading videos, re-run the card view logic to handle 'Show More' if > 10
        handleCardView($('#content-area'));

    }).fail(function() {
        $('#Grid').html('<p class="error-message">Error loading YouTube playlist. Check API key and console for network issues.</p>');
    });
}
    
function resultsLoop(data, Cat, BKcol) {
    $.each(data.items, function (i, item) {

        // Skip any items without video ID
        if (!item.snippet.resourceId || !item.snippet.resourceId.videoId) return;

        var thumb = item.snippet.thumbnails.medium.url;
        var title = item.snippet.title;
        var desc = item.snippet.description.substring(0, 100) + '...';
        var vid = item.snippet.resourceId.videoId;

        $('#Grid').append(`
        <div data-uk-filter="${Cat}" class="card-item youtube-card-item" style="border-left-color: #${BKcol}">
            <a href="https://www.youtube.com/embed/${vid}" data-uk-lightbox data-lightbox-type="iframe">
               <img class="YTi" src="${thumb}" alt="${title}" >
               <h3>${title}</h3>
               <p>${desc}</p>
            </a>
        </div>
        `);
    });
}

// You can keep the old topFunction if you are using a button for it
function topFunction() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}
