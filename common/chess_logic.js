// This function is designed to be loaded dynamically
window.startChessGame = function(loadUrl, $modal, $modalContent) {
    
    // Clean up previous listeners if any exist
    if (window.currentChessFSHandler) {
        document.removeEventListener('fullscreenchange', window.currentChessFSHandler);
        window.currentChessFSHandler = null;
    }
    if (window.chessKeyHandler) {
        document.removeEventListener('keydown', window.chessKeyHandler);
        window.chessKeyHandler = null;
    }

    // CORS Fix for GitHub URLs
    if (loadUrl.includes('github.com') && loadUrl.includes('/blob/')) {
        loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    // 1. ENTER CHESS MODE UI STATE
    $modal.addClass('chess-mode');
    $('body').addClass('chess-mode-active');
    $modal.find('.modal-header').hide();

    // 2. FETCH PGN CONTENT
    $.ajax({
        url: loadUrl,
        dataType: 'text',
        success: function(pgnFileContent) {
            let rawGames = pgnFileContent.split(/(?=\[Event ")/g).filter(g => g.trim().length > 0);
            if (rawGames.length === 0) rawGames = [pgnFileContent];

            const boardId = 'chess-board-' + Date.now();
            const styleId = 'chess-style-' + Date.now();

            // State Variables
            let currentFontSize = 26;
            let commentsEnabled = true;
            let movesPanelVisible = true; 
            let commentMap = {};
            let currentBoardPx = null; // null = auto/responsive mode

            // --- CSS GENERATOR ---
            const updateChessStyles = () => {
                const movesId = `#${boardId}Moves`;
                const movesDisplay = movesPanelVisible ? 'block' : 'none';
                
                // Determine board dimensions
                // If currentBoardPx is set, use it. Otherwise use responsive units.
                let boardWidth, boardHeight;
                
                if (currentBoardPx) {
                    boardWidth = `${currentBoardPx}px`;
                    boardHeight = `${currentBoardPx}px`;
                } else {
                    // Default Responsive Logic
                    // Fullscreen: 80vmin if moves visible, 95vmin if not
                    // Windowed: calculated in renderGame initially, but here we can set maxes
                    boardWidth = movesPanelVisible ? '80vmin' : '95vmin';
                    boardHeight = movesPanelVisible ? '80vmin' : '95vmin';
                }

                // If we are NOT in fullscreen and NOT fixed size, we rely on the container constraints
                // But if we ARE in fullscreen or have a fixed size, we enforce it.
                
                const css = `
                    /* --- MOVES PANEL --- */
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
                        display: ${movesDisplay} !important;
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

                    /* --- BOARD WRAPPERS --- */
                    #${boardId} .pgnvjs-wrapper {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: flex-start !important;
                        width: 100% !important;
                        justify-content: center !important;
                    }
                    
                    #chess-comment-overlay {
                        width: ${250 + (currentFontSize - 26) * 6}px !important;
                        min-width: 250px !important;
                        padding: ${15 + (currentFontSize - 26) * 0.5}px !important;
                    }

                    /* === SIZING LOGIC === */
                    
                    /* When in FS mode OR when a Fixed Size is set, we strictly enforce dimensions */
                    body.chess-fullscreen-active #${boardId}, 
                    .chess-fixed-size #${boardId} { 
                        width: ${boardWidth} !important; 
                        height: ${boardHeight} !important;
                        display: flex !important; justify-content: center !important; align-items: center !important;
                        background-color: #f0d9b5; /* Fallback/Margin color */
                    }

                    /* Force internal library elements to match container */
                    body.chess-fullscreen-active #${boardId} .pgnvjs-wrapper,
                    body.chess-fullscreen-active #${boardId} .cg-board-wrap, 
                    body.chess-fullscreen-active #${boardId} .board,
                    body.chess-fullscreen-active #${boardId} .cg-board,
                    .chess-fixed-size #${boardId} .pgnvjs-wrapper,
                    .chess-fixed-size #${boardId} .cg-board-wrap, 
                    .chess-fixed-size #${boardId} .board,
                    .chess-fixed-size #${boardId} .cg-board { 
                        width: 100% !important; 
                        height: 100% !important;
                    }
                    
                    /* Toolbar Visibility in FS */
                    body.chess-fullscreen-active .modal-header { display: none !important; }
                    body.chess-fullscreen-active .chess-toolbar { 
                        display: flex !important; 
                        z-index: 2147483648 !important; 
                    }
                    body.chess-fullscreen-active .chess-container { 
                        position: fixed !important; top: 0; left: 0;
                        width: 100vw !important; height: 100vh !important;
                        z-index: 2147483647 !important; 
                        background: #1a1a1a !important;
                    }
                `;
                $(`#${styleId}`).text(css);

                // Toggle a class on the container to help CSS selector specificity
                if (currentBoardPx) {
                    $('.chess-white-box').addClass('chess-fixed-size');
                } else {
                    $('.chess-white-box').removeClass('chess-fixed-size');
                }
            };

            // 3. INJECT CHESS UI HTML
            $modalContent.html(`
                <style id="${styleId}"></style>
                <div class="chess-container">
                    <div class="chess-toolbar" style="flex: 0 0 auto; display: flex; align-items: center; padding: 8px; background: #1a1a1a; gap: 10px; border-bottom: 1px solid #333;">
                        <select id="chess-game-select" style="flex: 1; max-width: 300px; padding: 5px; background:#000; color:#fff; border:1px solid #444;"></select>
                        
                        <!-- SIZING CONTROLS -->
                        <div class="chess-size-controls" style="display:flex; gap:0;">
                            <button id="chess-size-minus" title="Decrease Size" style="background:#333; color:#fff; border:1px solid #555; border-radius:4px 0 0 4px; padding:4px 10px;">-</button>
                            <button id="chess-size-reset" title="Reset to 800px" style="background:#333; color:#fff; border-top:1px solid #555; border-bottom:1px solid #555; border-left:none; border-right:none; padding:4px 10px;">800px</button>
                            <button id="chess-size-plus" title="Increase Size" style="background:#333; color:#fff; border:1px solid #555; border-radius:0 4px 4px 0; padding:4px 10px;">+</button>
                        </div>

                        <button id="chess-toggle-moves-btn" class="tab-button" style="color: #ccc; border: 1px solid #444; padding: 4px 10px;">Moves</button>
                        <button id="chess-info-btn" class="tab-button" style="color: #ccc; border: 1px solid #444; padding: 4px 10px;">Info</button>
                        <button id="chess-comment-btn" class="tab-button" style="color: #000; background: var(--text-accent); border: 1px solid var(--text-accent); padding: 4px 10px;">Comments: On</button>
                        
                        <div style="flex: 1;"></div>
                        <button id="chess-fs-btn" class="tab-button" style="color: #ccc; border: 1px solid #444; padding: 4px 10px; margin-right: 5px;" title="Full Screen (F)">&#x26F6; Full Screen</button>
                        <button id="chess-close-btn" style="background: #c0392b; color: white; border: none; padding: 6px 16px; font-weight: bold; cursor: pointer; border-radius: 3px;">X Close</button>
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

            // --- HELPER: Parse Comments ---
            const parseCommentsMap = (pgnText) => {
                const map = {};
                let body = pgnText.replace(/\[(?!%)[^\]]*\]/g, "").trim();
                // Basic cleanup
                body = body.replace(/(\r\n|\n|\r)/gm, " ").replace(/\{/g, " { ").replace(/\}/g, " } ");
                
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
                        // Skip move numbers and game results
                        if (/^\d+\.+/.test(token)) continue;
                        if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;
                        if (token.startsWith('$')) continue;
                        moveIndex++;
                    }
                }
                return map;
            };

            const generateEvalHtml = (rawText) => {
                const evalMatch = rawText.match(/\[%eval\s+([+-]?\d+\.?\d*|#[+-]?\d+)\]/);
                let cleanText = rawText.replace(/\[%eval\s+[^\]]+\]/g, '').trim();
                cleanText = cleanText.replace(/\[%[^\]]+\]/g, '').trim();

                let moveDisplay = "0"; let moveWidth = 0; let moveLeft = 50; let moveColor = "#888";
                let whiteWinPct = 50;

                if (evalMatch) {
                    const valStr = evalMatch[1];
                    let rawVal = 0;
                    if (valStr.startsWith('#')) {
                        const isBlackMate = valStr.includes('-');
                        moveDisplay = "Mate " + valStr;
                        moveWidth = 50; moveLeft = isBlackMate ? 0 : 50; moveColor = isBlackMate ? "#e74c3c" : "#2ecc71";
                        whiteWinPct = isBlackMate ? 0 : 100;
                    } else {
                        rawVal = parseFloat(valStr);
                        moveDisplay = Math.round(rawVal) > 0 ? `+${Math.round(rawVal)}` : Math.round(rawVal);
                        const absMove = Math.min(Math.abs(rawVal), 10);
                        moveWidth = (absMove / 10) * 50;
                        if (rawVal > 0) { moveLeft = 50; moveColor = "#2ecc71"; }
                        else { moveLeft = 50 - moveWidth; moveColor = "#e74c3c"; }
                        whiteWinPct = 50 + (rawVal * 8);
                        whiteWinPct = Math.max(5, Math.min(95, whiteWinPct));
                    }
                }
                const whiteWinPctFormatted = whiteWinPct.toFixed(1);
                const blackWinPctFormatted = (100 - whiteWinPct).toFixed(1);

                const evalHtml = `
                    <div class="eval-row"><div class="eval-header"><span>Score</span><span class="eval-value">${moveDisplay}</span></div><div class="eval-track"><div class="eval-center-line"></div><div class="eval-fill" style="left: ${moveLeft}%; width: ${moveWidth}%; background-color: ${moveColor};"></div></div></div>
                    <div class="eval-row"><div class="eval-header"><span>Win %</span><span class="eval-value">${whiteWinPctFormatted}% W / ${blackWinPctFormatted}% B</span></div><div class="win-rate-bar" style="height: 10px; background: #000; overflow: hidden; border-radius: 3px; border: 1px solid #777;"><div class="win-white" style="width: ${whiteWinPct}%; height: 100%; background: #fff;"></div></div></div>
                `;
                return { html: evalHtml, text: cleanText };
            };

            const updateCommentContent = (moveIndex, totalMoves) => {
                const overlay = document.getElementById('chess-comment-overlay');
                if (!commentsEnabled) { $(overlay).fadeOut(); return; }
                $(overlay).fadeIn();

                const commentText = commentMap[moveIndex] || "";
                const parsed = generateEvalHtml(commentText);
                
                const zoomFactor = currentFontSize / 26; 
                let textContent = parsed.text ? `<h5 style="margin:0 0 8px 0; color:navy; background:#e0e0e0; font-size:${Math.round(14*zoomFactor)}px; padding:4px 8px; border-radius:3px; display:inline-block; font-weight:bold;">Commentary</h5><div style="margin-bottom:12px; font-size:${Math.round(18*zoomFactor)}px; color:#2c3e50;">${parsed.text}</div>` : `<div style="color:#90a4ae; font-style:italic; margin-bottom:12px; font-size:${Math.round(18*zoomFactor)}px;">No commentary.</div>`;
                if(moveIndex === -1 && !parsed.text) textContent = `<div style="color:#546e7a; margin-bottom:12px; font-size:${Math.round(18*zoomFactor)}px;">Start of Game</div>`;

                overlay.innerHTML = `<div class="comment-text-content">${textContent}</div>` + parsed.html + `<div class="move-counter" style="font-size:${Math.round(16*zoomFactor)}px;">Move ${moveIndex === -1 ? "Start" : moveIndex + 1} / ${totalMoves || '?'}</div>`;
            };

            // --- FULL SCREEN HANDLER ---
            window.currentChessFSHandler = () => {
                if (document.fullscreenElement) {
                    $('body').addClass('chess-fullscreen-active');
                } else {
                    $('body').removeClass('chess-fullscreen-active');
                }
                // Trigger resize so library recalculates squares
                setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
                setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 300);
            };
            document.addEventListener('fullscreenchange', window.currentChessFSHandler);

            // --- KEYBOARD NAVIGATION (DIRECT BINDING) ---
            window.chessKeyHandler = (e) => {
                // Only act if chess mode is active
                if (!$('#content-modal').hasClass('chess-mode')) return;

                if (e.key === "ArrowLeft") {
                    // Try to find the previous button in the PGN viewer
                    const prevBtn = $(`#${boardId} .prev, #${boardId} .fa-arrow-left`).parent('button');
                    if (prevBtn.length) prevBtn.click();
                    // Also try standard selector just in case
                    else $(`#${boardId} button.prev`).click();
                } 
                else if (e.key === "ArrowRight" || e.key === " ") {
                    const nextBtn = $(`#${boardId} .next, #${boardId} .fa-arrow-right`).parent('button');
                    if (nextBtn.length) nextBtn.click();
                    else $(`#${boardId} button.next`).click();
                    if(e.key === " ") e.preventDefault(); // Prevent scroll
                }
                else if (e.key.toLowerCase() === 'f') {
                    $('#chess-fs-btn').click();
                }
            };
            document.addEventListener('keydown', window.chessKeyHandler);


            // --- BUTTON HANDLERS ---
            
            // 1. Sizing Buttons
            const triggerResize = () => {
                updateChessStyles();
                // Dispatch resize event to force library to redraw board SVG/Canvas
                window.dispatchEvent(new Event('resize'));
            };

            $('#chess-size-plus').on('click', function() {
                // If not set yet, grab current rendered width or start at 600
                if (!currentBoardPx) {
                    const currentWidth = $(`#${boardId} .board`).width();
                    currentBoardPx = currentWidth ? currentWidth : 600;
                }
                currentBoardPx += 100;
                triggerResize();
            });

            $('#chess-size-minus').on('click', function() {
                if (!currentBoardPx) {
                    const currentWidth = $(`#${boardId} .board`).width();
                    currentBoardPx = currentWidth ? currentWidth : 600;
                }
                if (currentBoardPx > 200) currentBoardPx -= 100;
                triggerResize();
            });

            $('#chess-size-reset').on('click', function() {
                currentBoardPx = 800; // Fixed 800px as requested
                triggerResize();
            });

            // 2. Toggle Moves
            $('#chess-toggle-moves-btn').off('click').on('click', function(e) {
                e.preventDefault();
                movesPanelVisible = !movesPanelVisible;
                $(this).css({ background: movesPanelVisible ? '#1a1a1a' : '#555', color: movesPanelVisible ? '#ccc' : '#fff' });
                triggerResize();
            });

            // 3. Comments Toggle
            $('#chess-comment-btn').off('click').on('click', function(e) {
                e.preventDefault();
                commentsEnabled = !commentsEnabled;
                $(this).text(commentsEnabled ? 'Comments: On' : 'Comments: Off');
                // Refresh overlay
                const total = document.getElementById(boardId + 'Moves') ? document.getElementById(boardId + 'Moves').querySelectorAll('move').length : 0;
                updateCommentContent(-1, total);
            });

            // 4. Fullscreen
            $('#chess-fs-btn').off('click').on('click', function(e) {
                e.preventDefault();
                $(this).blur();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(e => console.log(e));
                } else {
                    document.exitFullscreen();
                }
            });

            // 5. Close
            $('#chess-close-btn').off('click').on('click', function(e) {
                e.preventDefault();
                if (document.fullscreenElement) document.exitFullscreen();
                $('.modal-close-btn').first().click();
            });

            // Game Select Dropdown Logic
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

                // Metadata Table
                const headers = {};
                let match;
                const headerRegex = /\[([A-Za-z0-9_]+)\s+"(.*?)"\]/g;
                while ((match = headerRegex.exec(selectedPgn)) !== null) { headers[match[1]] = match[2]; }
                let infoHtml = '<h4>Game Details</h4><table style="width:100%; border-collapse: collapse;">';
                for (const [key, val] of Object.entries(headers)) {
                    infoHtml += `<tr><td style="color: var(--text-accent); font-weight:bold; width: 30%;">${key}</td><td style="color: #fff;">${val}</td></tr>`;
                }
                infoHtml += '</table><br><button class="overlay-close-btn" onclick="$(this).parent().fadeOut()" style="background: #e74c3c; color: white; border: none; padding: 5px 15px; float: right; cursor: pointer;">Close</button>';
                $(`#chess-metadata-${boardId}`).html(infoHtml);

                // Initial Size Calculation for responsive mode
                const winHeight = $(window).height();
                const winWidth = $(window).width();
                const maxWidth = winWidth * 0.90;
                const maxHeight = winHeight - 250;
                const initialBoardSize = Math.min(maxWidth, maxHeight);

                $(`#${boardId}`).empty();

                if (typeof PGNV !== 'undefined') {
                    // Render PGN View
                    PGNV.pgnView(boardId, {
                        pgn: selectedPgn,
                        theme: 'brown',
                        boardSize: initialBoardSize, // This is just initial, CSS overrides it
                        layout: 'left',
                        width: '100%',
                        headers: false,
                    });

                    updateChessStyles();

                    // Observer for Moves Panel (to update comments on move)
                    const checkInterval = setInterval(() => {
                        const movesPanel = document.getElementById(boardId + 'Moves');
                        if (movesPanel) {
                            clearInterval(checkInterval);
                            const totalMoves = movesPanel.querySelectorAll('move').length;
                            
                            // Initialize comment
                            updateCommentContent(-1, totalMoves);

                            gameObserver = new MutationObserver(() => {
                                let activeEl = movesPanel.querySelector('.active') || movesPanel.querySelector('.yellow');
                                if (activeEl) {
                                    const activeMove = activeEl.tagName === 'MOVE' ? activeEl : activeEl.closest('move');
                                    if (activeMove) {
                                        const allMoves = Array.from(movesPanel.querySelectorAll('move'));
                                        const idx = allMoves.indexOf(activeMove);
                                        updateCommentContent(idx, totalMoves);
                                        return;
                                    }
                                }
                                updateCommentContent(-1, totalMoves);
                            });

                            gameObserver.observe(movesPanel, { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
                        }
                    }, 200);
                } else {
                    $('.modal-close-btn').first().click();
                }
            }

            renderGame(0);
            $select.off('change').on('change', function() { renderGame($(this).val()); });
            $('#chess-info-btn').off('click').on('click', function() { $(`#chess-metadata-${boardId}`).fadeToggle(); });

        },
        error: function() {
            $modal.removeClass('chess-mode');
            $('body').removeClass('chess-mode-active');
            $modal.find('.modal-header').show();
            $modalContent.html('<div class="error-message">Could not load PGN file.</div>');
        }
    });
};
