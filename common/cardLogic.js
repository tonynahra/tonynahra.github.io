/* === GLOBAL VARIABLES === */
var currentCardList = []; var currentCardIndex = 0; var isModalInfoVisible = false; var isTutorialMode = false; var slideshowInterval = null; 
// USE WINDOW OBJECT FOR RELIABLE PERSISTENCE
window.cardGlobalState = { infoVisible: false };

function injectModalStyles() { 
    if ($('#dynamic-modal-styles').length) return; 
    // Add Tabulator & ChartJS CSS dependencies
    $('head').append(`
        <style id="dynamic-modal-styles"></style>
        <link href="https://unpkg.com/tabulator-tables@5.5.0/dist/css/tabulator.min.css" rel="stylesheet">
        <style>
            .tabulator { font-size: 14px; border: none; background-color: #fff; }
            .tabulator-header { background-color: #f8f9fa; color: #333; font-weight: bold; }
            .tabulator-row.tabulator-row-even { background-color: #fcfcfc; }
            .tabulator-row:hover { background-color: #e9ecef; }
            .chart-container { position: relative; height: 60vh; width: 100%; padding: 20px; box-sizing: border-box; }
        </style>
    `); 
}

/* === HELPER FUNCTIONS (GLOBAL) === */
function decodeText(text) { if (!text) return ""; try { var $textarea = $('<textarea></textarea>'); $textarea.html(text); return $textarea.val(); } catch (e) { return text; } }
function stopSlideshow() { if (slideshowInterval) { clearInterval(slideshowInterval); slideshowInterval = null; $('.modal-play-btn').html('&#9658; Play'); } }

// === DEEP LINK CHECKER ===
function checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
        openCardByTitle(postId);
    }
}

// === DYNAMIC LIBRARY LOADER ===
function loadLibrary(url, type, checkObj) {
    return new Promise((resolve, reject) => {
        if (window[checkObj]) { resolve(); return; }
        if (type === 'js') {
            $.getScript(url).done(resolve).fail(reject);
        } else if (type === 'css') {
            $('<link>').appendTo('head').attr({type: 'text/css', rel: 'stylesheet', href: url});
            resolve();
        }
    });
}

// === SEO & META TAG INJECTION ===
function updateSocialMeta(title, desc, image) {
    const setMeta = (property, content) => { if (!content) return; let $tag = $(`meta[property="${property}"]`); if ($tag.length === 0) $tag = $(`meta[name="${property}"]`); if ($tag.length) $tag.attr('content', content); else $('head').append(`<meta property="${property}" content="${content}">`); };
    const cleanTitle = decodeText(title || "Content Viewer"); const cleanDesc = decodeText(desc || "View this content."); const cleanImage = image && !image.startsWith('http') ? window.location.origin + '/' + image : (image || "");
    setMeta('og:title', cleanTitle); setMeta('og:description', cleanDesc); if (cleanImage) setMeta('og:image', cleanImage); setMeta('og:type', 'article'); setMeta('og:url', window.location.href);
    setMeta('twitter:card', 'summary_large_image'); setMeta('twitter:title', cleanTitle); setMeta('twitter:description', cleanDesc); if (cleanImage) setMeta('twitter:image', cleanImage); document.title = cleanTitle;
}

// === CHESS CLEANUP HELPER (NAMESPACED) ===
function cleanUpChessListeners() {
    console.log("[DEBUG] Nuke Chess Listeners");
    
    // Nuke all namespaced events from document (Robust Fix)
    $(document).off('fullscreenchange.chessMode webkitfullscreenchange.chessMode mozfullscreenchange.chessMode MSFullscreenChange.chessMode');
    $(document).off('keydown.chessKeys');
    
    if (window.currentChessFSHandler) window.currentChessFSHandler = null;
    if (window.chessKeyHandler) window.chessKeyHandler = null;
    
    $('body').removeClass('chess-fullscreen-active chess-mode-active');
}

/* === CARD HIGHLIGHTER === */
function highlightActiveCard(index) {
    $('.selected-card-highlight').removeClass('selected-card-highlight');
    if (index >= 0 && index < currentCardList.length) {
        const $link = currentCardList[index];
        const $card = $link.closest('.card-item');
        if ($card.length) {
            $card.addClass('selected-card-highlight');
        }
    }
}

/* === VIEW HELPERS (GLOBAL) === */
function handleCardView($scope, initialLoadOverride, incrementOverride) {
    $scope.find('.card-list').each(function() {
        const $list = $(this); const $items = $list.children('.card-item'); const totalItems = $items.length; const initialLimit = parseInt(initialLoadOverride) || 10; const increment = parseInt(incrementOverride) || 10; 
        $list.next('.toggle-card-button').remove(); 
        if (totalItems > initialLimit) { $items.slice(initialLimit).addClass('hidden-card-item'); const remaining = totalItems - initialLimit; const $button = $(`<button class="toggle-card-button">Show More (${remaining} more) \u25BC</button>`); $button.data({ 'visible-count': initialLimit, 'increment': increment, 'total-items': totalItems }); $list.after($button); }
    });
}
function showMoreCards($button, $list) {
    const $items = $list.children('.card-item'); const totalItems = parseInt($button.data('total-items') || 0); const increment = parseInt($button.data('increment') || 10); const visibleCount = parseInt($button.data('visible-count') || 0); const newVisibleCount = visibleCount + increment;
    $items.slice(visibleCount, newVisibleCount).removeClass('hidden-card-item'); $button.data('visible-count', newVisibleCount); const remaining = totalItems - newVisibleCount; if (remaining <= 0) { $button.hide(); } else { $button.text(`Show More (${remaining} more) \u25BC`); }
}

/* === ANIMATION HELPERS (GLOBAL) === */
function animateModalOpen() {
    const $modal = $('#content-modal'); const $content = $modal.find('.modal-content'); $modal.removeClass('fading-out'); $content.removeClass('modal-animate-leave'); 
    $modal.attr('tabindex', '-1').css('display', 'flex').css('opacity', '1').focus(); 
    requestAnimationFrame(() => { $content.addClass('modal-animate-enter'); setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100); setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 800); });
}
function animateModalClose() {
    const $modal = $('#content-modal'); const $content = $modal.find('.modal-content'); $content.removeClass('modal-animate-enter').addClass('modal-animate-leave'); $modal.addClass('fading-out'); 
    cleanUpChessListeners(); 
    $('.selected-card-highlight').removeClass('selected-card-highlight'); 
    setTimeout(function() { $modal.hide(); $modal.removeClass('fading-out'); $content.removeClass('modal-animate-leave'); $('#modal-content-area').html(''); }, 300); 
}

/* === PERSISTENCE LOGIC (GLOBAL) === */
function applyInfoState() {
    const $infoBtn = $('.modal-info-btn'); const $infoDiv = $('.modal-photo-info');
    if (window.cardGlobalState.infoVisible) $infoBtn.addClass('active'); else $infoBtn.removeClass('active');
    if ($infoDiv.length) {
        if (window.cardGlobalState.infoVisible) { $infoDiv.css({ display: 'block', opacity: 1, pointerEvents: 'auto' }); $infoDiv.addClass('visible'); } 
        else { $infoDiv.css({ display: 'none', opacity: 0, pointerEvents: 'none' }); $infoDiv.removeClass('visible'); }
    }
}

/* === MODAL KEY HANDLER (GLOBAL) === */
window.handleModalKeys = function(e) {
    if (!$('#content-modal').is(':visible')) { $(document).off('keydown.modalNav'); return; } if ($(e.target).is('input, textarea, select')) return;
    if (isTutorialMode && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ")) { return; }
    
    // Check chess mode to avoid double moves
    const isChessMode = $('#content-modal').hasClass('chess-mode');
    if (isChessMode && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ")) { return; }
    
    switch (e.key) { 
        case "Escape": 
            if (!document.fullscreenElement) { $('.modal-close-btn').first().click(); }
            break; 
        case "ArrowLeft": 
            if (!isTutorialMode) { $('.modal-prev-btn').first().click(); } 
            break; 
        case "ArrowRight": 
            if (!isTutorialMode) { $('.modal-next-btn').first().click(); } 
            break; 
        case " ": 
            if(e.preventDefault) e.preventDefault(); 
            if (!isTutorialMode) { $('.modal-next-btn').first().click(); } 
            break; 
        case "i": if(e.preventDefault) e.preventDefault(); $('.modal-info-btn').first().click(); break; 
        case "f": if(e.preventDefault) e.preventDefault(); $('.modal-fullscreen-btn').first().click(); break; 
        case "ArrowUp": if(isTutorialMode) { const $iframe = $('#modal-content-area iframe'); try { $iframe[0].contentDocument.body.classList.add('nav-visible'); } catch(e){} } break;
        case "ArrowDown": if(isTutorialMode) { const $iframe = $('#modal-content-area iframe'); try { $iframe[0].contentDocument.body.classList.remove('nav-visible'); } catch(e){} } break;
    }
};

/* === HELP OVERLAY === */
function showKeyboardShortcuts() {
    const $modalContent = $('#modal-content-area');
    if ($modalContent.find('.help-overlay').length) { $modalContent.find('.help-overlay').remove(); return; }
    const helpHtml = `<div class="help-overlay" onclick="$(this).remove()"><div class="help-box" onclick="event.stopPropagation()"><h2>Keyboard Shortcuts</h2><ul class="help-list"><li><span class="help-desc">Next Slide</span> <span class="help-key">Right Arrow / Space</span></li><li><span class="help-desc">Previous Slide</span> <span class="help-key">Left Arrow</span></li><li><span class="help-desc">Toggle Info</span> <span class="help-key">I</span></li><li><span class="help-desc">Full Screen</span> <span class="help-key">F</span></li><li><span class="help-desc">Close Modal</span> <span class="help-key">Esc</span></li><li><span class="help-desc">Tutorial Nav Show</span> <span class="help-key">Up Arrow</span></li><li><span class="help-desc">Tutorial Nav Hide</span> <span class="help-key">Down Arrow</span></li></ul><button onclick="$(this).closest('.help-overlay').remove()" style="margin-top:20px; width:100%; padding:10px; background:rgba(255,255,255,0.2); border:none; color:#fff; cursor:pointer;">Close</button></div></div>`;
    $modalContent.append(helpHtml); $modalContent.find('.help-overlay').fadeIn(200);
}

/* === TABLE & CHART BUILDERS (OMITTED FOR BREVITY - SAME AS BEFORE) === */
window.buildTableModal = function(jsonUrl) { const $modalContent = $('#modal-content-area'); $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>'); loadLibrary('https://unpkg.com/tabulator-tables@5.5.0/dist/js/tabulator.min.js', 'js', 'Tabulator').then(() => { $.getJSON(jsonUrl, function(data) { let tableData = data.data; if (!tableData && data.rows) { tableData = data.rows.map(row => { let obj = {}; data.columns.forEach((col, index) => { const fieldName = typeof col === 'object' ? col.field : col; obj[fieldName] = row[index]; }); return obj; }); } if (!tableData) { $modalContent.html('<div class="error-message">Invalid table data format.</div>'); return; } const tableId = 'tabulator-table-' + Date.now(); const tableHtml = `<div class="markdown-wrapper" style="padding:20px; background:#fff; display:flex; flex-direction:column; height:100%;"><h2 style="margin-top:0; color:#333;">${data.title || 'Data Table'}</h2><p style="color:#666; margin-bottom:15px;">${data.description || ''}</p><div id="${tableId}" style="flex:1;"></div></div>`; $modalContent.html(tableHtml); new Tabulator("#" + tableId, { data: tableData, layout: "fitColumns", responsiveLayout: "collapse", pagination: "local", paginationSize: 15, movableColumns: true, columns: data.columns.map(col => { if (typeof col === 'string') return { title: col, field: col }; if (col.formatter === "linkButton") { col.formatter = function(cell, formatterParams, onRendered){ const val = cell.getValue(); if(!val) return ""; const parts = val.split(':'); if(parts[0] !== 'link') return val; return `<button class="table-action-btn" style="padding:4px 10px; background:var(--text-accent); border:none; border-radius:4px; cursor:pointer; font-weight:bold;" onclick="window.openFromTable('${parts[1]}', '${parts[2]}')">${parts[3] || 'Open'}</button>`; }; } return col; }), }); }).fail(() => $modalContent.html('<div class="error-message">Error loading JSON data.</div>')); }).catch(() => $modalContent.html('<div class="error-message">Failed to load Tabulator.</div>')); };
window.buildChartModal = function(jsonUrl) { const $modalContent = $('#modal-content-area'); $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>'); loadLibrary('https://cdn.jsdelivr.net/npm/chart.js', 'js', 'Chart').then(() => { $.getJSON(jsonUrl, function(data) { const chartId = 'chart-canvas-' + Date.now(); $modalContent.html(`<div class="markdown-wrapper" style="padding:20px; background:#fff; display:flex; flex-direction:column; height:100%;"><h2 style="margin-top:0; color:#333;">${data.title || 'Financial Chart'}</h2><div class="chart-container" style="flex:1; position:relative;"><canvas id="${chartId}"></canvas></div></div>`); const ctx = document.getElementById(chartId).getContext('2d'); new Chart(ctx, { type: 'line', data: { labels: data.labels, datasets: data.datasets.map(ds => { if (ds.label.includes('Bollinger')) { ds.borderColor = 'rgba(100, 100, 100, 0.3)'; ds.backgroundColor = 'rgba(100, 100, 100, 0.05)'; ds.fill = ds.label.includes('Lower') ? '-1' : false; ds.pointRadius = 0; ds.borderWidth = 1; } else if (ds.label.includes('SMA') || ds.label.includes('EMA')) { ds.borderWidth = 2; ds.pointRadius = 0; } else if (ds.type === 'bar') { ds.yAxisID = 'y-volume'; ds.backgroundColor = 'rgba(52, 152, 219, 0.5)'; } return ds; }) }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { type: 'linear', display: true, position: 'right', title: { display:true, text:'Price' } }, 'y-volume': { type: 'linear', display: false, position: 'left', min: 0, max: Math.max(...data.datasets.find(d=>d.type==='bar')?.data || [100]) * 4 } } } }); }).fail(() => $modalContent.html('<div class="error-message">Error loading chart data.</div>')); }).catch(() => $modalContent.html('<div class="error-message">Failed to load Chart.js.</div>')); };
window.openFromTable = function(type, id) { const $modal = $('#content-modal'); const $modalContent = $('#modal-content-area'); if (type === 'chess') { window.loadChessGame(id, $modal, $modalContent); } else if (type === 'tutorial') { isTutorialMode = true; $('.modal-prev-btn, .modal-next-btn').hide(); let playerFile = "text_tutorial_player.html"; if (id.toLowerCase().endsWith('.xml') || id.includes('x-plain')) { playerFile = "tutorial_player.html"; } const playerHtml = `<div class="iframe-wrapper" style="height:100%; width:100%; position:relative;"><iframe src="${playerFile}?manifest=${encodeURIComponent(id)}" class="loaded-iframe" style="border:none; width:100%; height:100%;" onload="try{const d=this.contentDocument;d.addEventListener('keydown',function(e){window.parent.handleModalKeys({key:e.key});});const s=d.createElement('style');s.innerHTML='body{overflow-x:hidden;margin:0;padding:0;width:100%;}.nav-bar,.controls,footer,.navbar{position:relative!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important;left:0!important;right:0!important;z-index:1000!important;transition:opacity 0.3s!important;opacity:1!important;pointer-events:auto;}body.fs-mode .nav-bar,body.fs-mode .controls,body.fs-mode footer{position:absolute!important;bottom:0!important;left:0!important;right:0!important;width:100%!important;opacity:0!important;pointer-events:none!important;}body.fs-mode.nav-visible .nav-bar,body.fs-mode.nav-visible .controls,body.fs-mode.nav-visible footer{opacity:1!important;pointer-events:auto!important;}';d.head.appendChild(s);}catch(e){}"></iframe></div><button class="tutorial-custom-close-btn" style="position:absolute; top:10px; right:10px; z-index:2000; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:1.2rem;" onclick="window.buildTableModal('${currentTableJsonUrl}')">&times;</button>`; $modalContent.html(playerHtml); $('.tutorial-fs-toggle').remove(); $('body').append('<button class="tutorial-fs-toggle" title="Toggle Controls" style="display:none;">&#9881;</button>'); $modalContent.find('.iframe-wrapper').on('dblclick', function() { if (document.fullscreenElement) document.exitFullscreen(); }); } };
var currentTableJsonUrl = "";
window.loadChessGame = function(loadUrl, $modal, $modalContent) { cleanUpChessListeners(); if (loadUrl.includes('github.com') && loadUrl.includes('/blob/')) { loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/'); } $modal.addClass('chess-mode'); $('body').addClass('chess-mode-active'); $modal.find('.modal-header').hide(); if (typeof window.startChessGame === 'function') { window.startChessGame(loadUrl, $modal, $modalContent); } else { $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>'); $.getScript('common/chess_logic.js').done(function() { window.startChessGame(loadUrl, $modal, $modalContent); }).fail(function() { $modalContent.html('<div class="error-message">Failed to load chess logic.</div>'); }); } };
window.buildResearchModal = function(jsonUrl) { const $modalContent = $('#modal-content-area'); $modalContent.html(`<div class="tab-nav" id="research-tab-nav-modal"></div><div class="tab-content" id="research-tab-content-modal"><div class="content-loader"><div class="spinner"></div></div></div>`); $.getJSON(jsonUrl, function (data) { $('#content-modal .open-new-window').attr('href', jsonUrl); const $tabNav = $('#research-tab-nav-modal'); $tabNav.empty(); $.each(data.tickers, function(index, ticker) { const $button = $(`<button class="tab-button"></button>`); $button.text(ticker.name); $button.attr('data-content-url', ticker.contentUrl); if (index === 0) { $button.addClass('active'); loadModalTabContent(ticker.contentUrl); } $tabNav.append($button); }); }).fail(function() { $modalContent.html('<div class="error-message">Error loading research data.</div>'); }); }
window.loadModalTabContent = function(htmlUrl) { $('#content-modal .open-new-window').attr('href', htmlUrl); $('#research-tab-content-modal').html(`<div class="iframe-wrapper"><iframe src="${htmlUrl}" class="loaded-iframe"></iframe></div>`); }

/* === --- EVENT LISTENERS (DELEGATED) --- === */
$(document).ready(function () {
    injectModalStyles();
    $('body').append(`<div id="content-modal" class="modal-backdrop"><div class="modal-content"><div class="modal-header"><div class="modal-nav-left"><button class="modal-prev-btn" title="Previous (Left Arrow)">&larr; Prev</button><button class="modal-next-btn" title="Next (Right Arrow/Spacebar)">Next &rarr;</button><button class="modal-info-btn" title="Toggle Info (I)">Info</button><button class="modal-help-btn" title="Keyboard Shortcuts" onclick="showKeyboardShortcuts()">?</button><div class="slideshow-controls" style="display:none; margin-right:10px;"><button class="modal-play-btn" title="Start Slideshow">&#9658; Play</button><select class="slideshow-speed" title="Slideshow Speed"><option value="3000">3s</option><option value="5000" selected>5s</option><option value="10000">10s</option><option value="20000">20s</option></select></div></div><div class="modal-nav-right"><button class="modal-fullscreen-btn" title="Full Screen" style="display:none; font-size:1.1rem; margin-right:10px;">&#x26F6; Full Screen</button><a href="#" class="open-new-window" style="display:none;" target="_blank" rel="noopener noreferrer"></a><button class="modal-close-btn" title="Close (Esc)">&times; Close</button></div></div><div id="modal-content-area"></div></div></div>`);

    // FIX: PREVENT DOUBLE BINDING WITH .off()
    $('body').off('click', '.toggle-card-button').on('click', '.toggle-card-button', function() { const $button = $(this); const $list = $button.prev('.card-list'); if ($list.length) { showMoreCards($button, $list); } });
    
    $('body').off('click', '.card-item, .item').on('click', '.card-item, .item', function(e) { 
        const $clickedCard = $(this); 
        const $link = $clickedCard.find('a').first(); 
        if (!$link.length) return; 
        const $clickedLink = $(e.target).closest('a'); 
        if ($clickedLink.length > 0 && !$clickedLink.is($link)) return; 
        e.preventDefault(); 
        e.stopPropagation(); 
        
        const $cardList = $clickedCard.closest('.card-list'); 
        const $allVisibleCards = $cardList.children('.card-item:visible, .item:visible'); 
        currentCardList = []; 
        $allVisibleCards.each(function() { currentCardList.push($(this).find('a').first()); }); 
        currentCardIndex = $allVisibleCards.index($clickedCard); 
        
        if (currentCardList.length > 0) { 
            window.loadModalContent(currentCardIndex); 
            window.animateModalOpen(); 
            $(document).on('keydown.modalNav', window.handleModalKeys); 
        } 
    });

    $('body').off('click', '.modal-close-btn').on('click', '.modal-close-btn', function() { window.stopSlideshow(); window.animateModalClose(); currentCardList = []; currentCardIndex = 0; isTutorialMode = false; $(document).off('keydown.modalNav'); $('#content-modal').find('.modal-header').removeAttr('style'); });
    $('body').off('click', '#content-modal').on('click', '#content-modal', function(e) { if (e.target.id === 'content-modal') { $(this).find('.modal-close-btn').first().click(); } });
    
    $('body').off('click', '.modal-play-btn').on('click', '.modal-play-btn', function() { 
        $(this).blur();
        if (slideshowInterval) { window.stopSlideshow(); } else { $(this).html('&#10074;&#10074; Pause'); const speed = parseInt($('.slideshow-speed').val()) || 5000; if (currentCardIndex < currentCardList.length - 1) $('.modal-next-btn').click(); else currentCardIndex = -1; slideshowInterval = setInterval(function() { if (currentCardIndex < currentCardList.length - 1) { $('.modal-next-btn').click(); } else { window.stopSlideshow(); } }, speed); } 
    });
    $('body').off('change', '.slideshow-speed').on('change', '.slideshow-speed', function() { if (slideshowInterval) { $('.modal-play-btn').click(); setTimeout(() => { $('.modal-play-btn').click(); }, 100); } });
    
    // FIX: Full Screen Logic with Unbind and Debounce
    $('body').off('click', '.modal-fullscreen-btn').on('click', '.modal-fullscreen-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const btn = $(this);
        
        // DEBOUNCE CHECK
        if (btn.data('is-processing')) {
            console.log("--- DEBUG: FS Click Ignored (Debounce) ---");
            return;
        }
        btn.data('is-processing', true);
        setTimeout(() => btn.data('is-processing', false), 1000); // 1s cooldown

        console.log("--- DEBUG: FS BUTTON CLICKED ---");
        btn.blur();
        const wrapper = document.querySelector('#modal-content-area .image-wrapper') || 
                        document.querySelector('#modal-content-area .iframe-wrapper') || 
                        document.querySelector('#modal-content-area .markdown-wrapper'); 
        const target = wrapper || document.getElementById('modal-content-area');
        
        console.log("Current FS Element:", document.fullscreenElement);
        
        if (document.fullscreenElement) { 
            console.log("Exiting FS...");
            document.exitFullscreen(); 
        } else { 
            console.log("Requesting FS for:", target);
            if (target && target.requestFullscreen) { 
                target.requestFullscreen().then(() => { 
                    console.log("FS Request Success");
                    if(isTutorialMode) { 
                        const $iframe = $('#modal-content-area iframe'); 
                        if($iframe.length) { try { const doc = $iframe[0].contentDocument; doc.body.classList.add('fs-mode'); $('.tutorial-fs-toggle').fadeIn(); } catch(e){} } 
                    }
                    if (wrapper) wrapper.focus();
                    else if (target) target.focus();
                    else window.focus(); 
                }).catch(err => console.log("FS Request Error:", err)); 
            } 
        }
    });

    $('body').off('click', '.tutorial-fs-toggle').on('click', '.tutorial-fs-toggle', function() { 
        $(this).blur();
        const $iframe = $('#modal-content-area iframe'); if($iframe.length) { try { const doc = $iframe[0].contentDocument; doc.body.classList.toggle('nav-visible'); } catch(e) {} } 
    });
    
    // Global listener - careful with duplicates here too
    // We cannot easily 'off' an anonymous listener on document, but this one is benign
    document.addEventListener('fullscreenchange', (event) => { 
        console.log("--- DEBUG: GLOBAL FS CHANGE EVENT FIRED ---", document.fullscreenElement);
        if (!document.fullscreenElement) { 
            $('.tutorial-fs-toggle').hide(); 
            const $iframe = $('#modal-content-area iframe'); 
            if($iframe.length) { try { const doc = $iframe[0].contentDocument; doc.body.classList.remove('fs-mode', 'nav-visible'); } catch(e){} } 
        } 
    });

    $('body').off('click', '.modal-prev-btn').on('click', '.modal-prev-btn', function() { $(this).blur(); window.stopSlideshow(); if (currentCardIndex > 0) window.loadModalContent(currentCardIndex - 1); });
    $('body').off('click', '.modal-next-btn').on('click', '.modal-next-btn', function() { $(this).blur(); if (currentCardIndex < currentCardList.length - 1) window.loadModalContent(currentCardIndex + 1); else window.stopSlideshow(); });
    
    $('body').off('click', '.modal-info-btn').on('click', '.modal-info-btn', function() { 
        $(this).blur();
        const $infoBtn = $(this); const manifestUrl = $infoBtn.data('manifest-url'); 
        if (manifestUrl) { window.buildTutorialSummary(manifestUrl, $('#modal-content-area')); } 
        else { 
            window.cardGlobalState.infoVisible = !window.cardGlobalState.infoVisible; 
            window.applyInfoState(); 
        } 
    });

    $('body').off('input', '#youtube-search-box').on('input', '#youtube-search-box', filterYouTubeCards); $('body').off('change', '#youtube-keyword-filter').on('change', '#youtube-keyword-filter', filterYouTubeCards);
    $('body').off('input', '#post-search-box').on('input', '#post-search-box', () => window.filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10)); $('body').off('change', '#post-category-filter').on('change', '#post-category-filter', () => window.filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10)); $('body').off('change', '#post-keyword-filter').on('change', '#post-keyword-filter', () => window.filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10));
    $('body').off('input', '#album-search-box').on('input', '#album-search-box', () => window.filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20)); $('body').off('change', '#album-category-filter').on('change', '#album-category-filter', () => window.filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20)); $('body').off('change', '#album-keyword-filter').on('change', '#album-keyword-filter', () => window.filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20));
    $('#content-modal').off('click', '.tab-button').on('click', '.tab-button', function() { $(this).siblings().removeClass('active'); $(this).addClass('active'); const htmlUrl = $(this).data('content-url'); window.loadModalTabContent(htmlUrl, '#research-tab-content-modal'); });
});
