/* === GLOBAL VARIABLES === */
var currentCardList = []; 
var currentCardIndex = 0; 
var isModalInfoVisible = false; 

/* === HELPER FUNCTIONS (Global Scope) === */

function decodeText(text) {
    if (!text) return "";
    try {
        var $textarea = $('<textarea></textarea>');
        $textarea.html(text);
        return $textarea.val();
    } catch (e) {
        return text;
    }
}

/* === VIEW HELPERS (Global Scope) === */

function handleCardView($scope, initialLoadOverride, incrementOverride) {
    $scope.find('.card-list').each(function() {
        const $list = $(this);
        const $items = $list.children('.card-item');
        const totalItems = $items.length;
        const initialLimit = parseInt(initialLoadOverride) || 10;
        const increment = parseInt(incrementOverride) || 10; 
        
        $list.next('.toggle-card-button').remove(); 
        
        if (totalItems > initialLimit) {
            $items.slice(initialLimit).addClass('hidden-card-item');
            const remaining = totalItems - initialLimit;
            const $button = $(`<button class="toggle-card-button">Show More (${remaining} more) \u25BC</button>`);
            
            $button.data({
                'visible-count': initialLimit, 
                'increment': increment, 
                'total-items': totalItems
            });
            // Note: The click listener for this button is delegated in mainPage.js or the bottom of this file
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

/* === MODAL LOGIC (Global Scope) === */

function handleModalKeys(e) {
    if (!$('#content-modal').is(':visible')) {
        $(document).off('keydown.modalNav');
        return;
    }
    if ($(e.target).is('input, textarea, select')) return;

    switch (e.key) {
        case "Escape": $('.modal-close-btn').first().click(); break;
        case "ArrowLeft": $('.modal-prev-btn').first().click(); break;
        case "ArrowRight": $('.modal-next-btn').first().click(); break;
        case " ": e.preventDefault(); $('.modal-next-btn').first().click(); break;
        case "i": e.preventDefault(); $('.modal-info-btn').first().click(); break;
    }
}

// ... (Keep global variables and helper functions like decodeText) ...

function loadModalContent(index) {
    if (index < 0 || index >= currentCardList.length) {
        return;
    }

    const $link = currentCardList[index];
    if (!$link.length) return;
    
    currentCardIndex = index;
    
    const $modal = $('#content-modal');
    const $modalContent = $('#modal-content-area');
    const $modalOpenLink = $modal.find('.open-new-window');
    const $modalInfoBtn = $modal.find('.modal-info-btn');

    $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>');
    
    // CHANGED: Use 'let' instead of 'const' so we can modify the URL if needed
    let loadUrl = $link.attr('href');
    let loadType = $link.data('load-type');
    const jsonUrl = $link.data('json-url');
    const manifestUrl = $link.data('manifest-url');
    
    // 1. Research Logic
    if (loadType === 'research' && jsonUrl) {
        $modal.addClass('research-mode'); 
        $modalOpenLink.attr('href', jsonUrl); 
        buildResearchModal(jsonUrl); 
        return; 
    } 
    
    // 2. Tutorial Logic
    if (loadType === 'tutorial' && manifestUrl) {
        $modal.addClass('research-mode'); 
        $modalOpenLink.attr('href', manifestUrl);
        
        const playerHtml = `
            <div class="iframe-wrapper" style="height: 100%; width: 100%;">
                <iframe src="tutorial_player.html?manifest=${encodeURIComponent(manifestUrl)}" class="loaded-iframe" style="border: none; width: 100%; height: 100%;"></iframe>
            </div>
            <button class="modal-close-btn" style="position: absolute; top: 10px; right: 10px; z-index: 2000; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 1.2rem;">&times;</button>
        `;
        $modalContent.html(playerHtml);
        $modalContent.find('.modal-close-btn').on('click', function() { $('.modal-close-btn').first().click(); });
        return;
    }

    // 3. Standard Logic
    $modal.removeClass('research-mode'); 
    // We keep the ORIGINAL link for the "Open in new window" button (user friendly)
    $modalOpenLink.attr('href', loadUrl); 
    $modalContent.find('.modal-photo-info').remove();
    $modalInfoBtn.hide(); 
    
    // === AUTO DETECT TYPE ===
    if (!loadType) {
        if (/\.(jpg|jpeg|png|gif)$/i.test(loadUrl)) {
            loadType = 'image';
        } else if (/\.md$/i.test(loadUrl)) {
            loadType = 'markdown';
        } else if (/\.pgn$/i.test(loadUrl)) {
            loadType = 'chess';
        } else if (loadUrl.endsWith('.html')) {
            loadType = 'html';
        } else if (loadUrl.startsWith('http')) {
            if (loadUrl.includes('github.com') || loadUrl.includes('google.com')) {
                loadType = 'blocked'; 
            } else {
                loadType = 'iframe';
            }
        } else {
            loadType = 'newtab'; 
        }
    }

    // === NEW: GitHub Link Fixer ===
    // If we are fetching data (Markdown or Chess) from GitHub, 
    // we must use the "raw" domain to avoid CORS errors.
    if ((loadType === 'markdown' || loadType === 'chess') && loadUrl.includes('github.com') && loadUrl.includes('/blob/')) {
        loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    const customHeight = $link.data('height') || '90vh';
    
    const $card = $link.closest('.card-item');
    const title = $card.find('h3').text() || $card.find('img').attr('alt');
    const desc = $card.find('p').text();
    let infoHtml = '';

    if (title) {
        const infoVisibleClass = isModalInfoVisible ? 'info-visible' : '';
        infoHtml = `
            <div class="modal-photo-info ${infoVisibleClass}">
                <h3>${title}</h3>
                <p>${desc}</p>
            </div>`;
    }

    switch (loadType) {
        case 'markdown':
            $.ajax({
                url: loadUrl, type: 'GET',
                dataType: 'text',
                success: function(markdownText) { 
                    const htmlContent = typeof marked !== 'undefined' 
                        ? marked.parse(markdownText) 
                        : '<p>Error: Marked.js library not loaded.</p>' + markdownText;
                    
                    // CHANGED: Wrapped in .markdown-wrapper
                    $modalContent.html(`
                        <div class="markdown-wrapper">
                            <div class="markdown-body" style="padding: 20px; background: white; max-width: 800px; margin: 0 auto;">
                                ${htmlContent}
                            </div>
                        </div>
                    `);
                    if (infoHtml) { $modalContent.append(infoHtml); $modalInfoBtn.show(); }
                },
                                
                error: function() { $modalContent.html('<div class="error-message">Could not load Markdown file. (Check CORS/URL)</div>'); }
            });
            break;







case 'chess':
            // Fix GitHub CORS
            if (loadUrl.includes('github.com') && loadUrl.includes('/blob/')) {
                loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            }

            $.ajax({
                url: loadUrl, 
                dataType: 'text',
                success: function(pgnFileContent) {
                    let rawGames = pgnFileContent.split(/(?=\[Event ")/g).filter(g => g.trim().length > 0);
                    if (rawGames.length === 0) rawGames = [pgnFileContent]; 

                    const boardId = 'chess-board-' + Date.now();
                    const styleId = 'chess-dynamic-styles-' + Date.now();
                    
                    // State Variables
                    let currentFontSize = 26; 
                    let commentsEnabled = false;

                    // 1. INJECT HTML
                    // We include the <style> tag here to hold our dynamic rules
                    $modalContent.html(`
                        <style id="${styleId}"></style>
                        <div class="chess-container">
                            <div class="chess-toolbar">
                                <select id="chess-game-select"></select>
                                <button id="chess-info-btn" class="tab-button" style="border: 1px solid var(--text-light); padding: 5px 10px; margin-right: 10px;">Info</button>
                                
                                <button id="chess-font-minus" class="tab-button" style="border: 1px solid var(--text-light); padding: 5px 10px; min-width: 30px; cursor: pointer; font-weight: bold;">-</button>
                                <button id="chess-font-plus" class="tab-button" style="border: 1px solid var(--text-light); padding: 5px 10px; min-width: 30px; margin-right: 10px; cursor: pointer; font-weight: bold;">+</button>
                                
                                <button id="chess-comment-btn" class="tab-button" style="border: 1px solid var(--text-light); padding: 5px 10px; cursor: pointer;">Comments: Off</button>
                            </div>
                            <div class="chess-main-area">
                                <div class="chess-white-box">
                                    <div id="${boardId}"></div>
                                </div>
                                <div id="chess-comment-overlay" class="chess-comment-overlay"></div>
                                <div id="chess-metadata-${boardId}" class="chess-metadata-overlay"></div>
                            </div>
                        </div>
                    `);

                    // --- THE FONT FIX ---
                    // This function rewrites the CSS rules whenever the variable changes.
                    // This persists even if the library re-renders the board.
                    const updateFontSize = () => {
                        console.log("Updating CSS to Font Size:", currentFontSize);
                        
                        const cssRules = `
                            /* 1. Layout Fixes: Keep board and moves side-by-side */
                            #${boardId} .pgnvjs-wrapper {
                                display: flex !important;
                                flex-direction: row !important;
                                align-items: flex-start !important;
                                gap: 0 !important;
                            }
                            
                            /* 2. Moves Panel Container */
                            #${boardId} .pgnvjs-moves {
                                width: 300px !important;
                                min-width: 300px !important;
                                max-width: 300px !important;
                                height: 100% !important;
                                overflow-y: auto !important;
                                background-color: #ffffff !important;
                                color: #000000 !important;
                                padding: 15px !important;
                                box-sizing: border-box !important;
                                border-left: 4px solid #d2b48c !important;
                                margin: 0 !important; /* Prevent pushing to right */
                            }

                            /* 3. THE TEXT SIZE (Applies to all inner elements) */
                            #${boardId} .pgnvjs-moves * {
                                font-size: ${currentFontSize}px !important;
                                line-height: ${currentFontSize + 10}px !important;
                                color: #000000 !important;
                                font-family: sans-serif !important;
                                font-weight: 600 !important;
                            }
                            
                            /* 4. Link Specifics */
                            #${boardId} .pgnvjs-moves a {
                                text-decoration: none !important;
                                display: inline-block !important;
                                padding: 2px 5px !important;
                            }
                            
                            /* 5. Active Highlight */
                            #${boardId} .pgnvjs-move.active, 
                            #${boardId} .pgnvjs-move.active a {
                                background-color: #FFD700 !important;
                                color: #000 !important;
                            }
                        `;
                        
                        $(`#${styleId}`).text(cssRules);
                    };

                    // --- BIND BUTTONS ---
                    // We bind directly to the elements to avoid bubbling issues
                    document.getElementById('chess-font-minus').onclick = function(e) {
                        e.preventDefault(); 
                        e.stopPropagation();
                        if (currentFontSize > 14) {
                            currentFontSize -= 2;
                            updateFontSize();
                        }
                    };

                    document.getElementById('chess-font-plus').onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        currentFontSize += 2;
                        updateFontSize();
                    };

                    document.getElementById('chess-comment-btn').onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        commentsEnabled = !commentsEnabled;
                        const $btn = $(this);
                        const $overlay = $('#chess-comment-overlay');
                        
                        if (commentsEnabled) {
                            $btn.text('Comments: On');
                            $btn.css('background', 'var(--text-accent)').css('color', 'var(--bg-dark)');
                            if ($overlay.text().trim().length > 0) $overlay.fadeIn();
                        } else {
                            $btn.text('Comments: Off');
                            $btn.css('background', '').css('color', '');
                            $overlay.fadeOut();
                        }
                    };

                    // --- RENDER LOGIC ---
                    const $select = $('#chess-game-select');
                    rawGames.forEach((gamePgn, idx) => {
                        const white = (gamePgn.match(/\[White "(.*?)"\]/) || [])[1] || '?';
                        const black = (gamePgn.match(/\[Black "(.*?)"\]/) || [])[1] || '?';
                        const result = (gamePgn.match(/\[Result "(.*?)"\]/) || [])[1] || '*';
                        $select.append(`<option value="${idx}">${idx + 1}. ${white} vs ${black} (${result})</option>`);
                    });
                    if (rawGames.length <= 1) $select.hide(); 

                    let gameObserver = null;

                    function renderGame(index) {
                        if (gameObserver) gameObserver.disconnect();

                        const selectedPgn = rawGames[index];
                        
                        // Metadata
                        const headers = {};
                        const headerRegex = /\[([A-Za-z0-9]+)\s+"(.*?)"\]/g;
                        let match;
                        while ((match = headerRegex.exec(selectedPgn)) !== null) { headers[match[1]] = match[2]; }
                        let infoHtml = '<h4>Game Details</h4><table>';
                        for (const [key, val] of Object.entries(headers)) {
                            if(['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result', 'ECO'].includes(key)) {
                                infoHtml += `<tr><td>${key}</td><td>${val}</td></tr>`;
                            }
                        }
                        infoHtml += '</table><br><button class="overlay-close-btn" onclick="$(this).parent().fadeOut()">Close</button>';
                        $(`#chess-metadata-${boardId}`).html(infoHtml);

                        // Size Calculation
                        const availableHeight = $('.chess-main-area').height() || 600;
                        const availableWidth = $('.chess-main-area').width() || 800;
                        const movesPanelSpace = 320; // 300px width + 20px gap
                        
                        let calculatedBaseSize = Math.min(availableHeight - 60, availableWidth - movesPanelSpace - 40);
                        const boardSize = calculatedBaseSize * 0.95; 

                        $(`#${boardId}`).empty();

                        if (typeof PGNV !== 'undefined') {
                            PGNV.pgnView(boardId, { 
                                pgn: selectedPgn, 
                                theme: 'brown', 
                                boardSize: boardSize, 
                                layout: 'left',
                                width: '100%',
                                headers: false,
                            });
                            
                            // APPLY STYLES IMMEDIATELY
                            updateFontSize();

                            // --- OBSERVER (Comments) ---
                            // We use a broader selector interval to find the panel once it renders
                            const findPanelInterval = setInterval(() => {
                                const movesPanel = document.querySelector(`#${boardId} .pgnvjs-moves`);
                                const overlay = document.getElementById('chess-comment-overlay');
                                
                                if (movesPanel) {
                                    clearInterval(findPanelInterval);
                                    
                                    // Start observing for active moves
                                    gameObserver = new MutationObserver(() => {
                                        const activeMove = movesPanel.querySelector('.pgnvjs-move.active'); 
                                        if (activeMove) {
                                            let commentText = "";
                                            let next = activeMove.nextElementSibling;
                                            while(next && !next.classList.contains('pgnvjs-move')) {
                                                if (next.classList.contains('pgnvjs-comment')) {
                                                    commentText += " " + next.textContent;
                                                }
                                                next = next.nextElementSibling;
                                            }

                                            if (commentText && commentText.trim().length > 0) {
                                                overlay.textContent = commentText;
                                                if (commentsEnabled) $(overlay).show();
                                            } else {
                                                $(overlay).hide();
                                            }
                                        }
                                    });
                                    gameObserver.observe(movesPanel, { 
                                        attributes: true, 
                                        subtree: true, 
                                        childList: true, 
                                        attributeFilter: ['class'] 
                                    });
                                }
                            }, 500);
                        } else {
                            $(`#${boardId}`).html('<div class="error-message">PGN Library not loaded.</div>');
                        }
                    }

                    // Listeners
                    renderGame(0);
                    $select.off('change').on('change', function() { renderGame($(this).val()); });
                    $('#chess-info-btn').off('click').on('click', function() { 
                        $(`#chess-metadata-${boardId}`).fadeToggle(); 
                    });

                },
                error: function() { 
                    $modalContent.html('<div class="error-message">Could not load PGN file.</div>'); 
                }
            });
            break;

















            
            
        case 'html':
            $.ajax({
                url: loadUrl, type: 'GET',
                success: function(data) { 
                    $modalContent.html(data); 
                    if (infoHtml) { $modalContent.append(infoHtml); $modalInfoBtn.show(); }
                },
                error: function() { $modalContent.html('<div class="error-message">Could not load content.</div>'); }
            });
            break;
        case 'image':
            $modalContent.html(`
                <div class="image-wrapper">
                    <img src="${loadUrl}" class="loaded-image" alt="Loaded content">
                    ${infoHtml}
                </div>`);
            if (infoHtml) { $modalInfoBtn.show(); }
            break;
        case 'iframe':
            $modalContent.html(`
                <div class="iframe-wrapper">
                    <iframe src="${loadUrl}" class="loaded-iframe" style="height: ${customHeight};"></iframe>
                    ${infoHtml}
                </div>`);
            if (infoHtml) { $modalInfoBtn.show(); }
            break;
        case 'blocked':
            $modalContent.html('<div class="error-message">This site blocks embedding. Please use "Open in new window".</div>');
            break;
        default: 
            $modalContent.html('<div class="error-message">This link cannot be opened here. Please use the "Open in new window" button.</div>');
            break;
    }
    
    $('.modal-prev-btn').prop('disabled', index <= 0);
    $('.modal-next-btn').prop('disabled', index >= currentCardList.length - 1);
}
/* === RESEARCH BUILDER (Uses Main Header) === */

function buildResearchModal(jsonUrl) {
    const $modalContent = $('#modal-content-area');
    
    // Only inject the TABS, not a new header
    const researchHtml = `
        <div class="tab-nav" id="research-tab-nav-modal"></div>
        <div class="tab-content" id="research-tab-content-modal">
            <div class="content-loader"><div class="spinner"></div></div>
        </div>
    `;
    $modalContent.html(researchHtml);

    $.getJSON(jsonUrl, function (data) {
        // Update the MAIN modal open link
        $('#content-modal .open-new-window').attr('href', jsonUrl);
        
        const $tabNav = $('#research-tab-nav-modal');
        $tabNav.empty(); 
        
        $.each(data.tickers, function(index, ticker) {
            const $button = $(`<button class="tab-button"></button>`);
            $button.text(ticker.name);
            $button.attr('data-content-url', ticker.contentUrl);
            
            if (index === 0) {
                $button.addClass('active');
                loadModalTabContent(ticker.contentUrl);
            }
            $tabNav.append($button);
        });
    }).fail(function() {
        $modalContent.html('<div class="error-message">Error loading research data.</div>');
    });
}

function loadModalTabContent(htmlUrl) {
    // Update the main "Open in new window" link to the current tab
    $('#content-modal .open-new-window').attr('href', htmlUrl);

    const $target = $('#research-tab-content-modal');
    $target.html(`<div class="iframe-wrapper"><iframe src="${htmlUrl}" class="loaded-iframe"></iframe></div>`);
}

/* === FILTER LOGIC (Standard) === */

function populateCategoryFilter(listId, filterId) {
    const $filter = $(filterId);
    if (!$filter.length) return;

    const categoryCounts = {};
    $(`${listId} .card-item`).each(function() {
        const categories = $(this).data('category');
        if (categories) {
            String(categories).split(',').forEach(cat => {
                const cleanCat = cat.trim();
                if (cleanCat) categoryCounts[cleanCat] = (categoryCounts[cleanCat] || 0) + 1;
            });
        }
    });

    const sortedCategories = Object.entries(categoryCounts).sort(([,a], [,b]) => b - a);
    $filter.children('option:not(:first)').remove(); 
    sortedCategories.forEach(([key, count]) => {
        $filter.append($('<option>', { value: key, text: `${key} (${count})` }));
    });
}

function populateSmartKeywords(listId, filterId) {
    const $filter = $(filterId);
    if (!$filter.length) return; 
    
    const stop = (typeof STOP_WORDS !== 'undefined') ? STOP_WORDS : new Set(['a', 'the']);
    const replace = (typeof REPLACEMENT_MAP !== 'undefined') ? REPLACEMENT_MAP : {};

    const wordCounts = {}; 
    $(`${listId} .card-item`).each(function() {
        const localKeywords = new Set();
        const $card = $(this);
        const text = [
            $card.find('h3').text(), $card.find('p').text(),
            $card.find('.card-category').text(), $card.find('img').attr('alt'),
            $card.data('category'), $card.data('keywords')
        ].map(t => String(t||'')).join(' ');
        
        const words = decodeText(text).split(/[^a-zA-Z0-9'-]+/);
        
        words.forEach(word => {
            let clean = word.toLowerCase().trim().replace(/[^a-z0-9]/gi, '');
            if (replace[clean]) clean = replace[clean];
            if (clean.length > 2 && clean.length <= 15 && !stop.has(clean) && isNaN(clean)) {
                localKeywords.add(clean);
            }
        });
        localKeywords.forEach(k => wordCounts[k] = (wordCounts[k] || 0) + 1);
    });

    const sorted = Object.entries(wordCounts).sort(([,a], [,b]) => b - a).slice(0, 30);
    $filter.children('option:not(:first)').remove();
    sorted.forEach(([key, count]) => {
        const display = key.length > 15 ? key.substring(0, 15) + '...' : key;
        $filter.append($('<option>', { value: key, text: `${display} (${count})` }));
    });
}

function getCardSearchableText($card) {
    const textSources = [
        $card.find('h3').text(), $card.find('p').text(),
        $card.find('.card-category').text(), $card.find('img').attr('alt'),
        $card.data('category'), $card.data('keywords')
    ];
    return decodeText(textSources.map(text => String(text || '')).join(' ').toLowerCase());
}

function checkKeywordMatch(cardText, selectedKeyword) {
    if (selectedKeyword === "all") return true;
    const synonyms = (typeof SYNONYM_MAP !== 'undefined') ? (SYNONYM_MAP[selectedKeyword] || []) : [];
    const keywordsToMatch = [selectedKeyword, ...synonyms];
    
    return keywordsToMatch.some(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'i'); 
        return regex.test(cardText);
    });
}

function filterCardsGeneric(listId, searchId, catFilterId, keyFilterId, noResultsId, initialLoad) {
    const searchTerm = decodeText($(searchId).val().toLowerCase());
    const selectedCategory = $(catFilterId).val();
    const selectedKeyword = $(keyFilterId).val();
    const $grid = $(listId);
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $(noResultsId);
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardCategory = $card.data('category'); 
            const cardText = getCardSearchableText($card); 
            
            const categoryMatch = (selectedCategory === "all" || String(cardCategory).includes(selectedCategory));
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword);

            if (categoryMatch && searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) $noResultsMessage.show(); else $noResultsMessage.hide();
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), initialLoad);
    }
}

/* === LOAD DATA FUNCTIONS === */

function loadPhotoAlbum(jsonUrl, initialLoadOverride, incrementOverride) {
    const $albumList = $('#photo-album-list');
    const $targetList = $albumList.length ? $albumList : $('#about-album-list');
    
    $.getJSON(jsonUrl, function (albumData) {
        if ($('#album-title').length) {
            $('#album-title').text(decodeText(albumData.albumTitle));
        }
        
        $targetList.empty(); 
        
        $.each(albumData.photos, function(index, photo) {
            const title = decodeText(photo.title);
            const category = decodeText(photo.category);
            const description = decodeText(photo.description);
            
            const cardHtml = `
                <div class="card-item" 
                     data-category="${category}" 
                     data-keywords="${title},${description}"
                     data-title="${title}"
                     data-desc="${description}">
                    <a href="${photo.url}" data-load-type="image">
                        <img src="${photo.thumbnailUrl}" loading="lazy" class="card-image" alt="${title}">
                    </a>
                </div>`;
            $targetList.append(cardHtml);
        });
        
        if ($('#album-category-filter').length) {
            populateCategoryFilter('#photo-album-list', '#album-category-filter');
            populateSmartKeywords('#photo-album-list', '#album-keyword-filter');
        }
        
        const defaultIncrement = $targetList.attr('id') === 'about-album-list' ? 20 : 10;
        const increment = incrementOverride || defaultIncrement;
        
        handleCardView($targetList.parent(), initialLoadOverride, increment);
        
    }).fail(function() { 
        if ($('#album-title').length) $('#album-title').text("Error Loading Album"); 
    });
}

function loadVids(PL, Category, BKcol, initialLoadOverride) {
    $('#Grid').empty();
    var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'; // Note: Ensure you restrict this key in Google Cloud Console
    
    // Step 1: Get the Playlist Items
    var playlistURL = 'https://www.googleapis.com/youtube/v3/playlistItems';
    var playlistOptions = { 
        part: 'snippet,contentDetails', // Added contentDetails to get clean video IDs
        key: key, 
        maxResults: 50, 
        playlistId: PL 
    };

    $.getJSON(playlistURL, playlistOptions, function (data) {
        $('#playlist-title').text(`Youtubelist: ${Category.replace(/_/g, ' ')}`);

        if (data.items && data.items.length > 0) {
            
            // Step 2: Extract Video IDs into a comma-separated string
            // distinct from the playlist Item ID
            var videoIds = data.items.map(function(item) {
                return item.contentDetails.videoId; 
            }).join(',');

            // Step 3: Verify Status with Videos Endpoint
            var videoURL = 'https://www.googleapis.com/youtube/v3/videos';
            var videoOptions = {
                part: 'status',
                id: videoIds,
                key: key
            };

            $.getJSON(videoURL, videoOptions, function(videoData) {
                
                // Create a Set of valid IDs for O(1) lookup
                // We filter for existence AND public status
                var validIds = new Set();
                if (videoData.items) {
                    videoData.items.forEach(function(vid) {
                        if (vid.status.privacyStatus === 'public' && vid.status.embeddable) {
                            validIds.add(vid.id);
                        }
                    });
                }

                // Step 4: Filter the original playlist items
                // Only keep items that exist in our "validIds" set
                var activeItems = data.items.filter(function(item) {
                    return validIds.has(item.contentDetails.videoId);
                });

                // Update the data object with the filtered list
                data.items = activeItems;

                // Step 5: Resume original UI logic with clean data
                resultsLoop(data, Category, BKcol);
                handleCardView($('#content-area'), initialLoadOverride);
                populateSmartKeywords('#Grid', '#youtube-keyword-filter');
                populateCategoryFilter('#Grid', '#youtube-category-filter');
            });
        } else {
            // Handle empty playlist case
            console.log("No items found in playlist");
        }
    });
}

function resultsLoop(data, Cat, BKcol) {
    $.each(data.items, function (i, item) {
        if (!item.snippet.resourceId || !item.snippet.resourceId.videoId) {
            console.warn("Skipping playlist item, missing resourceId:", item);
            return; // skip this item
        }
        
        let thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '';
        
        const title = decodeText(item.snippet.title);
        const desc = decodeText(item.snippet.description);
        const vid = item.snippet.resourceId.videoId;

        $('#Grid').append(`
        <div data-category="${Cat}" class="card-item youtube-card-item" style="border-left-color: #${BKcol}">
            <a href="https://www.youtube.com/embed/${vid}" data-load-type="iframe">
               <img class="YTi" src="${thumb}" alt="${title}" >
               <h3>${title}</h3>
               <p>${desc}</p>
               <span class="card-category" style="display: none;">${Cat}</span>
            </a>
        </div>
        `);
    });
}

// Define filterYouTubeCards globally so mainPage.js can access it
function filterYouTubeCards() {
    const searchTerm = decodeText($('#youtube-search-box').val().toLowerCase());
    const selectedKeyword = $('#youtube-keyword-filter').val();
    const $grid = $('#Grid');
    const $allCards = $grid.children('.card-item');
    const $showMoreButton = $grid.next('.toggle-card-button');
    const $noResultsMessage = $('#youtube-no-results');
    let visibleCount = 0;

    if (searchTerm.length > 0 || selectedKeyword !== "all") {
        $showMoreButton.hide();
        $allCards.each(function() {
            const $card = $(this);
            const cardText = getCardSearchableText($card); 
            const searchMatch = (searchTerm === "" || cardText.includes(searchTerm));
            const keywordMatch = checkKeywordMatch(cardText, selectedKeyword);
            if (searchMatch && keywordMatch) {
                $card.removeClass('hidden-card-item').show();
                visibleCount++;
            } else { $card.hide(); }
        });
        if (visibleCount === 0) $noResultsMessage.show(); else $noResultsMessage.hide();
    } else {
        $noResultsMessage.hide();
        $allCards.removeAttr('style'); 
        handleCardView($('#content-area'), parseInt($('.nav-link[data-page*="youtube_page.html"]').data('initial-load')) || 10);
    }
}

/* === --- EVENT LISTENERS (DELEGATED) --- === */
$(document).ready(function () {
    
    // Inject modal
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

    // Listeners
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

    // Generalized Close Button Logic
    $('body').on('click', '.modal-close-btn', function() {
        const $modal = $('#content-modal');
        $('body').removeClass('modal-open');
        $modal.fadeOut(200);
        $('#modal-content-area').html(''); 
        currentCardList = [];
        currentCardIndex = 0;
        isModalInfoVisible = false; 
        $(document).off('keydown.modalNav');
        $modal.find('.modal-header').show();
    });
    
    $('body').on('click', '#content-modal', function(e) {
        if (e.target.id === 'content-modal') {
            $(this).find('.modal-close-btn').first().click();
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

    // Filter listeners
    $('body').on('input', '#youtube-search-box', filterYouTubeCards);
    $('body').on('change', '#youtube-keyword-filter', filterYouTubeCards);
    $('body').on('input', '#post-search-box', () => filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10));
    $('body').on('change', '#post-category-filter', () => filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10));
    $('body').on('change', '#post-keyword-filter', () => filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10));
    $('body').on('input', '#cert-search-box', () => filterCardsGeneric('#cert-card-list', '#cert-search-box', '#cert-category-filter', '#cert-keyword-filter', '#cert-no-results', 12));
    $('body').on('change', '#cert-category-filter', () => filterCardsGeneric('#cert-card-list', '#cert-search-box', '#cert-category-filter', '#cert-keyword-filter', '#cert-no-results', 12));
    $('body').on('change', '#cert-keyword-filter', () => filterCardsGeneric('#cert-card-list', '#cert-search-box', '#cert-category-filter', '#cert-keyword-filter', '#cert-no-results', 12));
    $('body').on('input', '#album-search-box', () => filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20));
    $('body').on('change', '#album-category-filter', () => filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20));
    $('body').on('change', '#album-keyword-filter', () => filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20));
    $('body').on('input', '#research-search-box', () => filterCardsGeneric('#research-card-list', '#research-search-box', '#research-category-filter', '#research-keyword-filter', '#research-no-results', 10));
    $('body').on('change', '#research-category-filter', () => filterCardsGeneric('#research-card-list', '#research-search-box', '#research-category-filter', '#research-keyword-filter', '#research-no-results', 10));
    $('body').on('change', '#research-keyword-filter', () => filterCardsGeneric('#research-card-list', '#research-search-box', '#research-category-filter', '#research-keyword-filter', '#research-no-results', 10));
    $('body').on('input', '#tutorials-search-box', () => filterCardsGeneric('#tutorials-card-list', '#tutorials-search-box', '#tutorials-category-filter', '#tutorials-keyword-filter', '#tutorials-no-results', 10));
    $('body').on('change', '#tutorials-category-filter', () => filterCardsGeneric('#tutorials-card-list', '#tutorials-search-box', '#tutorials-category-filter', '#tutorials-keyword-filter', '#tutorials-no-results', 10));
    $('body').on('change', '#tutorials-keyword-filter', () => filterCardsGeneric('#tutorials-card-list', '#tutorials-search-box', '#tutorials-category-filter', '#tutorials-keyword-filter', '#tutorials-no-results', 10));

    // Research Tab listener
    $('#content-modal').on('click', '.tab-button', function() {
        $(this).siblings().removeClass('active');
        $(this).addClass('active');
        const htmlUrl = $(this).data('content-url');
        loadModalTabContent(htmlUrl, '#research-tab-content-modal');
    });
});
