var lastContentPage = 'tech-posts.html';

$(document).ready(function () {
    
    // 1. Initialize collapsible menu
    initializeCollapsibleSections();
    
    // 2. Attach expand button listener
    $('.expand-button').on('click', function() {
        toggleCollapsibleSection($(this));
    });
    
    // 3. *** THIS IS THE FIX ***
    // We change $('.nav-link').on('click', ...) 
    // to $('body').on('click', ...)
    // This uses event delegation, so it works for the dynamic "Back" button.
    $('body').on('click', '.nav-link', function(e) {
        e.preventDefault();
        
        // Update active state in the left menu
        // (We only do this for links *in* the left menu)
        if ($(this).closest('.profile-summary').length) {
            $('.nav-link').removeClass('active-nav');
            $(this).addClass('active-nav');
        }
        
        // Load the new content
        const pageUrl = $(this).data('page');
        
        // Store this as the "page to go back to"
        if (pageUrl && pageUrl !== 'guide.html' && pageUrl !== 'about.html') {
            lastContentPage = pageUrl; 
        }

        loadContent(pageUrl);
    });
    // --- END FIX ---

    // 4. *** THIS HANDLER IS REPLACED ***
    // Click handler for all cards (posts and youtube)
    $('#content-area').on('click', '.card-item, .item', function(e) {
        
        // Find the first <a> tag inside the card
        const $link = $(this).find('a').first(); 
        
        if (!$link.length) { return; }

        e.preventDefault(); 
        e.stopPropagation(); 
        
        let loadType = $link.data('load-type'); // 'let' so we can change it
        const loadUrl = $link.attr('href');
        const $contentArea = $('#content-area'); 

        // --- NEW: Default loadType if not specified ---
        if (!loadType) {
            if (loadUrl.startsWith('http')) {
                loadType = 'iframe';
            } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(loadUrl)) {
                loadType = 'image';
            } else {
                // Assume it's a local HTML fragment
                loadType = 'html';
            }
        }
        // --- END NEW ---

        // --- NEW: Back Button HTML now includes "Open in new window" ---
        const backButtonHtml = `
            <div class="back-button-wrapper">
                <a href="javascript:void(0)" class="nav-link" data-page="${lastContentPage}">
                    &larr; Back
                </a>
                <a href="${loadUrl}" class="open-new-window" target="_blank" rel="noopener noreferrer">
                    Open in new window &nearr;
                </a>
            </div>
        `;
        // --- END NEW ---

        const customHeight = $link.data('height') || '85vh';
            
        $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading Content...</p></div>');

        switch (loadType) {
            case 'html':
                $.ajax({
                    url: loadUrl,
                    type: 'GET',
                    success: function(data) {
                        $contentArea.html(backButtonHtml + data);
                    },
                    error: function() {
                        $contentArea.html(backButtonHtml + '<div class="error-message">Could not load content.</div>');
                    }
                });
                return; 
            case 'image':
                const imgHtml = `
                    <div class="image-wrapper">
                        <img src="${loadUrl}" class="loaded-image" alt="Loaded content">
                    </div>`;
                $contentArea.html(backButtonHtml + imgHtml);
                break;
            case 'iframe':
                const iframeHtml = `<iframe src="${loadUrl}" class="loaded-iframe" style="height: ${customHeight};"></iframe>`;
                $contentArea.html(backButtonHtml + iframeHtml);
                break;
            default:
                // This will now catch any unhandled types
                $contentArea.html(backButtonHtml + '<div class="error-message">Error: Unknown content type.</div>');
        }
    });
    // --- END OF REPLACED HANDLER ---
    
    // 5. Load initial content
    const initialPage = $('.nav-link.active-nav').data('page');
    if (initialPage) {
        lastContentPage = initialPage;
        loadContent(initialPage);
    }
});


/* === COLLAPSIBLE MENU LOGIC (Left Side YouTube Menu) === */
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
    
    $contentArea.html('<div class="content-loader"><div class="spinner"></div><p>Loading Content...</p></div>');
    
    $.ajax({
        url: pageUrl,
        type: 'GET',
        success: function(data) {
            const isYouTubePage = pageUrl.includes('youtube_page.html');
            const isPostsPage = pageUrl.includes('posts.html'); 
            
            if (isYouTubePage) {
                $contentArea.html(data); 
                $contentArea.on('input', '#youtube-search-box', function() {
                    filterYouTubeCards($(this).val());
                });

                const paramString = pageUrl.substring(pageUrl.indexOf('?') + 1);
                const params = paramString.split(',');
                
                if (params.length === 3 && typeof loadVids === 'function') {
                    loadVids(params[0], params[1], params[2]);
                } else {
                    $contentArea.html('<div class="error-message">YouTube parameter error.</div>');
                }

            } else {
                $contentArea.html(data);
                
                if (isPostsPage) {
                    $contentArea.on('input', '#post-search-box', function() {
                        filterPostCards();
                    });
                    $contentArea.on('change', '#post-category-filter', function() {
                        filterPostCards();
                    });
                }
                
                if (!pageUrl.includes('about.html') && !pageUrl.includes('guide.html')) {
                    handleCardView($contentArea);
                }
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

function loadHtmlFragment(pageUrl, $contentArea) {
    $.ajax({
        url: pageUrl,
        type: 'GET',
        success: function(data) {
            // This is used by the 'Back' button logic, so we just show data
            $contentArea.html(data);
        },
        error: function() {
            $contentArea.html('<div class="error-message">Could not load content. The file may be missing.</div>');
        }
    });
}


/* === CARD VIEW (Show More) LOGIC (Right Side Content) === */
function handleCardView($scope) {
    $scope.find('.card-list').each(function() {
        const $list = $(this);
        const $items = $list.children('.card-item');
        const totalItems = $items.length;
        const initialLimit = 10;
        const increment = 10;
        
        $list.next('.toggle-card-button').remove(); 
        
        if (totalItems > initialLimit) {
            $items.slice(initialLimit).addClass('hidden-card-item');
            const remaining = totalItems - initialLimit;
            
            const $button = $(`<button class="toggle-card-button">
                Show More (${remaining} more) \u25BC
            </button>`);
            
            $button.data('visible-count', initialLimit);
            $button.data('increment', increment);
            $button.data('total-items', totalItems);
            
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
    
    $items.slice(visibleCount, newVisibleCount).removeClass('hidden-card-item');
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

        // Ensure class is "card-item"
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
            const cardCategory = $card.data('category');
            const title = $card.find('h3').text().toLowerCase();
            const desc = $card.find('p').text().toLowerCase();

            const categoryMatch = (selectedCategory === "all" || cardCategory === selectedCategory);
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
