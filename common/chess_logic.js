// This function is designed to be loaded dynamically
window.startChessGame = function(loadUrl, $modal, $modalContent) {
    
    // Clean up previous listeners
    if (window.currentChessFSHandler) {
        document.removeEventListener('fullscreenchange', window.currentChessFSHandler);
        window.currentChessFSHandler = null;
    }
    if (window.chessKeyHandler) {
        document.removeEventListener('keydown', window.chessKeyHandler);
        window.chessKeyHandler = null;
    }

    // CORS Fix
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

            // --- CONFIGURATION PARAMETERS ---
            const FS_INIT_WAIT_MS = 15;      // Delay after entering FS before nudging
            const FS_NUDGE_INTERVAL_MS = 2; // Delay between Right and Left arrow simulation

            let currentFontSize = 26;
            let commentsEnabled = true;
            let movesPanelVisible = true; 
            let commentMap = {};
            let currentBoardPx = null; // null = responsive mode

            // --- CSS GENERATOR ---
            const updateChessStyles = () => {
                const movesId = `#${boardId}Moves`;
                const movesDisplay = movesPanelVisible ? 'block' : 'none';
                
                const movesBtn = $('#chess-toggle-moves-btn');
                if (movesPanelVisible) {
                    movesBtn.css({ background: '#1a1a1a', color: '#ccc' });
                } else {
                    movesBtn.css({ background: '#555', color: '#fff' });
                }

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
                    
                    #${boardId} .pgnvjs-wrapper {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        width: 100% !important;
                        justify-content: center !important;
                    }
                    
                    #chess-comment-overlay {
                        width: ${250 + (currentFontSize - 26) * 6}px !important;
                        min-width: 250px !important;
                        padding: ${15 + (currentFontSize - 26) * 0.5}px !important;
                    }
                `;
                $(`#${styleId}`).text(css);
            };

            // 3. INJECT CHESS UI HTML
            $modalContent.html(`
                <style id="${styleId}"></style>
                <div class="chess-container">
                    <div class="chess-toolbar" style="flex: 0 0 auto; display: flex; align-items: center; padding: 8px; background: #1a1a1a; gap: 10px; border-bottom: 1px solid #333;">
                        <select id="chess-game-select" style="flex: 1; max-width: 300px; padding: 5px; background:#000; color:#fff; border:1px solid #444;"></select>
                        
                        <div class="chess-size-controls" style="display:flex; gap:0;">
                            <button id="chess-size-minus" title="Decrease Size (-)" style="background:#333; color:#fff; border:1px solid #555; border-radius:4px 0 0 4px; padding:4px 10px; font-weight:bold;">-</button>
                            <button id="chess-size-reset" title="Reset to 800px" style="background:#333; color:#fff; border-top:1px solid #555; border-bottom:1px solid #555; border-left:none; border-right:none; padding:4px 10px; font-size: 0.9em;">800px</button>
                            <button id="chess-size-plus" title="Increase Size (+)" style="background:#333; color:#fff; border:1px solid #555; border-radius:0 4px 4px 0; padding:4px 10px; font-weight:bold;">+</button>
                        </div>

                        <button id="chess-toggle-moves-btn" class="tab-button" style="color: #ccc; border: 1px solid #444; padding: 4px 10px;" title="Toggle Moves (M)">Moves</button>
                        <button id="chess-info-btn" class="tab-button" style="color: #ccc; border: 1px solid #444; padding: 4px 10px;" title="Toggle Info (I)">Info</button>
                        <button id="chess-comment-btn" class="tab-button" style="color: #000; background: var(--text-accent); border: 1px solid var(--text-accent); padding: 4px 10px;" title="Toggle Comments (C)">Comments: On</button>
                        
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

            // --- SIZING LOGIC ---
            const applyBoardSize = (sizePx) => {
                const $board = $(`#${boardId}`);
                if (sizePx) {
                    const styleString = `width: ${sizePx}px !important; height: ${sizePx}px !important; margin: auto !important; flex: 0 0 auto !important; display: flex !important; justify-content: center !important; align-items: center !important;`;
                    $board.attr('style', styleString);
                    $board.find('.board, .cg-board, .pgnvjs-wrapper, .cg-board-wrap').attr('style', styleString);
                } else {
                    $board.removeAttr('style');
                    $board.find('.board, .cg-board, .pgnvjs-wrapper, .cg-board-wrap').removeAttr('style');
                }
                setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
            };

            // --- DELAYED KEY SIMULATION (Nudge) ---
            const delayedKeyNudge = () => {
                console.log("[CHESS] Executing delayed key nudge (Right -> Left)...");
                
                const $board = $(`#${boardId}`);
                let focusTarget = $board.find('button.next');
                if (!focusTarget.length) focusTarget = $board;
                
                // 1. Ensure Focus so keys are caught
                focusTarget.focus();

                // 2. Dispatch ArrowRight
                const rightEvt = new KeyboardEvent('keydown', { 
                    key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39, 
                    bubbles: true, cancelable: true, view: window 
                });
                (focusTarget[0] || document).dispatchEvent(rightEvt);

                // 3. Dispatch ArrowLeft after small delay using Configured Interval
                setTimeout(() => {
                    const leftEvt = new KeyboardEvent('keydown', { 
                        key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, which: 37, 
                        bubbles: true, cancelable: true, view: window 
                    });
                    (focusTarget[0] || document).dispatchEvent(leftEvt);
                }, FS_NUDGE_INTERVAL_MS);
            };

            // --- FULL SCREEN HANDLER ---
            window.currentChessFSHandler = () => {
                if (document.fullscreenElement) {
                    $('body').addClass('chess-fullscreen-active');
                    
                    movesPanelVisible = false;
                    currentBoardPx = null; 
                    applyBoardSize(null);
                    updateChessStyles();

                    // WAIT configured time then trigger key sequence
                    setTimeout(delayedKeyNudge, FS_INIT_WAIT_MS); 
                } else {
                    $('body').removeClass('chess-fullscreen-active');
                    movesPanelVisible = true; 
                    updateChessStyles();
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
                }
            };
            document.addEventListener('fullscreenchange', window.currentChessFSHandler);

            // --- SMART KEYBOARD LISTENER ---
            window.chessKeyHandler = (e) => {
                if (!$('#content-modal').hasClass('chess-mode')) return;
                
                // Prevent interfering with inputs if ever present
                if ($(e.target).is('input, textarea')) return;

                const k = e.key;
                const lowerK = k.toLowerCase();

                // --- UI SHORTCUTS ---
                if (lowerK === 'm') { $('#chess-toggle-moves-btn').click(); return; }
                if (lowerK === 'c') { $('#chess-comment-btn').click(); return; }
                if (lowerK === 'i') { $('#chess-info-btn').click(); return; }
                if (k === '-' || k === '_') { $('#chess-size-minus').click(); return; }
                if (k === '+' || k === '=') { $('#chess-size-plus').click(); return; }
                if (lowerK === 'f') { $('#chess-fs-btn').click(); return; }

                // --- NAVIGATION SHORTCUTS ---
                const isArrowLeft = (k === "ArrowLeft");
                const isArrowRight = (k === "ArrowRight" || k === " ");
                
                if (!isArrowLeft && !isArrowRight) return;

                // CHECK FOCUS: Only manually click if focus IS NOT on the board/buttons
                const focused = document.activeElement;
                const isChessFocus = focused && ($(focused).closest(`#${boardId}`).length > 0 || $(focused).hasClass('chess-container'));

                if (isChessFocus) {
                    return; // Let library handle it
                }

                // NO FOCUS: Manually Trigger Buttons
                const nextBtn = $(`#${boardId} button.next`);
                const prevBtn = $(`#${boardId} button.prev`);

                if (isArrowLeft) {
                    if (prevBtn.length) prevBtn[0].click(); 
                } 
                else if (isArrowRight) {
                    if (nextBtn.length) {
                        nextBtn[0].click(); 
                        if(k === " ") e.preventDefault();
                    }
                }
            };
            document.addEventListener('keydown', window.chessKeyHandler);

            // --- BUTTON HANDLERS ---
            $('#chess-size-plus').on('click', function(e) {
                e.preventDefault();
                if (!currentBoardPx) {
                    const currentWidth = $(`#${boardId} .board`).width();
                    currentBoardPx = currentWidth ? Math.round(currentWidth) : 600;
                }
                currentBoardPx += 100;
                applyBoardSize(currentBoardPx);
            });

            $('#chess-size-minus').on('click', function(e) {
                e.preventDefault();
                if (!currentBoardPx) {
                    const currentWidth = $(`#${boardId} .board`).width();
                    currentBoardPx = currentWidth ? Math.round(currentWidth) : 600;
                }
                if (currentBoardPx > 200) {
                    currentBoardPx -= 100;
                    applyBoardSize(currentBoardPx);
                }
            });

            $('#chess-size-reset').on('click', function(e) {
                e.preventDefault();
                currentBoardPx = 800;
                applyBoardSize(800);
            });

            $('#chess-toggle-moves-btn').off('click').on('click', function(e) {
                e.preventDefault();
                movesPanelVisible = !movesPanelVisible;
                updateChessStyles();
                setTimeout(delayedKeyNudge, 100);
            });

            $('#chess-comment-btn').off('click').on('click', function(e) {
                e.preventDefault();
                commentsEnabled = !commentsEnabled;
                $(this).text(commentsEnabled ? 'Comments: On' : 'Comments: Off');
                const total = document.getElementById(boardId + 'Moves') ? document.getElementById(boardId + 'Moves').querySelectorAll('move').length : 0;
                updateCommentContent(-1, total);
            });

            $('#chess-fs-btn').off('click').on('click', function(e) {
                e.preventDefault();
                $(this).blur();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(e => console.log(e));
                } else {
                    document.exitFullscreen();
                }
            });

            $('#chess-close-btn').off('click').on('click', function(e) {
                e.preventDefault();
                if (document.fullscreenElement) document.exitFullscreen();
                $('.modal-close-btn').first().click();
            });

            // --- HELPER FUNCTIONS ---
            const parseCommentsMap = (pgnText) => {
                const map = {};
                let body = pgnText.replace(/\[(?!%)[^\]]*\]/g, "").trim();
                body = body.replace(/(\r\n|\n|\r)/gm, " ").replace(/\{/g, " { ").replace(/\}/g, " } ");
                const tokens = body.split(/\s+/);
                let moveIndex = 0; let insideComment = false; let currentComment = [];
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
                    if (insideComment) { currentComment.push(token); } 
                    else {
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
                let moveDisplay = "0"; let moveWidth = 0; let moveLeft = 50; let moveColor = "#888"; let whiteWinPct = 50;
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
                        if (rawVal > 0) { moveLeft = 50; moveColor = "#2ecc71"; } else { moveLeft = 50 - moveWidth; moveColor = "#e74c3c"; }
                        whiteWinPct = 50 + (rawVal * 8);
                        whiteWinPct = Math.max(5, Math.min(95, whiteWinPct));
                    }
                }
                return { html: `<div class="eval-row"><div class="eval-header"><span>Score</span><span class="eval-value">${moveDisplay}</span></div><div class="eval-track"><div class="eval-center-line"></div><div class="eval-fill" style="left: ${moveLeft}%; width: ${moveWidth}%; background-color: ${moveColor};"></div></div></div><div class="eval-row"><div class="eval-header"><span>Win %</span><span class="eval-value">${whiteWinPct.toFixed(1)}% W / ${(100 - whiteWinPct).toFixed(1)}% B</span></div><div class="win-rate-bar" style="height: 10px; background: #000; overflow: hidden; border-radius: 3px; border: 1px solid #777;"><div class="win-white" style="width: ${whiteWinPct}%; height: 100%; background: #fff;"></div></div></div>`, text: cleanText };
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

            // --- INIT RENDER ---
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

                // Metadata
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

                // Responsive Init Size
                const winHeight = $(window).height();
                const winWidth = $(window).width();
                const maxWidth = winWidth * 0.90;
                const maxHeight = winHeight - 250;
                const initialBoardSize = Math.min(maxWidth, maxHeight);
                $(`#${boardId}`).empty();

                if (typeof PGNV !== 'undefined') {
                    PGNV.pgnView(boardId, {
                        pgn: selectedPgn, theme: 'brown', boardSize: initialBoardSize, layout: 'left', width: '100%', headers: false,
                    });
                    updateChessStyles();

                    // Initial Focus & Nudge
                    setTimeout(() => {
                        delayedKeyNudge();
                    }, 500);

                    const checkInterval = setInterval(() => {
                        const movesPanel = document.getElementById(boardId + 'Moves');
                        if (movesPanel) {
                            clearInterval(checkInterval);
                            const totalMoves = movesPanel.querySelectorAll('move').length;
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
