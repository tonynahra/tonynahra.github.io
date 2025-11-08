/* === GLOBAL SETUP & DYNAMIC CONTENT LOADING LOGIC === */

$(document).ready(function () {
    
    // 1. Initialize all collapsible sections (YouTube menu on the left)
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

/**
 * Loads content from a given URL into the #content-area.
 * @param {string} pageUrl - The URL of the content file (e.g., 'posts.html').
 */
function loadContent(pageUrl) {
    const $contentArea = $('#content-area');
    
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading Content...</p></div>');
    
    $.ajax({
        url: pageUrl,
        type: 'GET',
        success: function(data) {
            const isYouTubePage = pageUrl.includes('youtube_page.html');
            
            if (isYouTubePage) {
                $contentArea.html(data); 

                // --- ADD THIS EVENT LISTENER ---
                // We use .on() delegated to the contentArea
                // so it works even though the box was just loaded.
                $contentArea.on('keyup', '#youtube-search-box', function() {
                    filterYouTubeCards($(this).val());
                });
                // --- END ADD ---

                const paramString = pageUrl.substring(pageUrl.indexOf('?') + 1);
                const params = paramString.split(',');
                
                if (params.length === 3 && typeof loadVids === 'function') {
                    loadVids(params[0], params[1], params[2]);
                } else {
                    $contentArea.html('<div class="error-message">YouTube parameter error.</div>');
                }

            } else {
                // For Posts and Certificates, just load the HTML fragment
                $contentArea.html(data);
                handleCardView($contentArea);
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



/* === CARD VIEW (Show More) LOGIC (Right Side Content) === */

/**
 * Finds all .card-list elements and applies the initial 10-item limit.
 */
/* === CARD VIEW (Show More) LOGIC (Right Side Content) === */

/**
 * Finds all .card-list elements and applies the initial 10-item limit.
 */
function handleCardView($scope) {
    $scope.find('.card-list').each(function() {
        const $list = $(this);
        const $items = $list.children('.card-item');
        const totalItems = $items.length;
        const initialLimit = 10;
        const increment = 10;
        
        // Remove existing button just in case
        $list.next('.toggle-card-button').remove(); 
        
        if (totalItems > initialLimit) {
            // Hide all items after the limit
            $items.slice(initialLimit).addClass('hidden-card-item');
            
            const remaining = totalItems - initialLimit;
            
            // Create and append the "Show More" button
            const $button = $(`<button class="toggle-card-button">
                Show More (${remaining} more) \u25BC
            </button>`);
            
            // Store initial state on the button
            $button.data('visible-count', initialLimit);
            $button.data('increment', increment);
            $button.data('total-items', totalItems);
            
            // Attach the new click handler
            $button.on('click', function() {
                // Pass the button itself and the associated list
                showMoreCards($(this), $list); 
            });
            
            $list.after($button);
        }
    });
}

/**
 * Shows the next set of cards in a list (replaces toggleCardList).
 * @param {object} $button - The jQuery object of the toggle button.
 * @param {object} $list - The jQuery object of the card list container.
 */
function showMoreCards($button, $list) {
    const $items = $list.children('.card-item');

    // Use parseInt() to ensure all data is treated as a number
    const totalItems = parseInt($button.data('total-items') || 0);
    const increment = parseInt($button.data('increment') || 10);
    const visibleCount = parseInt($button.data('visible-count') || 0);
    
    const newVisibleCount = visibleCount + increment;
    
    const remaining = totalItems - newVisibleCount;

    // --- DIAGNOSTIC LOG ---
    // Open your browser console (F12) and look for this message when you click the button.
    console.log({
        message: "Calculating 'Show More'...",
        totalItems: totalItems,
        visibleSoFar: visibleCount,
        increment: increment,
        newVisibleTotal: newVisibleCount,
        remainingToShoW: remaining
    });
    // --- END LOG ---

    // Show the next batch of items
    $items.slice(visibleCount, newVisibleCount).removeClass('hidden-card-item');
    
    // Update the button's state
    $button.data('visible-count', newVisibleCount);
    
    if (remaining <= 0) {
        // This is the line that is firing too early.
        // The log above will tell us why.
        console.log("Hiding button because remaining is <= 0.");
        $button.hide();
    } else {
        // Update the button text with the new remaining count
        $button.text(`Show More (${remaining} more) \u25BC`);
    }
}


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

// IMPORTANT: REPLACE THIS KEY WITH YOUR ACTUAL, VALID YOUTUBE API KEY
var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'  ; 
var URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

function loadVids(PL, Category, BKcol) {
    $('#Grid').empty(); 
    $('#playlist-title').text(`Youtubelist: ${Category.replace(/_/g, ' ')}`);
    $('#playlist-description').text(`The latest videos from the ${Category.replace(/_/g, ' ')} playlist, displayed as cards.`);

    var options = {
        part: 'snippet',
        key: key, 
        maxResults: 200, 
        playlistId: PL
    }

    $.getJSON(URL, options, function (data) {
        if (data.error) {
             const errorMessage = `API Key/Access Error: ${data.error.message}. Check key restrictions.`;
             $('#Grid').html(`<p class="error-message">${errorMessage}</p>`);
             console.error("YouTube API Failure (JSON payload):", data.error);
             return; 
        }
        
        if (!data.items || data.items.length === 0) {
             $('#Grid').html(`<p class="error-message">Playlist is valid but contains no public videos.</p>`);
             console.warn("YouTube API Warning: Playlist has no items.", data);
             return;
        }

        resultsLoop(data, Category, BKcol);
        
        // This is now the *only* call for YouTube, 
        // and it runs *after* the grid is populated.
        handleCardView($('#content-area'));

    }).fail(function(jqXHR, textStatus, errorThrown) {
        const errorMessage = `API Error (Hard): ${jqXHR.status} - ${errorThrown}.`;
        $('#Grid').html(`<p class="error-message">${errorMessage}</p>`);
    });
}


    
function resultsLoop(data, Cat, BKcol) {
    $.each(data.items, function (i, item) {

        if (!item.snippet.resourceId || !item.snippet.resourceId.videoId) return;

        var thumb = item.snippet.thumbnails.medium.url;
        var title = item.snippet.title;
        // Check if description exists before substring
        var desc = item.snippet.description ? item.snippet.description.substring(0, 100) + '...' : 'No description available.';
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

function topFunction() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

/**
 * Filters the YouTube cards based on a search term.
 * @param {string} searchTerm - The text to filter by.
 */
function filterYouTubeCards(searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    const $grid = $('#Grid');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#youtube-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0) {
        // When searching, hide the "Show More" button
        $showMoreButton.hide();

        $allCards.each(function() {
            const $card = $(this);
            const title = $card.find('h3').text().toLowerCase();
            const desc = $card.find('p').text().toLowerCase();

            if (title.includes(searchTerm) || desc.includes(searchTerm)) {
                $card.show();
                visibleCount++;
            } else {
                $card.hide();
            }
        });

        // Show or hide the "no results" message
        if (visibleCount === 0) {
            $noResultsMessage.show();
        } else {
            $noResultsMessage.hide();
        }
        
    } else {
        // Search is empty, reset the view
        $noResultsMessage.hide();
        $allCards.show(); // Show all cards
        
        // Re-run handleCardView to reset the "Show More" button/logic
        handleCardView($('#content-area'));
    }
}

