/* === GLOBAL VARIABLES === */
var currentCardList = []; 
var currentCardIndex = 0; 
var isModalInfoVisible = false; 
var isTutorialMode = false; // NEW: State to manage Info button behavior for tutorials

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

/* === VIEW HELPERS (Global Scope) */

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

// Function to generate and display the tutorial summary (Table of Contents)
function buildTutorialSummary(manifestUrl, $modalContent) {
    $modalContent.addClass('summary-view-active');
    
    // Check if summary content is already loaded/cached
    let $summaryOverlay = $modalContent.find('.tutorial-summary-overlay');
    if ($summaryOverlay.length) {
        // Toggle based on current state
        if ($summaryOverlay.is(':visible')) {
            $summaryOverlay.fadeOut(200);
            $('.modal-info-btn').removeClass('active');
        } else {
            $summaryOverlay.fadeIn(200);
            $('.modal-info-btn').addClass('active');
        }
        return;
    }
    
    $modalContent.append('<div class="tutorial-summary-overlay"><div class="content-loader"><div class="spinner"></div></div></div>');
    $summaryOverlay = $modalContent.find('.tutorial-summary-overlay');

    // === FIX: ROUTE MANIFEST FETCH THROUGH THE PROXY TO BYPASS CORS ===
    // Use the proxy for the XML/JSON fetch.
    const proxyUrl = `https://mediamaze.com/p/?url=${encodeURIComponent(manifestUrl)}`;
    console.log("Fetching manifest via proxy to bypass CORS:", proxyUrl);

    $.ajax({
        url: proxyUrl,
        // Request the response as plain text so we can manually parse it later
        dataType: 'text', 
        success: function (xmlText) {
            
            let data = {};
            try {
                // Since it's XML, use DOMParser to correctly interpret the structure
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                const steps = [];
                // Use jQuery selector on the parsed XML document to find steps and titles
                $(xmlDoc).find('step').each(function() {
                    steps.push({
                        title: $(this).find('title').text() || $(this).attr('id')
                    });
                });
                data.steps = steps;
            } catch (e) {
                console.error("Error parsing manifest XML:", e);
                $summaryOverlay.html('<div class="error-message">Error parsing tutorial manifest data.</div>').fadeIn(200);
                return;
            }

            // If no steps are found, handle the error gracefully
            if (!data.steps || data.steps.length === 0) {
                $summaryOverlay.html('<div class="error-message">Tutorial manifest found but contained no steps.</div>').fadeIn(200);
                return;
            }

            // 2. Build Summary HTML
            let summaryHtml = '<div class="summary-box"><h2>Tutorial Summary</h2><ol class="summary-list">';
            
            // Loop through steps and create clickable list items
            $.each(data.steps, function(index, step) {
                const displayIndex = index + 1;
                const stepTitle = decodeText(step.title || `Step ${displayIndex}`);
                
                // === FIX: Add class 'clickable' and data-step-index for navigation ===
                summaryHtml += `
                    <li class="summary-item clickable" data-step-index="${index}">
                        <span class="step-number">${displayIndex}.</span>
                        <span class="step-title">${stepTitle}</span>
                    </li>`;
            });
            
            summaryHtml += '</ol></div>';
            
            $summaryOverlay.html(summaryHtml).fadeIn(200);
            $('.modal-info-btn').addClass('active');
            
            // 3. Attach Click Listener to the new list items
            $summaryOverlay.find('.summary-item.clickable').on('click', function() {
                const stepIndex = $(this).data('step-index');
                const $iframe = $modalContent.find('.loaded-iframe');
                
                if ($iframe.length) {
                    // Send a message to the iframe player to navigate to the clicked step
                    $iframe[0].contentWindow.postMessage({ 
                        command: 'goToStep', 
                        index: stepIndex 
                    }, '*'); // Use '*' for cross-origin messaging security is difficult to manage here
                    
                    // Hide the summary overlay immediately after clicking a section
                    $summaryOverlay.fadeOut(200);
                    $('.modal-info-btn').removeClass('active');
                    console.log(`Sent command to iframe: goToStep ${stepIndex}`);
                }
            });

        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Error fetching proxied manifest (Check PHP logs):", textStatus, errorThrown);
            $summaryOverlay.html('<div class="error-message">Error fetching tutorial manifest via proxy. (Check proxy setup)</div>').fadeIn(200);
        }
    });
}

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

    // Reset general state and info button data
    isTutorialMode = false;
    // CRITICAL: isModalInfoVisible state must NOT be reset here for Photo/Iframe cards, 
    // it should only be reset when the modal closes.
    $modalInfoBtn.removeData('manifest-url').removeClass('active'); // Clear manifest data and active state
    $modalContent.removeClass('summary-view-active');
    // FIX: Only remove the specific tutorial overlay and photo info element before setting new content
    $modalContent.find('.tutorial-summary-overlay, .modal-photo-info').remove(); 
    
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
        // FIX: Remove photo info element when entering research mode
        $modalContent.find('.modal-photo-info').remove();
        $modalInfoBtn.hide(); 
        buildResearchModal(jsonUrl); 
        return; 
    } 
    
    // 2. Tutorial Logic
    if (loadType === 'tutorial' && manifestUrl) {
        isTutorialMode = true; // Set mode flag
        $modalInfoBtn.show(); // Show Info button for tutorials
        $modalInfoBtn.data('manifest-url', manifestUrl); // Store manifest URL
        
        $modal.addClass('research-mode'); // Keep research-mode class for styling consistency
        $modalOpenLink.attr('href', manifestUrl);
        
        // FIX: Remove photo info element when entering tutorial mode
        $modalContent.find('.modal-photo-info').remove();
        
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

    // 3. Standard Logic (Includes Photos/Images/Iframes)
    $modal.removeClass('research-mode'); 
    // We keep the ORIGINAL link for the "Open in new window" button (user friendly)
    $modalOpenLink.attr('href', loadUrl); 
    // FIX: Remove existing photo info element *before* creating the new one
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
    
    const $card = currentCardList[currentCardIndex].closest('.card-item');
    // FIX: Ensure title/desc retrieval checks all possible sources, especially data attributes
    const title = $card.find('h3').text() || $card.find('img').attr('alt') || $card.data('title'); 
    const desc = $card.find('p').text() || $card.data('desc'); 
    let infoHtml = '';

    if (title || desc) { // Only create info HTML if there's content
        // FIX: Ensure the state of info visibility is applied when loading the card
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
            // FIX: Hide the main modal info button in Chess mode to avoid conflict
            $modalInfoBtn.hide(); 
            $modal.find('.modal-header').hide(); // Chess has its own header/toolbar
            
            // Fix GitHub CORS
            if (loadUrl.includes('github.com') && loadUrl.includes('/blob/')) {
                loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            }

            // 1. ENTER CHESS MODE
            $modal.addClass('chess-mode');
            $('body').addClass('chess-mode-active');
            

            $.ajax({
                url: loadUrl,
                dataType: 'text',
                success: function(pgnFileContent) {
                    let rawGames = pgnFileContent.split(/(?=\[Event ")/g).filter(g => g.trim().length > 0);
                    if (rawGames.length === 0) rawGames = [pgnFileContent];

                    const boardId = 'chess-board-' + Date.now();
                    const styleId = 'chess-style-' + Date.now();

                    let currentFontSize = 26;
                    let commentsEnabled = true;
                    let commentMap = {};

                    // --- PARSER ---
                    const parseCommentsMap = (pgnText) => {
                        const map = {};
                        let body = pgnText.replace(/\[(?!%)[^\]]*\]/g, "").trim();

                        const cleanPGN = (text) => {
                            let result = "";
                            let depth = 0;
                            for (let i = 0; i < text.length; i++) {
                                if (text[i] === '(') { depth++; continue; }
                                if (text[i] === ')') { if(depth > 0) depth--; continue; }
                                if (depth === 0) result += text[i];
                            }
                            return result;
                        };
                        body = cleanPGN(body);

                        body = body.replace(/(\r\n|\n|\r)/gm, " ");
                        body = body.replace(/\{/g, " { ").replace(/\}/g, " } ");

                        const tokens = body.split(/\s+/);
                        let moveIndex = 0;
                        let insideComment = false;
                        let currentComment = [];

                        for (let i = 0; i < tokens.length; i++) {
                            const token = tokens[i].trim();
                            if (!token) continue;

                            if (token === '{') { insideComment = true; currentComment = []; continue; }
                            if (token === '}') {
                                insideComment = false;
                                const idx = moveIndex === 0 ? -1 : moveIndex - 1;
                                map[idx] = currentComment.join(" ");
                                continue;
                            }

                            if (insideComment) {
                                currentComment.push(token);
                            } else {
                                if (/^\d+\.+/.test(token)) continue;
                                if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;
                                if (token.startsWith('$')) continue;
                                moveIndex++;
                            }
                        }
                        return map;
                    };

                    // NEW HELPER: Checks if the SPECIFIC move has any content
                    const hasCommentary = (moveIndex) => {
                        const text = commentMap[moveIndex] || "";
                        const hasEval = text.match(/\[%eval\s+([+-]?\d+\.?\d*|#[+-]?\d+)\]/);
                        const cleanText = text.replace(/\[%eval\s+[^\]]+\]/g, '').trim();
                        return hasEval || cleanText.length > 0;
                    };

                    // 2. INJECT HTML
                    $modalContent.html(`
                        <style id="${styleId}"></style>
                        <div class="chess-container">
                            <div class="chess-toolbar" style="flex: 0 0 auto; display: flex; align-items: center; padding: 8px; background: #1a1a1a; gap: 10px; border-bottom: 1px solid #333;">
                                <select id="chess-game-select" style="flex: 1; max-width: 400px; padding: 5px; background:#000; color:#fff; border:1px solid #444;"></select>
                                <button id="chess-info-btn" class="tab-button" style="color: #ccc; border: 1px solid #444; padding: 4px 10px;">Info</button>
                                <button id="chess-font-minus" class="tab-button" style="color: #ccc; border: 1px solid #444; padding: 4px 10px; font-weight: bold;">-</button>
                                <button id="chess-font-plus" class="tab-button" style="color: #ccc; border: 1px solid #444; padding: 4px 10px; font-weight: bold;">+</button>
                                <button id="chess-comment-btn" class="tab-button" style="color: #000; background: var(--text-accent); border: 1px solid var(--text-accent); padding: 4px 10px;">Comments: On</button>
                                <div style="flex: 1;"></div>
                                <button id="chess-close-btn" style="background: #c0392b; color: white; border: none; padding: 6px 16px; font-weight: bold; cursor: pointer; border-radius: 3px;">X Close</button>
                            </div>
                            <div class="chess-main-area">
                                <div class="chess-white-box">
                                    <div id="${boardId}"></div>
                                </div>
                                <div id="chess-comment-overlay" class="chess-comment-overlay"></div>
                                <div id="chess-metadata-overlay" class="chess-metadata-overlay"></div> <!-- Unique ID for metadata overlay -->
                            </div>
                        </div>
                    `);

                    // --- FONT SIZE HANDLERS ---
                    const minFontSize = 14;
                    const maxFontSize = 40;
                    const sizeStep = 2; // Change font size by 2 pixels per click

                    const applySizeChange = (newSize) => {
                        currentFontSize = newSize;
                        updateChessStyles(); // Update moves panel
                        
                        // Get current move index and total moves to re-render the comment box
                        const totalMoves = document.getElementById(boardId + 'Moves') ? document.getElementById(boardId + 'Moves').querySelectorAll('move').length : 0;
                        let activeMoveIndex = -1;
                        const movesPanel = document.getElementById(boardId + 'Moves');
                        
                        if (movesPanel) {
                            const activeEl = movesPanel.querySelector('.active') || movesPanel.querySelector('.yellow');
                            if (activeEl) {
                                const allMoves = Array.from(movesPanel.querySelectorAll('move'));
                                activeMoveIndex = allMoves.indexOf(activeEl.tagName === 'MOVE' ? activeEl : activeEl.closest('move'));
                            }
                        }
                        updateCommentContent(activeMoveIndex, totalMoves); // Force update comment box content
                    }

                    $('#chess-font-minus').off('click').on('click', function(e) {
                        e.preventDefault();
                        if (currentFontSize > minFontSize) {
                            applySizeChange(currentFontSize - sizeStep);
                        }
                    });

                    $('#chess-font-plus').off('click').on('click', function(e) {
                        e.preventDefault();
                        if (currentFontSize < maxFontSize) {
                            applySizeChange(currentFontSize + sizeStep);
                        }
                    });
                    // --- END FONT SIZE HANDLERS ---

                    // --- DYNAMIC STYLES ---
                    const updateChessStyles = () => {
                        const movesId = `#${boardId}Moves`;
                        const css = `
                            ${movesId} {
                                background-color: #ffffff !important;
                                color: #000000 !important;
                                font-size: ${currentFontSize}px !important;
                                line-height: ${currentFontSize + 10}px !important;
                                padding: 20px !important;
                                border-left: 4px solid #d2b48c !important;
                                height: 100% !important;
                                overflow-y: auto !important;
                                width: 360px !important;
                                min-width: 360px !important;
                                display: block !important;
                            }
                            ${movesId} move {
                                font-size: ${currentFontSize}px !important;
                                line-height: ${currentFontSize + 10}px !important;
                                color: #000000 !important;
                                cursor: pointer !important;
                                display: inline-block !important;
                                margin-right: 8px !important;
                                margin-bottom: 5px !important;
                                border-radius: 3px !important;
                                padding: 2px 4px !important;
                            }
                            ${movesId} move:hover { background-color: #e0e0e0 !important; }
                            ${movesId} move.active { background-color: #FFD700 !important; color: #000 !important; }

                            #${boardId} .pgnvjs-wrapper {
                                display: flex !important;
                                flex-direction: row !important;
                                align-items: flex-start !important;
                                width: 100% !important;
                                justify-content: center !important;
                            }
                            
                            /* NEW: Dynamic styling for the comment overlay based on currentFontSize */
                            #chess-comment-overlay {
                                /* Base comment size is 250px wide for 26px font. Scale it up/down */
                                width: ${250 + (currentFontSize - 26) * 6}px !important;
                                min-width: 250px !important;
                                padding: ${15 + (currentFontSize - 26) * 0.5}px !important;
                            }
                        `;
                        $(`#${styleId}`).text(css);
                    };

                    // --- EVAL GENERATOR (MODIFIED: Returns empty string if no eval) ---
                    const generateEvalHtml = (rawText) => {
                        const evalMatch = rawText.match(/\[%eval\s+([+-]?\d+\.?\d*|#[+-]?\d+)\]/);
                        let cleanText = rawText.replace(/\[%eval\s+[^\]]+\]/g, '').trim();
                        cleanText = cleanText.replace(/\[%[^\]]+\]/g, '').trim();

                        // 馃洃 NEW LOGIC: Return empty string if no [%eval] tag found 馃洃
                        if (!evalMatch) {
                            return { html: "", text: cleanText };
                        }
                        // 馃洃 END NEW LOGIC 馃洃

                        let moveDisplay = "0"; let moveWidth = 0; let moveLeft = 50; let moveColor = "#888";
                        let balanceScore = "0"; let balanceWidth = 0; let balanceLeft = 50; let balanceColor = "#888";
                        let whiteWinPct = 50;

                        if (evalMatch) {
                            const valStr = evalMatch[1];
                            let rawVal = 0;

                            if (valStr.startsWith('#')) {
                                const isBlackMate = valStr.includes('-');
                                moveDisplay = "Mate " + valStr;
                                moveWidth = 50; moveLeft = isBlackMate ? 0 : 50; moveColor = isBlackMate ?
                                "#e74c3c" : "#2ecc71";

                                balanceScore = isBlackMate ? "-100" : "+100";
                                balanceWidth = 50; balanceLeft = isBlackMate ? 0 : 50; balanceColor = moveColor;
                                whiteWinPct = isBlackMate ? 0 : 100;
                            } else {
                                rawVal = parseFloat(valStr);

                                moveDisplay = Math.round(rawVal) > 0 ? `+${Math.round(rawVal)}` : Math.round(rawVal);
                                const absMove = Math.min(Math.abs(rawVal), 10);
                                moveWidth = (absMove / 10) * 50;
                                if (rawVal > 0) { moveLeft = 50; moveColor = "#2ecc71"; }
                                else { moveLeft = 50 - moveWidth; moveColor = "#e74c3c"; }

                                balanceScore = Math.round(rawVal * 10);
                                balanceScore = Math.max(-100, Math.min(100, balanceScore));

                                const absBal = Math.abs(balanceScore);
                                balanceWidth = (absBal / 100) * 50;
                                if (balanceScore > 0) { balanceLeft = 50; balanceColor = "#2ecc71"; }
                                else { balanceLeft = 50 - balanceWidth; balanceColor = "#e74c3c"; }

                                if (balanceScore > 0) balanceScore = `+${balanceScore}`;
                                whiteWinPct = 50 + (rawVal * 8);
                                whiteWinPct = Math.max(5, Math.min(95, whiteWinPct));
                            }
                        }

                        const whiteWinPctFormatted = whiteWinPct.toFixed(1);
                        const blackWinPctFormatted = (100 - whiteWinPct).toFixed(1);

                        const evalHtml = `
                            <div class="eval-row">
                                <div class="eval-header">
                                    <span>Move Score</span>
                                    <span class="eval-value">${moveDisplay}</span>
                                </div>
                                <div class="eval-track"><div class="eval-center-line"></div><div class="eval-fill" style="left: ${moveLeft}%; width: ${moveWidth}%; background-color: ${moveColor};"></div></div>
                            </div>
                            <div class="eval-row">
                                <div class="eval-header">
                                    <span>Game Balance</span>
                                    <span class="eval-value">${balanceScore}</span>
                                </div>
                                <div class="eval-track"><div class="eval-center-line"></div><div class="eval-fill" style="left: ${balanceLeft}%; width: ${balanceWidth}%; background-color: ${balanceColor};"></div></div>
                            </div>
                            <div class="eval-row">
                                <div class="eval-header">
                                    <span>White vs Black</span>
                                    <span class="eval-value">${whiteWinPctFormatted}% / ${blackWinPctFormatted}%</span>
                                </div>
                                <div class="win-rate-bar" style="height: 10px; background: #000000; overflow: hidden; border-radius: 3px; border: 1px solid #777;">
                                    <div class="win-white" style="width: ${whiteWinPct}%; height: 100%; background: #ffffff; float: left;"></div>
                                </div>
                            </div>
                        `;
                        return { html: evalHtml, text: cleanText };
                    };

                    // --- COMMENT UPDATER ---
                    const updateCommentContent = (moveIndex, totalMoves) => {
                        const overlay = document.getElementById('chess-comment-overlay');
                        const btn = $('#chess-comment-btn');

                        // 1. DYNAMIC BUTTON COLORING (Per Move)
                        const hasComment = hasCommentary(moveIndex);
                        if (hasComment) {
                            // Green if annotation exists
                            btn.css({ background: '#4CAF50', color: '#000', border: '1px solid #4CAF50' });
                        } else {
                            // Dark Grey if no annotation
                            btn.css({ background: '#1a1a1a', color: '#ccc', border: '1px solid #444' });
                        }

                        // 2. VISIBILITY CHECK
                        if (!commentsEnabled) { $(overlay).fadeOut(); return; }
                        $(overlay).fadeIn();

                        const commentText = commentMap[moveIndex] || "";
                        const parsed = generateEvalHtml(commentText); // parsed.html will now be empty if no eval is present
                        let content = "";
                        
                        // Base 26px font maps to 100% zoom. Calculate relative size increase.
                        const zoomFactor = currentFontSize / 26; 

                        const baseLabelSize = 14;
                        const baseContentSize = 18;
                        const baseCounterSize = 16;

                        const labelFontSize = Math.round(baseLabelSize * zoomFactor);
                        const contentFontSize = Math.round(baseContentSize * zoomFactor);
                        const counterFontSize = Math.round(baseCounterSize * zoomFactor);
                        
                        // 3. TEXT CONTENT (Modified Title Style)
                        let textContent = "";
                        if (parsed.text) {
                            textContent = `
                                <h5 style="margin: 0 0 8px 0; color: navy; background: #e0e0e0; font-size: ${labelFontSize}px; padding: 4px 8px; border-radius: 3px; display: inline-block; font-weight: bold;">Game Commentary</h5>
                                <div style="margin-bottom:12px; font-size: ${contentFontSize}px; color: #2c3e50;">${parsed.text}</div>
                            `;
                        } else if (moveIndex === -1) {
                            textContent = `<div style="color:#546e7a; margin-bottom:12px; font-size: ${contentFontSize}px;">Start of Game</div>`;
                        } else {
                            textContent = `<div style="color:#90a4ae; font-style:italic; margin-bottom:12px; font-size: ${contentFontSize}px;">No commentary.</div>`;
                        }
                        content += `<div class="comment-text-content">${textContent}</div>`;

                        // 4. BARS & COUNTER
                        let footer = "";
                        footer += parsed.html; // This will be empty if no eval was found

                        const displayMove = moveIndex === -1 ? "Start" : moveIndex + 1;
                        const displayTotal = totalMoves || '?';
                        
                        footer += `<div class="move-counter" style="font-size: ${counterFontSize}px;">Move ${displayMove} / ${displayTotal}</div>`;

                        overlay.innerHTML = content + footer;
                    };

                    // CLICK HANDLER
                    $('#chess-comment-btn').off('click').on('click', function(e) {
                        e.preventDefault();
                        commentsEnabled = !commentsEnabled;
                        const btn = $(this);

                        if (commentsEnabled) {
                            btn.text('Comments: On');
                        } else {
                            btn.text('Comments: Off');
                        }

                        // IMMEDIATE REFRESH: Grab active move to update content and button color instantly
                        const total = document.getElementById(boardId + 'Moves') ? document.getElementById(boardId + 'Moves').querySelectorAll('move').length : 0;
                        let activeMoveIndex = -1;
                        const movesPanel = document.getElementById(boardId + 'Moves');

                        if (movesPanel) {
                            const activeEl = movesPanel.querySelector('.active') || movesPanel.querySelector('.yellow');
                            if (activeEl) {
                                const allMoves = Array.from(movesPanel.querySelectorAll('move'));
                                activeMoveIndex = allMoves.indexOf(activeEl.tagName === 'MOVE' ? activeEl : activeEl.closest('move'));
                            }
                        }
                        updateCommentContent(activeMoveIndex, total);
                    });

                    // CLOSING FUNCTIONALITY FOR THE CUSTOM 'X Close' BUTTON
                    $('#chess-close-btn').off('click').on('click', function(e) {
                        e.preventDefault();
                        // 1. Remove custom classes to exit chess mode
                        $modal.removeClass('chess-mode');
                        $('body').removeClass('chess-mode-active');
                        
                        // 2. Hide the custom header content
                        $modal.find('.modal-header').show(); 

                        // 3. Explicitly hide the modal popup (the core fix)
                        if (typeof $modal.modal === 'function') {
                            $modal.modal('hide');
                        } else {
                            // Fallback hide if it's a simple hidden container
                            $modal.hide();
                        }
                    });


                    // --- RENDER ---
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
                        commentMap = parseCommentsMap(selectedPgn);

                        const headers = {};
                        const headerRegex = /\[([A-Za-z0-9_]+)\s+"(.*?)"\]/g;
                        let match;
                        while ((match = headerRegex.exec(selectedPgn)) !== null) { headers[match[1]] = match[2]; }

                        let infoHtml = '<h4>Game Details</h4><table style="width:100%; border-collapse: collapse;">';
                        for (const [key, val] of Object.entries(headers)) {
                            infoHtml += `<tr><td style="color: var(--text-accent); font-weight:bold; width: 30%;">${key}</td><td style="color: #fff;">${val}</td></tr>`;
                        }
                        infoHtml += '</table><br><button class="overlay-close-btn" onclick="$(this).parent().fadeOut()" style="background: #e74c3c; color: white; border: none; padding: 5px 15px; float: right; cursor: pointer;">Close</button>';
                        $(`#chess-metadata-overlay`).html(infoHtml); // Use the common ID

                        // SIZE
                        const winHeight = $(window).height();
                        const winWidth = $(window).width();
                        const maxWidth = winWidth * 0.90;
                        const maxHeight = winHeight - 250;
                        const boardSize = Math.min(maxWidth, maxHeight);

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

                            updateChessStyles();
                            const total = document.getElementById(boardId + 'Moves') ? document.getElementById(boardId + 'Moves').querySelectorAll('move').length : 0;
                            updateCommentContent(-1, total);

                            // Observer
                            const checkInterval = setInterval(() => {
                                const movesPanel = document.getElementById(boardId + 'Moves');

                                if (movesPanel) {
                                    clearInterval(checkInterval);

                                    const totalMoves = movesPanel.querySelectorAll('move').length;

                                    gameObserver = new MutationObserver(() => {
                                        let activeEl = movesPanel.querySelector('.active') || movesPanel.querySelector('.yellow');

                                        if (activeEl) {
                                            const activeMove = activeEl.tagName === 'MOVE' ? activeEl : activeEl.closest('move');
                                            if (activeMove) {
                                                const allMoves = Array.from(movesPanel.querySelectorAll('move'));
                                                const index = allMoves.indexOf(activeMove);
                                                updateCommentContent(index, totalMoves);
                                                return;
                                            }
                                        }
                                        updateCommentContent(-1, totalMoves);
                                    });

                                    gameObserver.observe(movesPanel, { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
                                }
                            }, 200);
                        } else {
                            $modal.removeClass('chess-mode');
                            $('body').removeClass('chess-mode-active');
                            $modal.find('.modal-header').show();
                            $modalContent.html('<div class="error-message">PGN Library not loaded.</div>');
                        }
                    }

                    renderGame(0);
                    $select.off('change').on('change', function() { renderGame($(this).val()); });
                    // FIX: Re-attach click handler for the CHESS info button (which is separate)
                    $('#chess-info-btn').off('click').on('click', function() { $(`#chess-metadata-overlay`).fadeToggle(); });

                },
                error: function() {
                    $modal.removeClass('chess-mode');
                    $('body').removeClass('chess-mode-active');
                    $modal.find('.modal-header').show();
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
                </div>
            `);
            if (infoHtml) { 
                // Ensure photo info element is added to modalContent
                $modalContent.append(infoHtml);
                $modalInfoBtn.show(); 
                // Fix: Ensure the active state of the info button is set on image load
                $modalInfoBtn.toggleClass('active', isModalInfoVisible);
            }
            break;
        case 'iframe':
            // FIX: Use the specified absolute server proxy path (https://mediamaze.com/p/?)
            let iframeSrc = loadUrl;
            if (loadUrl.startsWith('http')) {
                // Use the absolute PHP proxy endpoint
                iframeSrc = `https://mediamaze.com/p/?url=${encodeURIComponent(loadUrl)}`;
                console.log("Using absolute PHP proxy for URL:", iframeSrc);
            }

            $modalContent.html(`
                <div class="iframe-wrapper">
                    <iframe src="${iframeSrc}" class="loaded-iframe" style="height: ${customHeight};"></iframe>
                </div>
            `);
            if (infoHtml) { 
                // Ensure photo info element is added to modalContent
                $modalContent.append(infoHtml);
                $modalInfoBtn.show(); 
                // Fix: Ensure the active state of the info button is set on iframe load
                $modalInfoBtn.toggleClass('active', isModalInfoVisible); 
            }
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


// UPDATED: Added onComplete parameter and callback execution
function loadPhotoAlbum(jsonUrl, initialLoadOverride, onComplete) {
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
        // Use 10 as default if incrementOverride is missing (undefined)
        handleCardView($targetList.parent(), initialLoadOverride, defaultIncrement);
        
        // --- NEW: Call the callback if provided ---
        if (typeof onComplete === 'function') {
            onComplete();
        }
        
    }).fail(function() { 
        if ($('#album-title').length) $('#album-title').text("Error Loading Album"); 
    });
}

// UPDATED: Added onComplete parameter and callback execution
function loadVids(PL, Category, BKcol, initialLoadOverride, onComplete) {
    $('#Grid').empty(); 
    var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'; 
    var URL = 'https://www.googleapis.com/youtube/v3/playlistItems';
    var options = { part: 'snippet', key: key, maxResults: 50, playlistId: PL };

    $.getJSON(URL, options, function (data) {
        $('#playlist-title').text(`Youtubelist: ${Category.replace(/_/g, ' ')}`);
        if (data.items) {
            resultsLoop(data, Category, BKcol);
            handleCardView($('#content-area'), initialLoadOverride);
            populateSmartKeywords('#Grid', '#youtube-keyword-filter');
            populateCategoryFilter('#Grid', '#youtube-category-filter');
            
            // --- NEW: Call the callback if provided ---
            if (typeof onComplete === 'function') {
                onComplete();
            }
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



/* === DEEP LINK HELPER (NEW) === */

function loadPhotoAlbum(jsonUrl, initialLoadOverride, onComplete) {
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
        
        handleCardView($targetList.parent(), initialLoadOverride, defaultIncrement);
        
        // Call the callback if provided
        if (typeof onComplete === 'function') {
            onComplete();
        }
        
    }).fail(function() { 
        if ($('#album-title').length) $('#album-title').text("Error Loading Album"); 
    });
}





/* === DEEP LINK HELPER (NEW) === */

function openCardByTitle(titleToFind) {
    if (!titleToFind) return;
    
    // Decode and normalize the search title
    const decodedTitle = decodeURIComponent(titleToFind).trim().toLowerCase();
    
    console.log(`DEBUG: searching for card with title: "${decodedTitle}"`);

    // Find the card by matching the 'id' attribute first (exact match)
    let $card = $('#' + titleToFind);
    
    // If not found by ID, search for matching title (H3) or Alt Text
    if ($card.length === 0) {
        $card = $('.card-item').filter(function() {
            const cardId = $(this).attr('id');
            if (cardId && cardId.toLowerCase() === decodedTitle) return true;

            const cardTitle = $(this).find('h3').text().trim().toLowerCase();
            const imgAlt = $(this).find('img.card-image').attr('alt') || '';
            
            return cardTitle === decodedTitle || (imgAlt && imgAlt.toLowerCase() === decodedTitle);
        });
    }

    if ($card.length) {
        console.log("DEBUG: Card found! Clicking it.");
        // Scroll to card
        $('html, body').animate({
            scrollTop: $card.offset().top - 100
        }, 500);
        // Click it
        $card.click();
    } else {
        console.warn('Deep link card not found for title/id:', decodedTitle);
    }
}







// UPDATED: Accepts onComplete callback
function loadVids(PL, Category, BKcol, initialLoadOverride, onComplete) {
    $('#Grid').empty(); 
    var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'; 
    var URL = 'https://www.googleapis.com/youtube/v3/playlistItems';
    var options = { part: 'snippet', key: key, maxResults: 50, playlistId: PL };

    $.getJSON(URL, options, function (data) {
        $('#playlist-title').text(`Youtubelist: ${Category.replace(/_/g, ' ')}`);
        if (data.items) {
            resultsLoop(data, Category, BKcol);
            handleCardView($('#content-area'), initialLoadOverride);
            populateSmartKeywords('#Grid', '#youtube-keyword-filter');
            populateCategoryFilter('#Grid', '#youtube-category-filter');
            
            // Call callback when complete
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }
    });
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
        isModalInfoVisible = false; // Reset info visibility state on close
        isTutorialMode = false; // Reset tutorial mode
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

    // UPDATED FIX: Info button listener handles both Photo and Tutorial modes
    $('body').on('click', '.modal-info-btn', function() {
        
        const $infoBtn = $(this);
        const $modalContent = $('#modal-content-area');
        
        // 1. Check for Tutorial Mode (manifest-url data must be present on the button)
        const manifestUrl = $infoBtn.data('manifest-url'); 
        
        if (manifestUrl) {
            // TUTORIAL MODE: Show/hide Summary (Table of Contents)
            console.log("Tutorial Info button clicked. Manifest found, showing summary.");
            buildTutorialSummary(manifestUrl, $modalContent);
        } 
        
        // 2. Check for Photo/Iframe Mode (modal-photo-info element must be present)
        else {
            isModalInfoVisible = !isModalInfoVisible;
            
            const $infoDiv = $modalContent.find('.modal-photo-info');
            
            // Console log the state for debugging (as requested by user)
            console.log("Photo Info button clicked. isModalInfoVisible:", isModalInfoVisible, "Info Div found:", $infoDiv.length > 0);

            if ($infoDiv.length > 0) {
                $infoDiv.toggleClass('info-visible', isModalInfoVisible);
                $infoBtn.toggleClass('active', isModalInfoVisible); 
            } else {
                // FALLBACK: If we're not in tutorial mode and didn't find the photo div, 
                // we probably loaded Markdown or Chess or something else that uses the main header
                $infoBtn.removeClass('active');
                isModalInfoVisible = false; // Reset state if click was ineffective
            }
        }
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
