/* === COLLAPSIBLE CONTENT LOGIC === */

$(document).ready(function () {
    
    // Initialize all collapsible sections
    initializeCollapsibleSections();
    
    // Attach event listener to all expand buttons
    $('.expand-button').on('click', function() {
        toggleCollapsibleSection($(this));
    });
    
    // Your existing scroll-to-top logic
    mybutton = document.getElementById("myBtn");
    window.onscroll = function() {scrollFunction()};

    function scrollFunction() {
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            // Note: If you add an element with ID "myBtn" for scroll-to-top, it will show.
            // if (mybutton) { mybutton.style.display = "block"; } 
        } else {
            // if (mybutton) { mybutton.style.display = "none"; }
        }
    }
});


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

        // Posts list logic
        if ($target.hasClass('collapsible-content') && $target.find('.post-list').length) {
            $items = $target.find('.post-list > li:not(.placeholder)');
        } 
        // YouTube links (simple list) logic
        else if ($target.hasClass('collapsible-content') && $target.find('a').length) {
            // Use only anchor tags, excluding the section title link itself if present
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

    // Toggle the visual class for the content wrapper
    $target.toggleClass('expanded', !isExpanded);
    $button.toggleClass('expanded', !isExpanded);
    
    // Find all the list items to show/hide
    let $items = [];
    if ($target.find('.post-list').length) {
        $items = $target.find('.post-list > li:not(.placeholder)');
    } else if ($target.find('a').length) {
        $items = $target.find('a');
    }
    
    const hiddenCount = $items.length - maxItems;

    if (!isExpanded) {
        // EXPAND: Show all items and update button text/style
        $items.slice(maxItems).removeClass('hidden-item');
        $button.text(`Show Less \u25B2`); // Up arrow
        
        // Ensure the scroll transition is smooth
        // Note: For actual smooth collapse/expand, relying on CSS max-height transition is best.
        // The .expanded class with a high max-height handles the visible effect.
    } else {
        // COLLAPSE: Hide the items beyond the limit and revert button text/style
        $items.slice(maxItems).addClass('hidden-item');
        $button.text(`Show More (${hiddenCount}) \u25BC`); // Down arrow
    }
}


/* === YOUTUBE PLAYLIST LOGIC (Adopted from your code) === */

// Note: Ensure your API key is correct here.
var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'  ; 
var URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

// Your existing YouTube functions (for use on a separate page, e.g., /personal/index.html)
// Note: These functions are designed to run if PARAM is defined, which usually happens when 
// the URL contains parameters.

/*
if (typeof PARAM !== 'undefined') {
    var PARAMa = PARAM.split(","); 
    if ( PARAMa.length < 2 ) {
        PARAMa[1] = "general" ;
        PARAMa[2] = "ccc" ;
    }
    // You would call loadVids( PARAMa[0] , PARAMa[1] , PARAMa[2] ); on your /personal/ page
}
*/

// Renaming the functions for clarity if you were to use them on a separate YouTube page.
function loadVids(PL, Category, BKcol) {
    // ... (Your original loadVids logic remains here)
}

function resultsLoop(data, Cat, BKcol) {
    // ... (Your original resultsLoop logic remains here)
}


function topFunction() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}
