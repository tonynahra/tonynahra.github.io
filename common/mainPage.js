var lastContentPage = 'tech-posts.html'; 

$(document).ready(function () {
    
    // 1. Initialize collapsible menu (runs once)
    initializeCollapsibleSections();
    
    // 2. Attach expand button listener (runs once)
    $('.expand-button').on('click', function() {
        toggleCollapsibleSection($(this));
    });
    
    // 3. ATTACH ALL EVENT LISTENERS (GLOBAL - ONCE)
    // We delegate all clicks from the 'body' so they work
    // on content that is loaded dynamically.

    // Listener for LEFT MENU
    $('body').on('click', '.nav-link', function(e) {
        e.preventDefault();
        
        // Update active state in the left menu
        if ($(this).closest('.profile-summary').length) {
            $('.nav-link').removeClass('active-nav');
            $(this).addClass('active-nav');
        }
        
        const pageUrl = $(this).data('page');
        
        // Store this as the "page to go back to"
        if (pageUrl && pageUrl.includes('.html') && !pageUrl.includes('guide.html') && !pageUrl.includes('about.html')) {
            lastContentPage = pageUrl; 
        }

        loadContent(pageUrl);
    });

    // Listener for ALL CARDS
    $('body').on('click', '.card-item, .item', function(e) {
        
        const $link = $(this).find('a').first(); 
        if (!$link.length) { return; } 

        // Don't do anything if the click was ON the link itself
        if (e.target.tagName === 'A' || $(e.target).closest('a').length) {
            return;
        }

        e.preventDefault(); 
        e.stopPropagation(); 
        
        const loadUrl = $link.attr('href');
        const $contentArea = $('#content-area');

        // 1. Find the card list page and hide it
        const $cardPage = $contentArea.find('.card-list-page').first();
        if ($cardPage.length) {
            $cardPage.hide();
        } else {
            console.warn("Could not find .card-list-page to hide.");
        }

        // 2. Create the "Back" and "Open" buttons
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

        // 3. Create a new wrapper for the loaded content
        const $contentWrapper = $('<div class="loaded-content-wrapper"></div>');
        $contentWrapper.html(backButtonHtml); // Add buttons first

        // 4. Determine content type and load it
        let loadType = $link.data('load-type');
        
        if (!loadType) {
            if (loadUrl.startsWith('http')) {
                loadType = 'iframe';
            } else if (/\.(jpg|jpeg|png|gif)$/i.test(loadUrl)) {
                loadType = 'image';
            } else {
                loadType = 'html';
            }
        }
        
        const customHeight = $link.data('height') || '85vh';

        switch (loadType) {
            case 'html':
                $.ajax({
                    url: loadUrl,
                    type: 'GET',
                    success: function(data) {
                        $contentWrapper.append(data); 
                    },
                    error: function() {
                        $contentWrapper.append('<div class="error-message">Could not load content.</div>');
                    },
                    complete: function() {
                        $contentArea.append($contentWrapper);
                    }
                });
                break;
            case 'image':
                const imgHtml = `<div class="image-wrapper"><img src="${loadUrl}" class="loaded-image" alt="Loaded content"></div>`;
                $contentWrapper.append(imgHtml);
                $contentArea.append($contentWrapper);
                break;
            case 'iframe':
                const iframeHtml = `<iframe src="${loadUrl}" class="loaded-iframe" style="height: ${customHeight};"></iframe>`;
                $contentWrapper.append(iframeHtml);
                $contentArea.append($contentWrapper);
                break;
            default:
                window.open(loadUrl, '_blank');
        }
    });

    // Listener for the "Back" button
    $('body').on('click', '.js-back-to-list', function() {
        const $contentArea = $('#content-area');
        
        // Remove the loaded content wrapper
        $contentArea.find('.loaded-content-wrapper').remove();
        
        // Show the hidden card list page (which still has its filters)
        $contentArea.find('.card-list-page').first().show();
    });

    // Listener for YouTube Search
    $('body').on('input', '#youtube-search-box', function() {
        filterYouTubeCards($(this).val());
    });

    // Listeners for Post Filters
    $('body').on('input', '#post-search-box', function() {
        filterPostCards();
    });
    $('body').on('change', '#post-category-filter', function() {
        filterPostCards();
    });
    
    // --- NEW: Listeners for Certificate Filters ---
    $('body').on('input', '#cert-search-box', function() {
        filterCertCards();
    });
    $('body').on('change', '#cert-category-filter', function() {
        filterCertCards();
    });
    // --- END NEW ---
    
    // --- NEW THEME SWITCHER LOGIC ---
    // Function to apply the theme
    function applyTheme(theme) {
        // Remove all possible theme classes
        $('body').removeClass('theme-light theme-pastel');
        
        // Add the specific theme class (if not dark)
        if (theme !== 'theme-dark') {
            $('body').addClass(theme);
        }
        
        // Save choice to localStorage
        localStorage.setItem('theme', theme);
        
        // Update active dot visual
        $('.theme-dot').removeClass('active');
        $(`.theme-dot[data-theme="${theme}"]`).addClass('active');
    }

    // Click handler for the theme dots
    $('body').on('click', '.theme-dot', function() {
        const theme = $(this).data('theme');
        applyTheme(theme);
    });

    // Apply saved theme on page load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Default to dark and set active dot
        $('.theme-dot[data-theme="theme-dark"]').addClass('active');
    }
    // --- END NEW THEME LOGIC ---

    // 4. Load initial content
    const initialPage = $('.nav-link.active-nav').data('page');
    if (initialPage) {
        lastContentPage = initialPage;
        loadContent(initialPage);
    }
});


/* === COLLAPSIBLE MENU LOGIC === */
function initializeCollapsibleSections() {
    $('.expand-button').each(function() {
        const $button = $(this);
        const targetId = $button.data('target');
        const $target = $('#' + targetId);
        const maxItems = parseInt($button.data('max') || 3);
        let $items = [];

        if ($target.hasClass('collapsible-content') && $target.find('a').length) {
            $items = $target.find('a'); 
        }

        if ($items.length > maxItems) {
            $items.slice(maxItems).addClass('hidden-item');
            const hiddenCount = $items.length - maxItems;
            $button.text(`Show More (${hiddenCount}) \u25BC`);
            $button.removeClass('expanded');
            $button.show();
        } else {
            $button.hide(); 
        }
    });
}

function toggleCollapsibleSection($button) {
    const targetId = $button.data('target');
    const $target = $('#' + targetId);
    const isExpanded = $button.hasClass('expanded');
    const maxItems = parseInt($button.data('max') || 3);
    
    let $items = [];
    if ($target.find('a').length) {
        $items = $target.find('a');
    }
    
    const hiddenCount = $items.length - maxItems;

    if (!isExpanded) {
        $items.slice(maxItems).removeClass('hidden-item');
        $button.text(`Show Less \u25B2`);
    } else {
        $items.slice(maxItems).addClass('hidden-item');
        $button.text(`Show More (${hiddenCount}) \u25BC`);
    }
    $target.toggleClass('expanded', !isExpanded);
    $button.toggleClass('expanded', !isExpanded);
}


/* === DYNAMIC CONTENT LOADING IMPLEMENTATION === */
function loadContent(pageUrl) {
    const $contentArea = $('#content-area');
    
    // 1. Explicitly EMPTY the content area. This destroys all old content
    //    and prevents any duplicates.
    $contentArea.empty();
    
    // 2. Add the spinner.
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading Content...</p></div>');

    // 3. NO MORE .on() or .off() LISTENERS HERE.
    //    All listeners are now handled globally in $(document).ready().

    $.ajax({
        url: pageUrl,
        type: 'GET',
        success: function(data) {
            // Replace spinner with new content
            $contentArea.html(data); 

            const isYouTubePage = pageUrl.includes('youtube_page.html');
            const isPostsPage = pageUrl.includes('posts.html'); 
            const isCertsPage = pageUrl.includes('certificates.html'); // <-- NEW CHECK
            
            if (isYouTubePage) {
                // Find parameters and call loadVids
                const paramString = pageUrl.substring(pageUrl.indexOf('?') + 1);
                const params = paramString.split(',');
                
                if (params.length === 3 && typeof loadVids === 'function') {
                    loadVids(params[0], params[1], params[2]);
                } else {
                    $contentArea.html('<div class="error-message">YouTube parameter error.</div>');
                }

            } else if (isPostsPage) {
                // Page is loaded, now set up the card pagination
                handleCardView($contentArea);
            
            } else if (isCertsPage) { // <-- NEW BLOCK
                // Page is loaded, now set up the card pagination
                handleCardView($contentArea);
            }
            // (About and Guide pages don't need any special logic here)


            // (re)Initialize any image popups
            if (typeof initializeImageModal === 'function') {
                initializeImageModal(); 
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $contentArea.html(`<div class="error-message">Could not load content from ${pageUrl}. Status: ${textStatus} (${errorThrown})</div>`);
        }
    });
}

/* === CARD VIEW (Show More) LOGIC === */
function handleCardView($scope) {
    $scope.find('.card-list').each(function() {
        const $list = $(this);
        const $items = $list.children('.card-item');
        const totalItems = $items.length;
        const initialLimit = 10;
        const increment = 10;
        
        // Remove any old button before adding a new one
        $list.next('.toggle-card-button').remove(); 
        
        if (totalItems > initialLimit) {
            // Hide all items after the limit
            $items.slice(initialLimit).addClass('hidden-card-item');
            const remaining = totalItems - initialLimit;
            
            const $button = $(`<button class="toggle-card-button">
                Show More (${remaining} more) \u25BC
            </button>`);
            
            // Store state on the button
            $button.data('visible-count', initialLimit);
            $button.data('increment', increment);
            $button.data('total-items', totalItems);
            
            // Attach a *direct* click handler (not delegated)
            $button.on('click', function() {
                showMoreCards($(this), $list); 
            });
            
            $list.after($button);
        }
    });
}

function showMoreCards($button, $list) {
    const $items = $list.children('.card-item');
    const totalItems = parseInt($button.data('total-items') || 0);
    const increment = parseInt($button.data('increment') || 10);
    const visibleCount = parseInt($button.data('visible-count') || 0);
    
    const newVisibleCount = visibleCount + increment;
    
    // Show the next batch
    $items.slice(visibleCount, newVisibleCount).removeClass('hidden-card-item');
    
    // Update button state
    $button.data('visible-count', newVisibleCount);
    
    const remaining = totalItems - newVisibleCount;
    
    if (remaining <= 0) {
        $button.hide();
    } else {
        $button.text(`Show More (${remaining} more) \u25BC`);
    }
}


/* === YOUTUBE PLAYLIST CORE FUNCTIONS === */
var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'; // Your API Key
var URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

function loadVids(PL, Category, BKcol) {
    $('#Grid').empty(); 
    
    var options = {
        part: 'snippet',
        key: key, 
        maxResults: 50, 
        playlistId: PL
    }

    $.getJSON(URL, options, function (data) {
        $('#playlist-title').text(`Youtubelist: ${Category.replace(/_/g, ' ')}`);
        $('#playlist-description').text(`The latest videos from the ${Category.replace(/_/g, ' ')} playlist.`);

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
        // Call pagination *after* videos are loaded
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
        var desc = item.snippet.description ? item.snippet.description.substring(0, 100) + '...' : 'No description available.';
        var vid = item.snippet.resourceId.videoId;

        $('#Grid').append(`
        <div data-uk-filter="${Cat}" class="card-item youtube-card-item" style="border-left-color: #${BKcol}">
            <a href="https://www.youtube.com/embed/${vid}" data-load-type="iframe">
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

/* === FILTERING LOGIC === */
function filterYouTubeCards(searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    const $grid = $('#Grid');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#youtube-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0) {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const title = $card.find('h3').text().toLowerCase();
            const desc = $card.find('p').text().toLowerCase();

            if (title.includes(searchTerm) || desc.includes(searchTerm)) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else {
                $card.hide();
            }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
        
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'));
    }
}

function filterPostCards() {
    const searchTerm = $('#post-search-box').val().toLowerCase();
    const selectedCategory = $('#post-category-filter').val();
    
    const $grid = $('#posts-card-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#posts-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategory = $card.data('category'); // e.g., "Python"
            const title = $card.find('h3').text().toLowerCase();
            const desc = $card.find('p').text().toLowerCase();

            // Check if matches category
            const categoryMatch = (selectedCategory === "all" || cardCategory === selectedCategory);
            // Check if matches search term
            const searchMatch = (searchTerm === "" || title.includes(searchTerm) || desc.includes(searchTerm));

            if (categoryMatch && searchMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else {
                $card.hide();
            }
        });
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
        
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'));
    }
}

// --- NEW FUNCTION for Certificate Filtering ---
function filterCertCards() {
    const searchTerm = $('#cert-search-box').val().toLowerCase();
    const selectedCategory = $('#cert-category-filter').val();
    
    const $grid = $('#cert-card-list');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#cert-no-results');
    
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all") {
        // A filter is active, so hide the "Show More" button.
        $showMoreButton.hide();

        $allCards.each(function() {
            const $card = $(this);
            // Get the *full* category string, e.g., "Data,SQL,BI"
            const cardCategories = $card.data('category'); 
            // Get the image alt text (or category span) to search
            const title = $card.find('img').attr('alt').toLowerCase();
            const categoryText = $card.find('.card-category').text();

            // --- UPDATED LOGIC ---
            // Check if the selected category (e.g., "SQL") is *in* the card's category string
            const categoryMatch = (selectedCategory === "all" || cardCategories.includes(selectedCategory));
            
            // Check if search term is in the title (alt text)
            const searchMatch = (searchTerm === "" || title.includes(searchTerm) || categoryText.includes(searchTerm));
            // --- END UPDATED LOGIC ---

            if (categoryMatch && searchMatch) {
                // This card matches.
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else {
                // This card does not match. Hide it.
                $card.hide();
            }
        });

        // Show or hide the "no results" message
        if (visibleCount === 0) { $noResultsMessage.show(); } 
        else { $noResultsMessage.hide(); }
        
    } else {
        // --- NO FILTERS ---
        // Search is empty AND category is "all", reset the view.
        $noResultsMessage.hide();
        
        // Remove all inline 'style' attributes (from .show()/.hide())
        $allCards.removeAttr('style'); 
        
        // Re-run handleCardView to reset pagination
        handleCardView($('#content-area'));
    }
}
