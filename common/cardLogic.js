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
    $('body').removeClass('chess-fullscreen-active'); 
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
    
    // --- CHESS MODE DOUBLE-MOVE FIX ---
    const isChessMode = $('#content-modal').hasClass('chess-mode');
    if (isChessMode) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ") {
            return; // Let the Chess library handle it.
        }
    }
    
    switch (e.key) { 
        case "Escape": 
            if (!document.fullscreenElement) {
                $('.modal-close-btn').first().click(); 
            }
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

/* === ADVANCED TABLE BUILDER (TABULATOR) === */
window.buildTableModal = function(jsonUrl) {
    const $modalContent = $('#modal-content-area');
    $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>');

    loadLibrary('https://unpkg.com/tabulator-tables@5.5.0/dist/js/tabulator.min.js', 'js', 'Tabulator')
        .then(() => {
            $.getJSON(jsonUrl, function(data) {
                // FIX: Handle both "data" (new) and "rows" (old) formats
                let tableData = data.data;
                if (!tableData && data.rows) {
                    tableData = data.rows.map(row => {
                        let obj = {};
                        data.columns.forEach((col, index) => {
                             const fieldName = typeof col === 'object' ? col.field : col; 
                             obj[fieldName] = row[index];
                        });
                        return obj;
                    });
                }
                if (!tableData) { 
                    $modalContent.html('<div class="error-message">Invalid table data format. Expected "data" array or "rows" array.</div>'); 
                    return; 
                }
                const tableId = 'tabulator-table-' + Date.now();
                const tableHtml = `
                    <div class="markdown-wrapper" style="padding:20px; background:#fff; display:flex; flex-direction:column; height:100%;">
                        <h2 style="margin-top:0; color:#333;">${data.title || 'Data Table'}</h2>
                        <p style="color:#666; margin-bottom:15px;">${data.description || ''}</p>
                        <div id="${tableId}" style="flex:1;"></div>
                    </div>`;
                $modalContent.html(tableHtml);

                new Tabulator("#" + tableId, {
                    data: tableData,
                    layout: "fitColumns",
                    responsiveLayout: "collapse",
                    pagination: "local",
                    paginationSize: 15,
                    movableColumns: true,
                    columns: data.columns.map(col => {
                        if (typeof col === 'string') return { title: col, field: col };
                        if (col.formatter === "linkButton") {
                            col.formatter = function(cell, formatterParams, onRendered){
                                const val = cell.getValue();
                                if(!val) return "";
                                const parts = val.split(':'); 
                                if(parts[0] !== 'link') return val;
                                return `<button class="table-action-btn" style="padding:4px 10px; background:var(--text-accent); border:none; border-radius:4px; cursor:pointer; font-weight:bold;" onclick="window.openFromTable('${parts[1]}', '${parts[2]}')">${parts[3] || 'Open'}</button>`;
                            };
                        }
                        return col;
                    }),
                });
            }).fail(() => $modalContent.html('<div class="error-message">Error loading JSON data.</div>'));
        })
        .catch(() => $modalContent.html('<div class="error-message">Failed to load Tabulator library.</div>'));
};

/* === ADVANCED CHART BUILDER (CHART.JS) === */
window.buildChartModal = function(jsonUrl) {
    const $modalContent = $('#modal-content-area');
    $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>');

    loadLibrary('https://cdn.jsdelivr.net/npm/chart.js', 'js', 'Chart')
        .then(() => {
            $.getJSON(jsonUrl, function(data) {
                const chartId = 'chart-canvas-' + Date.now();
                $modalContent.html(`
                    <div class="markdown-wrapper" style="padding:20px; background:#fff; display:flex; flex-direction:column; height:100%;">
                        <h2 style="margin-top:0; color:#333;">${data.title || 'Financial Chart'}</h2>
                        <div class="chart-container" style="flex:1; position:relative;">
                            <canvas id="${chartId}"></canvas>
                        </div>
                    </div>
                `);
                const ctx = document.getElementById(chartId).getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: data.datasets.map(ds => {
                            if (ds.label.includes('Bollinger')) {
                                ds.borderColor = 'rgba(100, 100, 100, 0.3)';
                                ds.backgroundColor = 'rgba(100, 100, 100, 0.05)';
                                ds.fill = ds.label.includes('Lower') ? '-1' : false;
                                ds.pointRadius = 0;
                                ds.borderWidth = 1;
                            } else if (ds.label.includes('SMA') || ds.label.includes('EMA')) {
                                ds.borderWidth = 2;
                                ds.pointRadius = 0;
                            } else if (ds.type === 'bar') {
                                ds.yAxisID = 'y-volume';
                                ds.backgroundColor = 'rgba(52, 152, 219, 0.5)';
                            }
                            return ds;
                        })
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        scales: {
                            y: { type: 'linear', display: true, position: 'right', title: { display:true, text:'Price' } },
                            'y-volume': { type: 'linear', display: false, position: 'left', min: 0, max: Math.max(...data.datasets.find(d=>d.type==='bar')?.data || [100]) * 4 }
                        }
                    }
                });
            }).fail(() => $modalContent.html('<div class="error-message">Error loading chart data.</div>'));
        })
        .catch(() => $modalContent.html('<div class="error-message">Failed to load Chart.js.</div>'));
};

window.openFromTable = function(type, id) {
    const $modal = $('#content-modal');
    const $modalContent = $('#modal-content-area');
    if (type === 'chess') {
        window.loadChessGame(id, $modal, $modalContent);
    } else if (type === 'tutorial') {
        isTutorialMode = true;
        $('.modal-prev-btn, .modal-next-btn').hide();
        let playerFile = "text_tutorial_player.html"; 
        if (id.toLowerCase().endsWith('.xml') || id.includes('x-plain')) { playerFile = "tutorial_player.html"; }
        const playerHtml = `<div class="iframe-wrapper" style="height:100%; width:100%; position:relative;"><iframe src="${playerFile}?manifest=${encodeURIComponent(id)}" class="loaded-iframe" style="border:none; width:100%; height:100%;" onload="try{const d=this.contentDocument;d.addEventListener('keydown',function(e){window.parent.handleModalKeys({key:e.key});});const s=d.createElement('style');s.innerHTML='body{overflow-x:hidden;margin:0;padding:0;width:100%;}.nav-bar,.controls,footer,.navbar{position:relative!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin:0!important;left:0!important;right:0!important;z-index:1000!important;transition:opacity 0.3s!important;opacity:1!important;pointer-events:auto;}body.fs-mode .nav-bar,body.fs-mode .controls,body.fs-mode footer{position:absolute!important;bottom:0!important;left:0!important;right:0!important;width:100%!important;opacity:0!important;pointer-events:none!important;}body.fs-mode.nav-visible .nav-bar,body.fs-mode.nav-visible .controls,body.fs-mode.nav-visible footer{opacity:1!important;pointer-events:auto!important;}';d.head.appendChild(s);}catch(e){}"></iframe></div><button class="tutorial-custom-close-btn" style="position:absolute; top:10px; right:10px; z-index:2000; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:1.2rem;" onclick="window.buildTableModal('${currentTableJsonUrl}')">&times;</button>`;
        $modalContent.html(playerHtml);
        $('.tutorial-fs-toggle').remove(); 
        $('body').append('<button class="tutorial-fs-toggle" title="Toggle Controls" style="display:none;">&#9881;</button>');
        $modalContent.find('.iframe-wrapper').on('dblclick', function() { if (document.fullscreenElement) document.exitFullscreen(); });
    }
};

var currentTableJsonUrl = "";

/* === CHESS LOADER (GLOBAL) === */
window.loadChessGame = function(loadUrl, $modal, $modalContent) { 
    if (loadUrl.includes('github.com') && loadUrl.includes('/blob/')) { loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/'); } 
    $modal.addClass('chess-mode'); $('body').addClass('chess-mode-active'); $modal.find('.modal-header').hide(); 
    if (typeof window.startChessGame === 'function') {
        window.startChessGame(loadUrl, $modal, $modalContent);
    } else {
        $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>');
        $.getScript('common/chess_logic.js').done(function() { window.startChessGame(loadUrl, $modal, $modalContent); })
         .fail(function() { $modalContent.html('<div class="error-message">Failed to load chess logic.</div>'); });
    }
};

/* === RESEARCH LOADER (GLOBAL) === */
window.buildResearchModal = function(jsonUrl) { const $modalContent = $('#modal-content-area'); $modalContent.html(`<div class="tab-nav" id="research-tab-nav-modal"></div><div class="tab-content" id="research-tab-content-modal"><div class="content-loader"><div class="spinner"></div></div></div>`); $.getJSON(jsonUrl, function (data) { $('#content-modal .open-new-window').attr('href', jsonUrl); const $tabNav = $('#research-tab-nav-modal'); $tabNav.empty(); $.each(data.tickers, function(index, ticker) { const $button = $(`<button class="tab-button"></button>`); $button.text(ticker.name); $button.attr('data-content-url', ticker.contentUrl); if (index === 0) { $button.addClass('active'); loadModalTabContent(ticker.contentUrl); } $tabNav.append($button); }); }).fail(function() { $modalContent.html('<div class="error-message">Error loading research data.</div>'); }); }
window.loadModalTabContent = function(htmlUrl) { $('#content-modal .open-new-window').attr('href', htmlUrl); $('#research-tab-content-modal').html(`<div class="iframe-wrapper"><iframe src="${htmlUrl}" class="loaded-iframe"></iframe></div>`); }


/* === MODAL CONTENT LOADER (GLOBAL) === */
function loadModalContent(index) {
    if (index < 0 || index >= currentCardList.length) return;
    const $link = currentCardList[index]; if (!$link.length) return;
    
    currentCardIndex = index;
    const $modal = $('#content-modal'); const $modalContent = $('#modal-content-area'); const $modalInfoBtn = $modal.find('.modal-info-btn'); const $modalPlayControls = $modal.find('.slideshow-controls'); const $modalFsBtn = $modal.find('.modal-fullscreen-btn'); const $modalOpenLink = $modal.find('.open-new-window');

    $modal.find('.modal-header').removeAttr('style'); $modal.removeClass('chess-mode research-mode'); $('body').removeClass('chess-mode-active'); $modalOpenLink.hide(); 
    $('.modal-prev-btn, .modal-next-btn').show();
    
    isTutorialMode = false; $modalInfoBtn.removeData('manifest-url'); $modalContent.removeClass('summary-view-active'); $modalContent.find('.tutorial-summary-overlay, .modal-photo-info').remove(); 
    $('body').off('click.tutorialNav'); $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>');
    
    $('.tutorial-fs-toggle').remove();
    
    let loadUrl = $link.attr('href'); let loadType = $link.data('load-type'); const jsonUrl = $link.data('json-url'); const manifestUrl = $link.data('manifest-url');
    
    if (!loadType) {
        if (/\.(jpg|jpeg|png|gif)$/i.test(loadUrl)) loadType = 'image'; 
        else if (/\.md$/i.test(loadUrl)) loadType = 'markdown'; 
        else if (/\.pgn$/i.test(loadUrl)) loadType = 'chess';
        else if (/\.json$/i.test(loadUrl) && !manifestUrl) loadType = 'table';
        else if (loadUrl.endsWith('.html')) loadType = 'html'; 
        else if (loadUrl.startsWith('http')) { if (loadUrl.includes('github.com') || loadUrl.includes('google.com')) loadType = 'blocked'; else loadType = 'iframe'; } else loadType = 'newtab'; 
    }

    if (loadType === 'image') { $modalPlayControls.show(); } else { $modalPlayControls.hide(); stopSlideshow(); }
    if (loadType === 'image' || loadType === 'iframe' || loadType === 'markdown' || loadType === 'tutorial') { $modalFsBtn.show(); } else { $modalFsBtn.hide(); }

    if (loadType === 'research' && jsonUrl) { $modal.addClass('research-mode'); $modalFsBtn.hide(); $modalInfoBtn.hide(); window.buildResearchModal(jsonUrl); return; } 
    
    if (loadType === 'table') { $modalFsBtn.hide(); $modalInfoBtn.hide(); currentTableJsonUrl = loadUrl; window.buildTableModal(loadUrl); return; }
    if (loadType === 'chart') { $modalFsBtn.hide(); $modalInfoBtn.hide(); window.buildChartModal(jsonUrl || loadUrl); return; }

    if (loadType === 'tutorial' && manifestUrl) {
        isTutorialMode = true; $modalInfoBtn.show(); $modalInfoBtn.data('manifest-url', manifestUrl); $modalInfoBtn.removeClass('active'); $modal.addClass('research-mode'); 
        $('.modal-prev-btn, .modal-next-btn').hide();
        let playerFile = "text_tutorial_player.html"; 
        if (manifestUrl.toLowerCase().endsWith('.xml') || manifestUrl.includes('x-plain')) { playerFile = "tutorial_player.html"; }
        const playerHtml = `<div class="iframe-wrapper" style="height:100%; width:100%; position:relative;"><iframe src="${playerFile}?manifest=${encodeURIComponent(manifestUrl)}" class="loaded-iframe" style="border:none; width:100%; height:100%;" onload="try{ const d = this.contentDocument; d.addEventListener('keydown', function(e) { window.parent.handleModalKeys({ key: e.key }); }); const s = d.createElement('style'); s.innerHTML = 'body { overflow-x: hidden; margin: 0; padding: 0; width: 100%; } .nav-bar, .controls, footer, .navbar { position: relative !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; margin: 0 !important; left: 0 !important; right: 0 !important; z-index: 1000 !important; transition: opacity 0.3s !important; opacity: 1 !important; pointer-events: auto; } body.fs-mode .nav-bar, body.fs-mode .controls, body.fs-mode footer { position: absolute !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; opacity: 0 !important; pointer-events: none !important; } body.fs-mode.nav-visible .nav-bar, body.fs-mode.nav-visible .controls, body.fs-mode.nav-visible footer { opacity: 1 !important; pointer-events: auto !important; }'; d.head.appendChild(s); }catch(e){}"></iframe></div>`;
        $modalContent.html(playerHtml);
        $('body').append('<button class="tutorial-fs-toggle" title="Toggle Controls" style="display:none;">&#9881;</button>');
        $modalContent.find('.iframe-wrapper').on('dblclick', function() { if (document.fullscreenElement) document.exitFullscreen(); });
        const $card = currentCardList[currentCardIndex].closest('.card-item');
        updateSocialMeta($card.find('h3').text(), $card.find('p').text(), $card.find('img').attr('src'));
        return;
    }

    $modalInfoBtn.show(); 
    if ((loadType === 'markdown' || loadType === 'chess') && loadUrl.includes('github.com') && loadUrl.includes('/blob/')) { loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/'); }

    const customHeight = $link.data('height') || '90vh'; const $card = currentCardList[currentCardIndex].closest('.card-item'); const title = $card.find('h3').text() || $card.find('img').attr('alt') || $card.data('title'); const desc = $card.find('p').text() || $card.data('desc'); const thumbUrl = $card.find('img').attr('src');
    updateSocialMeta(title, desc, thumbUrl);

    let infoHtml = '';
    if (title || desc) { 
        const visibleStyle = window.cardGlobalState.infoVisible ? 'display:block !important; opacity:1 !important; pointer-events:auto;' : 'display:none; opacity:0; pointer-events:none;';
        infoHtml = `<div class="modal-photo-info raised-layer" style="${visibleStyle}"><h3>${title}</h3><p>${desc}</p></div>`;
    }
    
    if(window.cardGlobalState.infoVisible) $modalInfoBtn.addClass('active'); else $modalInfoBtn.removeClass('active');
    if (!title && !desc) $modalInfoBtn.hide();

    if (loadType === 'chess') { 
        $('.modal-prev-btn, .modal-next-btn').hide();
        window.loadChessGame(loadUrl, $modal, $modalContent); 
        return; 
    }

    switch (loadType) {
        case 'markdown': $.ajax({ url: loadUrl, type: 'GET', dataType: 'text', success: function(markdownText) { const htmlContent = typeof marked !== 'undefined' ? marked.parse(markdownText) : '<p>Error: Marked.js library not loaded.</p>' + markdownText; $modalContent.html(`<div class="markdown-wrapper"><div class="markdown-body" style="padding: 20px; background: white; max-width: 800px; margin: 0 auto;">${htmlContent}</div></div>`); if (infoHtml) { $modalContent.append(infoHtml); } }, error: function() { $modalContent.html('<div class="error-message">Could not load Markdown file.</div>'); } }); break;
        case 'html': $.ajax({ url: loadUrl, type: 'GET', success: function(data) { $modalContent.html(data); if (infoHtml) { $modalContent.append(infoHtml); } }, error: function() { $modalContent.html('<div class="error-message">Could not load content.</div>'); } }); break;
        case 'image':
            $modalContent.html(`<div class="image-wrapper"><img src="${loadUrl}" class="loaded-image" alt="Loaded content"></div>`); if (infoHtml) { $modalContent.append(infoHtml); }
            applyInfoState(); 
            // Fix: Cleaned up double click handler for full screen consistency
            $modalContent.find('.image-wrapper').off('dblclick').on('dblclick', function() { 
                $('.modal-fullscreen-btn').click(); 
            });
            break;
        case 'iframe': let iframeSrc = loadUrl; if (loadUrl.startsWith('http') && !loadUrl.includes('youtube.com') && !loadUrl.includes('youtu.be')) { iframeSrc = `https://mediamaze.com/p/?url=${encodeURIComponent(loadUrl)}`; } $modalContent.html(`<div class="iframe-wrapper"><iframe src="${iframeSrc}" class="loaded-iframe" style="height: ${customHeight};"></iframe></div>`); if (infoHtml) { $modalContent.append(infoHtml); } applyInfoState(); break;
        case 'blocked': $modalContent.html('<div class="error-message">This site blocks embedding. Please use "Open in new window".</div>'); break;
        default: $modalContent.html('<div class="error-message">This link cannot be opened here. Please use the "Open in new window" button.</div>'); break;
    }
    $('.modal-prev-btn').prop('disabled', index <= 0); $('.modal-next-btn').prop('disabled', index >= currentCardList.length - 1);
    $('#content-modal').focus();
}

/* === FILTERS & LOADERS (GLOBAL) === */
function populateCategoryFilter(listId, filterId) { const $filter = $(filterId); if (!$filter.length) return; const categoryCounts = {}; $(`${listId} .card-item`).each(function() { const categories = $(this).data('category'); if (categories) { String(categories).split(',').forEach(cat => { const cleanCat = cat.trim(); if (cleanCat) categoryCounts[cleanCat] = (categoryCounts[cleanCat] || 0) + 1; }); } }); const sortedCategories = Object.entries(categoryCounts).sort(([,a], [,b]) => b - a); $filter.children('option:not(:first)').remove(); sortedCategories.forEach(([key, count]) => { $filter.append($('<option>', { value: key, text: `${key} (${count})` })); }); }
function populateSmartKeywords(listId, filterId) { const $filter = $(filterId); if (!$filter.length) return; const stop = (typeof STOP_WORDS !== 'undefined') ? STOP_WORDS : new Set(['a', 'the']); const replace = (typeof REPLACEMENT_MAP !== 'undefined') ? REPLACEMENT_MAP : {}; const wordCounts = {}; $(`${listId} .card-item`).each(function() { const text = [$(this).find('h3').text(), $(this).find('p').text(), $(this).find('.card-category').text(), $(this).find('img').attr('alt'), $(this).data('category'), $(this).data('keywords')].map(t => String(t||'')).join(' '); const words = decodeText(text).split(/[^a-zA-Z0-9'-]+/); words.forEach(word => { let clean = word.toLowerCase().trim().replace(/[^a-z0-9]/gi, ''); if (replace[clean]) clean = replace[clean]; if (clean.length > 2 && clean.length <= 15 && !stop.has(clean) && isNaN(clean)) { wordCounts[clean] = (wordCounts[clean] || 0) + 1; } }); }); const sorted = Object.entries(wordCounts).sort(([,a], [,b]) => b - a).slice(0, 30); $filter.children('option:not(:first)').remove(); sorted.forEach(([key, count]) => { $filter.append($('<option>', { value: key, text: `${key} (${count})` })); }); }
function getCardSearchableText($card) { const textSources = [$card.find('h3').text(), $card.find('p').text(), $card.find('.card-category').text(), $card.find('img').attr('alt'), $card.data('category'), $card.data('keywords')]; return decodeText(textSources.map(text => String(text || '')).join(' ').toLowerCase()); }
function checkKeywordMatch(cardText, selectedKeyword) { if (selectedKeyword === "all") return true; const synonyms = (typeof SYNONYM_MAP !== 'undefined') ? (SYNONYM_MAP[selectedKeyword] || []) : []; const keywordsToMatch = [selectedKeyword, ...synonyms]; return keywordsToMatch.some(key => { return new RegExp(`\\b${key}\\b`, 'i').test(cardText); }); }
function filterCardsGeneric(listId, searchId, catFilterId, keyFilterId, noResultsId, initialLoad) { const searchTerm = decodeText($(searchId).val().toLowerCase()); const selectedCategory = $(catFilterId).val(); const selectedKeyword = $(keyFilterId).val(); const $grid = $(listId); const $allCards = $grid.children('.card-item'); const $showMoreButton = $grid.next('.toggle-card-button'); const $noResultsMessage = $(noResultsId); let visibleCount = 0; if (searchTerm.length > 0 || selectedCategory !== "all" || selectedKeyword !== "all") { $showMoreButton.hide(); $allCards.each(function() { const $card = $(this); const cardText = getCardSearchableText($card); const searchMatch = (searchTerm === "" || cardText.includes(searchTerm)); const categoryMatch = (selectedCategory === "all" || ($card.data('category') && String($card.data('category')).includes(selectedCategory))); const keywordMatch = checkKeywordMatch(cardText, selectedKeyword); if (categoryMatch && searchMatch && keywordMatch) { $card.removeClass('hidden-card-item').show(); visibleCount++; } else { $card.hide(); } }); if (visibleCount === 0) $noResultsMessage.show(); else $noResultsMessage.hide(); } else { $noResultsMessage.hide(); $allCards.removeAttr('style'); handleCardView($('#content-area'), initialLoad); checkDeepLink(); } }
function loadPhotoAlbum(jsonUrl, initialLoadOverride, onComplete) { const $albumList = $('#photo-album-list'); const $targetList = $albumList.length ? $albumList : $('#about-album-list'); $.getJSON(jsonUrl, function (albumData) { if ($('#album-title').length) $('#album-title').text(decodeText(albumData.albumTitle)); $targetList.empty(); $.each(albumData.photos, function(index, photo) { const title = decodeText(photo.title); const category = decodeText(photo.category); const description = decodeText(photo.description); const cardHtml = `<div class="card-item" data-category="${category}" data-keywords="${title},${description}" data-title="${title}" data-desc="${description}"><a href="${photo.url}" data-load-type="image"><img src="${photo.thumbnailUrl}" loading="lazy" class="card-image" alt="${title}"></a></div>`; $targetList.append(cardHtml); }); if ($('#album-category-filter').length) { populateCategoryFilter('#photo-album-list', '#album-category-filter'); populateSmartKeywords('#photo-album-list', '#album-keyword-filter'); } const defaultIncrement = $targetList.attr('id') === 'about-album-list' ? 20 : 10; handleCardView($targetList.parent(), initialLoadOverride, defaultIncrement); if (typeof onComplete === 'function') onComplete(); checkDeepLink(); }).fail(function() { if ($('#album-title').length) $('#album-title').text("Error Loading Album"); }); }
function loadVids(PL, Category, BKcol, initialLoadOverride, onComplete) { $('#Grid').empty(); var key = 'AIzaSyD7XIk7Bu3xc_1ztJl6nY6gDN4tFWq4_tY'; var URL = 'https://www.googleapis.com/youtube/v3/playlistItems'; var options = { part: 'snippet', key: key, maxResults: 50, playlistId: PL }; $.getJSON(URL, options, function (data) { $('#playlist-title').text(`Youtubelist: ${Category.replace(/_/g, ' ')}`); if (data.items) { resultsLoop(data, Category, BKcol); handleCardView($('#content-area'), initialLoadOverride); populateSmartKeywords('#Grid', '#youtube-keyword-filter'); populateCategoryFilter('#Grid', '#youtube-category-filter'); if (typeof onComplete === 'function') onComplete(); checkDeepLink(); } }); }
function resultsLoop(data, Cat, BKcol) { $.each(data.items, function (i, item) { if (!item.snippet.resourceId || !item.snippet.resourceId.videoId) return; let thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || ''; const title = decodeText(item.snippet.title); const desc = decodeText(item.snippet.description); const vid = item.snippet.resourceId.videoId; $('#Grid').append(`<div data-category="${Cat}" class="card-item youtube-card-item" style="border-left-color: #${BKcol}"><a href="https://www.youtube.com/embed/${vid}" data-load-type="iframe"><img class="YTi" src="${thumb}" alt="${title}" ><h3>${title}</h3><p>${desc}</p><span class="card-category" style="display: none;">${Cat}</span></a></div>`); }); }
function filterYouTubeCards() { const searchTerm = decodeText($('#youtube-search-box').val().toLowerCase()); const selectedKeyword = $('#youtube-keyword-filter').val(); const $grid = $('#Grid'); const $allCards = $grid.children('.card-item'); const $showMoreButton = $grid.next('.toggle-card-button'); const $noResultsMessage = $('#youtube-no-results'); let visibleCount = 0; if (searchTerm.length > 0 || selectedKeyword !== "all") { $showMoreButton.hide(); $allCards.each(function() { const $card = $(this); const cardText = getCardSearchableText($card); const searchMatch = (searchTerm === "" || cardText.includes(searchTerm)); const keywordMatch = checkKeywordMatch(cardText, selectedKeyword); if (searchMatch && keywordMatch) { $card.removeClass('hidden-card-item').show(); visibleCount++; } else { $card.hide(); } }); if (visibleCount === 0) $noResultsMessage.show(); else $noResultsMessage.hide(); } else { $noResultsMessage.hide(); $allCards.removeAttr('style'); handleCardView($('#content-area'), parseInt($('.nav-link[data-page*="youtube_page.html"]').data('initial-load')) || 10); } }
function openCardByTitle(titleToFind) { if (!titleToFind) return; const decodedTitle = decodeURIComponent(titleToFind).trim().toLowerCase(); let $card = $('#' + titleToFind); if ($card.length === 0) { $card = $('.card-item').filter(function() { const cardId = $(this).attr('id'); if (cardId && cardId.toLowerCase() === decodedTitle) return true; const cardTitle = $(this).find('h3').text().trim().toLowerCase(); const imgAlt = $(this).find('img.card-image').attr('alt') || ''; return cardTitle === decodedTitle || (imgAlt && imgAlt.toLowerCase() === decodedTitle); }); } if ($card.length) { $card.removeClass('hidden-card-item'); $('html, body').animate({ scrollTop: $card.offset().top - 100 }, 500); $card.click(); } else { console.warn('Deep link card not found:', decodedTitle); } }
function buildResearchModal(jsonUrl) { const $modalContent = $('#modal-content-area'); $modalContent.html(`<div class="tab-nav" id="research-tab-nav-modal"></div><div class="tab-content" id="research-tab-content-modal"><div class="content-loader"><div class="spinner"></div></div></div>`); $.getJSON(jsonUrl, function (data) { $('#content-modal .open-new-window').attr('href', jsonUrl); const $tabNav = $('#research-tab-nav-modal'); $tabNav.empty(); $.each(data.tickers, function(index, ticker) { const $button = $(`<button class="tab-button"></button>`); $button.text(ticker.name); $button.attr('data-content-url', ticker.contentUrl); if (index === 0) { $button.addClass('active'); loadModalTabContent(ticker.contentUrl); } $tabNav.append($button); }); }).fail(function() { $modalContent.html('<div class="error-message">Error loading research data.</div>'); }); }
function loadModalTabContent(htmlUrl) { $('#content-modal .open-new-window').attr('href', htmlUrl); $('#research-tab-content-modal').html(`<div class="iframe-wrapper"><iframe src="${htmlUrl}" class="loaded-iframe"></iframe></div>`); }

/* === --- EVENT LISTENERS (DELEGATED) --- === */
$(document).ready(function () {
    injectModalStyles();
    $('body').append(`<div id="content-modal" class="modal-backdrop"><div class="modal-content"><div class="modal-header"><div class="modal-nav-left"><button class="modal-prev-btn" title="Previous (Left Arrow)">&larr; Prev</button><button class="modal-next-btn" title="Next (Right Arrow/Spacebar)">Next &rarr;</button><button class="modal-info-btn" title="Toggle Info (I)">Info</button><button class="modal-help-btn" title="Keyboard Shortcuts" onclick="showKeyboardShortcuts()">?</button><div class="slideshow-controls" style="display:none; margin-right:10px;"><button class="modal-play-btn" title="Start Slideshow">&#9658; Play</button><select class="slideshow-speed" title="Slideshow Speed"><option value="3000">3s</option><option value="5000" selected>5s</option><option value="10000">10s</option><option value="20000">20s</option></select></div></div><div class="modal-nav-right"><button class="modal-fullscreen-btn" title="Full Screen" style="display:none; font-size:1.1rem; margin-right:10px;">&#x26F6; Full Screen</button><a href="#" class="open-new-window" style="display:none;" target="_blank" rel="noopener noreferrer"></a><button class="modal-close-btn" title="Close (Esc)">&times; Close</button></div></div><div id="modal-content-area"></div></div></div>`);

    $('body').on('click', '.toggle-card-button', function() { const $button = $(this); const $list = $button.prev('.card-list'); if ($list.length) { showMoreCards($button, $list); } });
    $('body').on('click', '.card-item, .item', function(e) { const $clickedCard = $(this); const $link = $clickedCard.find('a').first(); if (!$link.length) return; const $clickedLink = $(e.target).closest('a'); if ($clickedLink.length > 0 && !$clickedLink.is($link)) return; e.preventDefault(); e.stopPropagation(); const $cardList = $clickedCard.closest('.card-list'); const $allVisibleCards = $cardList.children('.card-item:visible, .item:visible'); currentCardList = []; $allVisibleCards.each(function() { currentCardList.push($(this).find('a').first()); }); currentCardIndex = $allVisibleCards.index($clickedCard); if (currentCardList.length > 0) { window.loadModalContent(currentCardIndex); window.animateModalOpen(); $(document).on('keydown.modalNav', window.handleModalKeys); } });
    $('body').on('click', '.modal-close-btn', function() { window.stopSlideshow(); window.animateModalClose(); currentCardList = []; currentCardIndex = 0; isTutorialMode = false; $(document).off('keydown.modalNav'); $('#content-modal').find('.modal-header').removeAttr('style'); });
    $('body').on('click', '#content-modal', function(e) { if (e.target.id === 'content-modal') { $(this).find('.modal-close-btn').first().click(); } });
    
    // FIX: Blur buttons on click to fix keyboard focus issues
    $('body').on('click', '.modal-play-btn', function() { 
        $(this).blur();
        if (slideshowInterval) { window.stopSlideshow(); } else { $(this).html('&#10074;&#10074; Pause'); const speed = parseInt($('.slideshow-speed').val()) || 5000; if (currentCardIndex < currentCardList.length - 1) $('.modal-next-btn').click(); else currentCardIndex = -1; slideshowInterval = setInterval(function() { if (currentCardIndex < currentCardList.length - 1) { $('.modal-next-btn').click(); } else { window.stopSlideshow(); } }, speed); } 
    });
    $('body').on('change', '.slideshow-speed', function() { if (slideshowInterval) { $('.modal-play-btn').click(); setTimeout(() => { $('.modal-play-btn').click(); }, 100); } });
    
    // FIX: Full Screen Logic Update
    $('body').on('click', '.modal-fullscreen-btn', function() {
        const btn = $(this);
        // Force blur immediately so the button doesn't trap keyboard events
        btn.blur();
        
        const wrapper = document.querySelector('#modal-content-area .image-wrapper') || 
                        document.querySelector('#modal-content-area .iframe-wrapper') || 
                        document.querySelector('#modal-content-area .markdown-wrapper'); 
        const target = wrapper || document.getElementById('modal-content-area');
        
        if (document.fullscreenElement) { 
            document.exitFullscreen(); 
        } else { 
            if (target && target.requestFullscreen) { 
                target.requestFullscreen().then(() => { 
                    // AFTER entering FS:
                    // 1. Tutorial Mode Check
                    if(isTutorialMode) { 
                        const $iframe = $('#modal-content-area iframe'); 
                        if($iframe.length) { 
                            try { 
                                const doc = $iframe[0].contentDocument; 
                                doc.body.classList.add('fs-mode'); 
                                $('.tutorial-fs-toggle').fadeIn(); 
                            } catch(e){} 
                        } 
                    }
                    // 2. FOCUS CONTENT: Force focus to the content area so keys work globally
                    // We try to focus the wrapper first, then the content area
                    if (wrapper) wrapper.focus();
                    else if (target) target.focus();
                    else window.focus(); // Last resort
                    
                }).catch(err => console.log(err)); 
            } 
        }
    });
    $('body').on('click', '.tutorial-fs-toggle', function() { 
        $(this).blur();
        const $iframe = $('#modal-content-area iframe'); if($iframe.length) { try { const doc = $iframe[0].contentDocument; doc.body.classList.toggle('nav-visible'); } catch(e) {} } 
    });
    document.addEventListener('fullscreenchange', (event) => { if (!document.fullscreenElement) { $('.tutorial-fs-toggle').hide(); const $iframe = $('#modal-content-area iframe'); if($iframe.length) { try { const doc = $iframe[0].contentDocument; doc.body.classList.remove('fs-mode', 'nav-visible'); } catch(e){} } } });

    $('body').on('click', '.modal-prev-btn', function() { $(this).blur(); window.stopSlideshow(); if (currentCardIndex > 0) window.loadModalContent(currentCardIndex - 1); });
    $('body').on('click', '.modal-next-btn', function() { $(this).blur(); if (currentCardIndex < currentCardList.length - 1) window.loadModalContent(currentCardIndex + 1); else window.stopSlideshow(); });
    
    $('body').on('click', '.modal-info-btn', function() { 
        $(this).blur();
        const $infoBtn = $(this); const manifestUrl = $infoBtn.data('manifest-url'); 
        if (manifestUrl) { window.buildTutorialSummary(manifestUrl, $('#modal-content-area')); } 
        else { 
            window.cardGlobalState.infoVisible = !window.cardGlobalState.infoVisible; 
            window.applyInfoState(); 
        } 
    });

    $('body').on('input', '#youtube-search-box', filterYouTubeCards); $('body').on('change', '#youtube-keyword-filter', filterYouTubeCards);
    $('body').on('input', '#post-search-box', () => window.filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10)); $('body').on('change', '#post-category-filter', () => window.filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10)); $('body').on('change', '#post-keyword-filter', () => window.filterCardsGeneric('#posts-card-list', '#post-search-box', '#post-category-filter', '#post-keyword-filter', '#posts-no-results', 10));
    $('body').on('input', '#album-search-box', () => window.filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20)); $('body').on('change', '#album-category-filter', () => window.filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20)); $('body').on('change', '#album-keyword-filter', () => window.filterCardsGeneric('#photo-album-list', '#album-search-box', '#album-category-filter', '#album-keyword-filter', '#album-no-results', 20));
    $('#content-modal').on('click', '.tab-button', function() { $(this).siblings().removeClass('active'); $(this).addClass('active'); const htmlUrl = $(this).data('content-url'); window.loadModalTabContent(htmlUrl, '#research-tab-content-modal'); });
});
