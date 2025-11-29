window.startChessGame = function(loadUrl, $modal, $modalContent) {
    // Fix GitHub CORS
    if (loadUrl.includes('github.com') && loadUrl.includes('/blob/')) {
        loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    // 1. ENTER CHESS MODE
    $modal.addClass('chess-mode');
    $('body').addClass('chess-mode-active');
    $modal.find('.modal-header').hide();

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
                    let result = ""; let depth = 0;
                    for (let i = 0; i < text.length; i++) {
                        if (text[i] === '(') { depth++; continue; }
                        if (text[i] === ')') { if(depth > 0) depth--; continue; }
                        if (depth === 0) result += text[i];
                    }
                    return result;
                };
                body = cleanPGN(body);
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
                    if (insideComment) { currentComment.push(token); } else {
                        if (/^\d+\.+/.test(token)) continue;
                        if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;
                        if (token.startsWith('$')) continue;
                        moveIndex++;
                    }
                }
                return map;
            };

            // Check commentary
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
                    <div class="chess-toolbar" style="flex:0 0 auto; display:flex; align-items:center; padding:8px; background:#1a1a1a; gap:10px; border-bottom:1px solid #333;">
                        <select id="chess-game-select" style="flex:1; max-width:400px; padding:5px; background:#000; color:#fff; border:1px solid #444;"></select>
                        <button id="chess-info-btn" class="tab-button" style="color:#ccc; border:1px solid #444; padding:4px 10px;">Info</button>
                        <button id="chess-font-minus" class="tab-button" style="color:#ccc; border:1px solid #444; padding:4px 10px;">-</button>
                        <button id="chess-font-plus" class="tab-button" style="color:#ccc; border:1px solid #444; padding:4px 10px;">+</button>
                        <button id="chess-comment-btn" class="tab-button" style="color:#000; background:var(--text-accent); border:1px solid var(--text-accent); padding:4px 10px;">Comments: On</button>
                        <div style="flex:1;"></div>
                        <button id="chess-close-btn" style="background:#c0392b; color:white; border:none; padding:6px 16px; font-weight:bold; cursor:pointer; border-radius:3px;">X Close</button>
                    </div>
                    <div class="chess-main-area">
                        <div class="chess-white-box"><div id="${boardId}"></div></div>
                        <div id="chess-comment-overlay" class="chess-comment-overlay"></div>
                        <div id="chess-metadata-${boardId}" class="chess-metadata-overlay"></div>
                    </div>
                </div>
            `);

            // --- STYLES & UPDATERS ---
            const updateChessStyles = () => {
                const movesId = `#${boardId}Moves`;
                const css = `
                    ${movesId} { background-color:#ffffff !important; color:#000000 !important; font-size:${currentFontSize}px !important; line-height:${currentFontSize + 10}px !important; padding:20px !important; border-left:4px solid #d2b48c !important; height:100% !important; overflow-y:auto !important; width:360px !important; min-width:360px !important; display:block !important; }
                    ${movesId} move { font-size:${currentFontSize}px !important; line-height:${currentFontSize + 10}px !important; color:#000000 !important; cursor:pointer !important; display:inline-block !important; margin-right:8px !important; margin-bottom:5px !important; border-radius:3px !important; padding:2px 4px !important; }
                    ${movesId} move:hover { background-color:#e0e0e0 !important; }
                    ${movesId} move.active { background-color:#FFD700 !important; color:#000 !important; }
                    #${boardId} .pgnvjs-wrapper { display:flex !important; flex-direction:row !important; align-items:flex-start !important; width:100% !important; justify-content:center !important; }
                    #chess-comment-overlay { width:${250 + (currentFontSize - 26) * 6}px !important; min-width:250px !important; padding:${15 + (currentFontSize - 26) * 0.5}px !important; }
                `;
                $(`#${styleId}`).text(css);
            };

            const generateEvalHtml = (rawText) => {
                const evalMatch = rawText.match(/\[%eval\s+([+-]?\d+\.?\d*|#[+-]?\d+)\]/);
                let cleanText = rawText.replace(/\[%eval\s+[^\]]+\]/g, '').trim().replace(/\[%[^\]]+\]/g, '').trim();
                let moveDisplay = "0"; let moveWidth = 0; let moveLeft = 50; let moveColor = "#888";
                let balanceScore = "0"; let balanceWidth = 0; let balanceLeft = 50; let balanceColor = "#888";
                let whiteWinPct = 50;

                if (evalMatch) {
                    const valStr = evalMatch[1]; let rawVal = 0;
                    if (valStr.startsWith('#')) {
                        const isBlackMate = valStr.includes('-');
                        moveDisplay = "Mate " + valStr; moveWidth = 50; moveLeft = isBlackMate ? 0 : 50; moveColor = isBlackMate ? "#e74c3c" : "#2ecc71";
                        balanceScore = isBlackMate ? "-100" : "+100"; balanceWidth = 50; balanceLeft = isBlackMate ? 0 : 50; balanceColor = moveColor; whiteWinPct = isBlackMate ? 0 : 100;
                    } else {
                        rawVal = parseFloat(valStr);
                        moveDisplay = Math.round(rawVal) > 0 ? `+${Math.round(rawVal)}` : Math.round(rawVal);
                        const absMove = Math.min(Math.abs(rawVal), 10);
                        moveWidth = (absMove / 10) * 50;
                        if (rawVal > 0) { moveLeft = 50; moveColor = "#2ecc71"; } else { moveLeft = 50 - moveWidth; moveColor = "#e74c3c"; }
                        balanceScore = Math.round(rawVal * 10); balanceScore = Math.max(-100, Math.min(100, balanceScore));
                        const absBal = Math.abs(balanceScore); balanceWidth = (absBal / 100) * 50;
                        if (balanceScore > 0) { balanceLeft = 50; balanceColor = "#2ecc71"; } else { balanceLeft = 50 - balanceWidth; balanceColor = "#e74c3c"; }
                        if (balanceScore > 0) balanceScore = `+${balanceScore}`;
                        whiteWinPct = 50 + (rawVal * 8); whiteWinPct = Math.max(5, Math.min(95, whiteWinPct));
                    }
                }
                const whiteWinPctFormatted = whiteWinPct.toFixed(1); const blackWinPctFormatted = (100 - whiteWinPct).toFixed(1);
                return {
                    html: `<div class="eval-row"><div class="eval-header"><span>Move Score</span><span class="eval-value">${moveDisplay}</span></div><div class="eval-track"><div class="eval-center-line"></div><div class="eval-fill" style="left:${moveLeft}%; width:${moveWidth}%; background-color:${moveColor};"></div></div></div><div class="eval-row"><div class="eval-header"><span>Game Balance</span><span class="eval-value">${balanceScore}</span></div><div class="eval-track"><div class="eval-center-line"></div><div class="eval-fill" style="left:${balanceLeft}%; width:${balanceWidth}%; background-color:${balanceColor};"></div></div></div><div class="eval-row"><div class="eval-header"><span>White vs Black</span><span class="eval-value">${whiteWinPctFormatted}% / ${blackWinPctFormatted}%</span></div><div class="win-rate-bar" style="height:10px; background:#000000; overflow:hidden; border-radius:3px; border:1px solid #777;"><div class="win-white" style="width:${whiteWinPct}%; height:100%; background:#ffffff; float:left;"></div></div></div>`,
                    text: cleanText
                };
            };

            const updateCommentContent = (moveIndex, totalMoves) => {
                const overlay = document.getElementById('chess-comment-overlay');
                const btn = $('#chess-comment-btn');
                if (hasCommentary(moveIndex)) btn.css({ background:'#4CAF50', color:'#000', border:'1px solid #4CAF50' });
                else btn.css({ background:'#1a1a1a', color:'#ccc', border:'1px solid #444' });

                if (!commentsEnabled) { $(overlay).fadeOut(); return; }
                $(overlay).fadeIn();

                const commentText = commentMap[moveIndex] || "";
                const parsed = generateEvalHtml(commentText);
                const zoomFactor = currentFontSize / 26; 
                const labelFontSize = Math.round(14 * zoomFactor); const contentFontSize = Math.round(18 * zoomFactor); const counterFontSize = Math.round(16 * zoomFactor);
                
                let textContent = "";
                if (parsed.text) { textContent = `<h5 style="margin:0 0 8px 0; color:navy; background:#e0e0e0; font-size:${labelFontSize}px; padding:4px 8px; border-radius:3px; display:inline-block; font-weight:bold;">Game Commentary</h5><div style="margin-bottom:12px; font-size:${contentFontSize}px; color:#2c3e50;">${parsed.text}</div>`; }
                else if (moveIndex === -1) { textContent = `<div style="color:#546e7a; margin-bottom:12px; font-size:${contentFontSize}px;">Start of Game</div>`; }
                else { textContent = `<div style="color:#90a4ae; font-style:italic; margin-bottom:12px; font-size:${contentFontSize}px;">No commentary.</div>`; }
                
                const displayMove = moveIndex === -1 ? "Start" : moveIndex + 1; const displayTotal = totalMoves || '?';
                overlay.innerHTML = `<div class="comment-text-content">${textContent}</div>${parsed.html}<div class="move-counter" style="font-size:${counterFontSize}px;">Move ${displayMove} / ${displayTotal}</div>`;
            };

            // --- EVENT HANDLERS ---
            $('#chess-comment-btn').off('click').on('click', function(e) {
                e.preventDefault(); commentsEnabled = !commentsEnabled;
                $(this).text(commentsEnabled ? 'Comments: On' : 'Comments: Off');
                const movesPanel = document.getElementById(boardId + 'Moves');
                if(movesPanel) {
                    const total = movesPanel.querySelectorAll('move').length;
                    const activeEl = movesPanel.querySelector('.active') || movesPanel.querySelector('.yellow');
                    let activeMoveIndex = -1;
                    if(activeEl) {
                        const allMoves = Array.from(movesPanel.querySelectorAll('move'));
                        activeMoveIndex = allMoves.indexOf(activeEl.tagName === 'MOVE' ? activeEl : activeEl.closest('move'));
                    }
                    updateCommentContent(activeMoveIndex, total);
                }
            });

            $('#chess-close-btn').off('click').on('click', function(e) { $('.modal-close-btn').first().click(); });
            $('#chess-font-minus').off('click').on('click', function(e) { e.preventDefault(); if (currentFontSize > 14) { currentFontSize -= 2; updateChessStyles(); }});
            $('#chess-font-plus').off('click').on('click', function(e) { e.preventDefault(); if (currentFontSize < 40) { currentFontSize += 2; updateChessStyles(); }});

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

                const headers = {}; let match;
                while ((match = /\[([A-Za-z0-9_]+)\s+"(.*?)"\]/g.exec(selectedPgn)) !== null) { headers[match[1]] = match[2]; }
                let infoHtml = '<h4>Game Details</h4><table style="width:100%; border-collapse:collapse;">';
                for (const [key, val] of Object.entries(headers)) { infoHtml += `<tr><td style="color:var(--text-accent); font-weight:bold; width:30%;">${key}</td><td style="color:#fff;">${val}</td></tr>`; }
                infoHtml += '</table><br><button class="overlay-close-btn" onclick="$(this).parent().fadeOut()" style="background:#e74c3c; color:white; border:none; padding:5px 15px; float:right; cursor:pointer;">Close</button>';
                $(`#chess-metadata-${boardId}`).html(infoHtml);

                const winHeight = $(window).height(); const winWidth = $(window).width();
                const maxWidth = winWidth * 0.90; const maxHeight = winHeight - 250;
                const boardSize = Math.min(maxWidth, maxHeight);

                $(`#${boardId}`).empty();

                if (typeof PGNV !== 'undefined') {
                    PGNV.pgnView(boardId, { pgn: selectedPgn, theme: 'brown', boardSize: boardSize, layout: 'left', width: '100%', headers: false });
                    updateChessStyles();
                    const total = document.getElementById(boardId + 'Moves') ? document.getElementById(boardId + 'Moves').querySelectorAll('move').length : 0;
                    updateCommentContent(-1, total);

                    // Trigger resize to fix layout issues after modal transition
                    setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 600);

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
