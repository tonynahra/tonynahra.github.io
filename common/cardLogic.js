/* === GLOBAL VARIABLES === */
var currentCardList = []; var currentCardIndex = 0; var isModalInfoVisible = false; var isTutorialMode = false; var slideshowInterval = null; 
window.cardGlobalState = { infoVisible: false };

function injectModalStyles() { if ($('#dynamic-modal-styles').length) return; $('head').append(`<style id="dynamic-modal-styles"></style>`); }

/* === HELPER FUNCTIONS (GLOBAL) === */
function decodeText(text) { if (!text) return ""; try { var $textarea = $('<textarea></textarea>'); $textarea.html(text); return $textarea.val(); } catch (e) { return text; } }
function stopSlideshow() { if (slideshowInterval) { clearInterval(slideshowInterval); slideshowInterval = null; $('.modal-play-btn').html('&#9658; Play'); } }

// === DEEP LINK CHECKER ===
function checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) { openCardByTitle(postId); }
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
function handleModalKeys(e) {
    if (!$('#content-modal').is(':visible')) { $(document).off('keydown.modalNav'); return; } if ($(e.target).is('input, textarea, select')) return;
    if (isTutorialMode && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ")) { return; }
    switch (e.key) { 
        case "Escape": $('.modal-close-btn').first().click(); break; 
        case "ArrowLeft": if (!isTutorialMode) { $('.modal-prev-btn').first().click(); } break; 
        case "ArrowRight": if (!isTutorialMode) { $('.modal-next-btn').first().click(); } break; 
        case " ": if(e.preventDefault) e.preventDefault(); if (!isTutorialMode) { $('.modal-next-btn').first().click(); } break; 
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

/* === ADVANCED TABLE & CHART BUILDERS (GLOBAL) === */
function loadLibrary(url, type, checkObj) { return new Promise((resolve, reject) => { if (window[checkObj]) { resolve(); return; } if (type === 'js') { $.getScript(url).done(resolve).fail(reject); } else { $('<link>').appendTo('head').attr({type: 'text/css', rel: 'stylesheet', href: url}); resolve(); } }); }
window.buildTableModal = function(jsonUrl) { const $modalContent = $('#modal-content-area'); $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>'); loadLibrary('https://unpkg.com/tabulator-tables@5.5.0/dist/js/tabulator.min.js', 'js', 'Tabulator').then(() => { $.getJSON(jsonUrl, function(data) { let tableData = data.data; if (!tableData && data.rows) { tableData = data.rows.map(row => { let obj = {}; data.columns.forEach((col, index) => { const fieldName = typeof col === 'object' ? col.field : col; obj[fieldName] = row[index]; }); return obj; }); } if (!tableData) { $modalContent.html('<div class="error-message">Invalid table data.</div>'); return; } const tableId = 'tabulator-' + Date.now(); $modalContent.html(`<div class="markdown-wrapper" style="padding:20px; background:#fff; display:flex; flex-direction:column; height:100%;"><h2 style="margin-top:0;">${data.title || 'Table'}</h2><div id="${tableId}" style="flex:1;"></div></div>`); new Tabulator("#" + tableId, { data: tableData, layout: "fitColumns", pagination: "local", paginationSize: 15, columns: data.columns.map(col => { if (col.formatter === "linkButton") { col.formatter = function(cell){ const val = cell.getValue(); if(!val) return ""; const p = val.split(':'); return p[0] === 'link' ? `<button onclick="window.openFromTable('${p[1]}','${p[2]}')">${p[3]||'Open'}</button>` : val; }; } return col; }) }); }); }); };
window.buildChartModal = function(jsonUrl) { const $modalContent = $('#modal-content-area'); $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>'); loadLibrary('https://cdn.jsdelivr.net/npm/chart.js', 'js', 'Chart').then(() => { $.getJSON(jsonUrl, function(data) { const chartId = 'chart-' + Date.now(); $modalContent.html(`<div class="markdown-wrapper" style="padding:20px; background:#fff; height:100%;"><h2 style="margin:0;">${data.title}</h2><div style="position:relative; height:90%; width:100%;"><canvas id="${chartId}"></canvas></div></div>`); const ctx = document.getElementById(chartId).getContext('2d'); new Chart(ctx, { type: 'line', data: { labels: data.labels, datasets: data.datasets }, options: { responsive: true, maintainAspectRatio: false } }); }); }); };
window.openFromTable = function(type, id) { if (type === 'chess') window.loadChessGame(id, $('#content-modal'), $('#modal-content-area')); else if (type === 'tutorial') { window.loadModalContent(-1); } };

/* === MODAL CONTENT LOADER (GLOBAL) === */
function loadModalContent(index) {
    if (index >= 0 && index < currentCardList.length) { currentCardIndex = index; }
    const $link = currentCardIndex >= 0 ? currentCardList[currentCardIndex] : null;
    
    const $modal = $('#content-modal'); const $modalContent = $('#modal-content-area'); const $modalInfoBtn = $modal.find('.modal-info-btn'); const $modalPlayControls = $modal.find('.slideshow-controls'); const $modalFsBtn = $modal.find('.modal-fullscreen-btn'); const $modalOpenLink = $modal.find('.open-new-window');

    // RESET UI
    $modal.find('.modal-header').removeAttr('style'); $modal.removeClass('chess-mode research-mode'); $('body').removeClass('chess-mode-active'); $modalOpenLink.hide(); 
    $('.modal-prev-btn, .modal-next-btn').show();
    
    isTutorialMode = false; $modalInfoBtn.removeData('manifest-url'); $modalContent.removeClass('summary-view-active'); $modalContent.find('.tutorial-summary-overlay, .modal-photo-info').remove(); 
    $('body').off('click.tutorialNav'); $modalContent.html('<div class="content-loader"><div class="spinner"></div></div>');
    $('.tutorial-fs-toggle').remove();
    
    let loadUrl = $link ? $link.attr('href') : ''; let loadType = $link ? $link.data('load-type') : ''; 
    const jsonUrl = $link ? $link.data('json-url') : ''; const manifestUrl = $link ? $link.data('manifest-url') : '';
    
    if (!loadType && loadUrl) {
        if (/\.(jpg|jpeg|png|gif)$/i.test(loadUrl)) loadType = 'image'; 
        else if (/\.md$/i.test(loadUrl)) loadType = 'markdown'; 
        else if (/\.pgn$/i.test(loadUrl)) loadType = 'chess';
        else if (/\.json$/i.test(loadUrl) && !manifestUrl) loadType = 'table'; 
        else if (loadUrl.endsWith('.html')) loadType = 'html'; 
        else if (loadUrl.startsWith('http')) loadType = 'iframe'; 
    }

    if (loadType === 'image') { $modalPlayControls.show(); } else { $modalPlayControls.hide(); stopSlideshow(); }
    // Show FS button for Chess too now
    if (['image', 'iframe', 'markdown', 'tutorial', 'chess'].includes(loadType)) { $modalFsBtn.show(); } else { $modalFsBtn.hide(); }

    if (loadType === 'research' && jsonUrl) { $modal.addClass('research-mode'); $modalFsBtn.hide(); $modalInfoBtn.hide(); window.buildResearchModal(jsonUrl); return; } 
    if (loadType === 'table') { $modalFsBtn.hide(); $modalInfoBtn.hide(); window.buildTableModal(loadUrl); return; }
    if (loadType === 'chart') { $modalFsBtn.hide(); $modalInfoBtn.hide(); window.buildChartModal(jsonUrl || loadUrl); return; }

    if (loadType === 'tutorial' && manifestUrl) {
        isTutorialMode = true; $modalInfoBtn.show(); $modalInfoBtn.data('manifest-url', manifestUrl); $modalInfoBtn.removeClass('active'); $modal.addClass('research-mode'); 
        $('.modal-prev-btn, .modal-next-btn').hide();
        let playerFile = (manifestUrl.toLowerCase().endsWith('.xml') || manifestUrl.includes('x-plain')) ? "tutorial_player.html" : "text_tutorial_player.html"; 
        const playerHtml = `<div class="iframe-wrapper" style="height:100%; width:100%; position:relative;"><iframe src="${playerFile}?manifest=${encodeURIComponent(manifestUrl)}" class="loaded-iframe" style="border:none; width:100%; height:100%;" onload="try{ const d = this.contentDocument; d.addEventListener('keydown', function(e) { window.parent.handleModalKeys({ key: e.key }); }); const s = d.createElement('style'); s.innerHTML = 'body { overflow-x: hidden; margin: 0; padding: 0; width: 100%; } .nav-bar { position: relative !important; width: 100% !important; } body.fs-mode .nav-bar { position: absolute !important; bottom: 0 !important; opacity: 0 !important; } body.fs-mode.nav-visible .nav-bar { opacity: 1 !important; }'; d.head.appendChild(s); }catch(e){}"></iframe></div>`;
        $modalContent.html(playerHtml);
        $('body').append('<button class="tutorial-fs-toggle" title="Toggle Controls" style="display:none;">&#9881;</button>');
        $modalContent.find('.iframe-wrapper').on('dblclick', function() { if (document.fullscreenElement) document.exitFullscreen(); });
        const $card = currentCardList[currentCardIndex].closest('.card-item');
        updateSocialMeta($card.find('h3').text(), $card.find('p').text(), $card.find('img').attr('src'));
        return;
    }

    $modalInfoBtn.show(); 
    if ((loadType === 'markdown' || loadType === 'chess') && loadUrl.includes('github.com') && loadUrl.includes('/blob/')) { loadUrl = loadUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/'); }

    const customHeight = $link ? $link.data('height') : '90vh'; 
    const $card = currentCardList[currentCardIndex] ? currentCardList[currentCardIndex].closest('.card-item') : null;
    const title = $card ? ($card.find('h3').text() || $card.data('title')) : ''; 
    const desc = $card ? ($card.find('p').text() || $card.data('desc')) : ''; 
    const thumbUrl = $card ? $card.find('img').attr('src') : '';
    
    updateSocialMeta(title, desc, thumbUrl);

    let infoHtml = '';
    if (title || desc) { 
        const visibleStyle = window.cardGlobalState.infoVisible ? 'display:block !important; opacity:1 !important; pointer-events:auto;' : 'display:none; opacity:0; pointer-events:none;';
        infoHtml = `<div class="modal-photo-info raised-layer" style="${visibleStyle}"><h3>${title}</h3><p>${desc}</p></div>`;
    }
    if(window.cardGlobalState.infoVisible) $modalInfoBtn.addClass('active'); else $modalInfoBtn.removeClass('active');
    if (!title && !desc) $modalInfoBtn.hide();

    if (loadType === 'chess') { window.loadChessGame(loadUrl, $modal, $modalContent); return; }

    switch (loadType) {
        case 'markdown': $.ajax({ url: loadUrl, type: 'GET', dataType: 'text', success: function(markdownText) { const htmlContent = typeof marked !== 'undefined' ? marked.parse(markdownText) : markdownText; $modalContent.html(`<div class="markdown-wrapper"><div class="markdown-body" style="padding: 20px;">${htmlContent}</div></div>`); if (infoHtml) { $modalContent.append(infoHtml); } }, error: function() { $modalContent.html('<div class="error-message">Error loading markdown.</div>'); } }); break;
        case 'html': $.ajax({ url: loadUrl, type: 'GET', success: function(data) { $modalContent.html(data); if (infoHtml) { $modalContent.append(infoHtml); } }, error: function() { $modalContent.html('<div class="error-message">Error loading content.</div>'); } }); break;
        case 'image':
            $modalContent.html(`<div class="image-wrapper"><img src="${loadUrl}" class="loaded-image"></div>`); if (infoHtml) { $modalContent.append(infoHtml); }
            applyInfoState(); 
            $modalContent.find('.image-wrapper').on('dblclick', function() { if (document.fullscreenElement) { document.exitFullscreen(); } else { const el = this; if (el.requestFullscreen) el.requestFullscreen(); } });
            break;
        case 'iframe': let iframeSrc = loadUrl; if (loadUrl.startsWith('http') && !loadUrl.includes('youtube.com')) { iframeSrc = `https://mediamaze.com/p/?url=${encodeURIComponent(loadUrl)}`; } $modalContent.html(`<div class="iframe-wrapper"><iframe src="${iframeSrc}" class="loaded-iframe" style="height:${customHeight};"></iframe></div>`); if (infoHtml) { $modalContent.append(infoHtml); } applyInfoState(); break;
    }
    
    $('.modal-prev-btn').prop('disabled', index <= 0); 
    $('.modal-next-btn').prop('disabled', index >= currentCardList.length - 1);
    $('#content-modal').focus();
}

/* === --- EVENT LISTENERS --- === */
$(document).ready(function () {
    injectModalStyles();
    $('body').append(`<div id="content-modal" class="modal-backdrop"><div class="modal-content"><div class="modal-header"><div class="modal-nav-left"><button class="modal-prev-btn">&larr; Prev</button><button class="modal-next-btn">Next &rarr;</button><button class="modal-info-btn">Info</button><button class="modal-help-btn" onclick="showKeyboardShortcuts()">?</button><div class="slideshow-controls" style="display:none; margin-right:10px;"><button class="modal-play-btn">&#9658; Play</button><select class="slideshow-speed"><option value="3000">3s</option><option value="5000" selected>5s</option><option value="10000">10s</option></select></div></div><div class="modal-nav-right"><button class="modal-fullscreen-btn" style="display:none;">&#x26F6; Full Screen</button><a href="#" class="open-new-window" target="_blank">Open &nearr;</a><button class="modal-close-btn">&times; Close</button></div></div><div id="modal-content-area"></div></div></div>`);

    $('body').on('click', '.toggle-card-button', function() { showMoreCards($(this), $(this).prev('.card-list')); });
    $('body').on('click', '.card-item, .item', function(e) { 
        const $link = $(this).find('a').first(); if (!$link.length) return; e.preventDefault(); e.stopPropagation(); 
        currentCardList = []; $(this).closest('.card-list').children('.card-item:visible').each(function() { currentCardList.push($(this).find('a').first()); }); 
        currentCardIndex = $(this).closest('.card-list').children('.card-item:visible').index($(this)); 
        if (currentCardList.length > 0) { window.loadModalContent(currentCardIndex); window.animateModalOpen(); $(document).on('keydown.modalNav', window.handleModalKeys); } 
    });
    $('body').on('click', '.modal-close-btn', function() { window.stopSlideshow(); window.animateModalClose(); $(document).off('keydown.modalNav'); });
    $('body').on('click', '#content-modal', function(e) { if (e.target.id === 'content-modal') $('.modal-close-btn').click(); });
    
    $('body').on('click', '.modal-play-btn', function() { $(this).blur(); if (slideshowInterval) window.stopSlideshow(); else { $(this).html('&#10074;&#10074; Pause'); const speed = parseInt($('.slideshow-speed').val()) || 5000; if (currentCardIndex < currentCardList.length - 1) $('.modal-next-btn').click(); slideshowInterval = setInterval(function() { if (currentCardIndex < currentCardList.length - 1) $('.modal-next-btn').click(); else window.stopSlideshow(); }, speed); } });
    
    // FULLSCREEN LISTENER (Supports Chess Wrapper)
    $('body').on('click', '.modal-fullscreen-btn', function() {
        $(this).blur();
        // Check for Chess Container first, then general wrappers
        const wrapper = document.querySelector('.chess-main-area') || 
                        document.querySelector('#modal-content-area .image-wrapper') || 
                        document.querySelector('#modal-content-area .iframe-wrapper') || 
                        document.querySelector('#modal-content-area .markdown-wrapper'); 
        const target = wrapper || document.getElementById('modal-content-area');
        
        if (document.fullscreenElement) { document.exitFullscreen(); } 
        else { if (target && target.requestFullscreen) target.requestFullscreen().catch(err => console.log(err)); }
    });

    $('body').on('click', '.modal-prev-btn', function() { $(this).blur(); window.stopSlideshow(); if (currentCardIndex > 0) window.loadModalContent(currentCardIndex - 1); });
    $('body').on('click', '.modal-next-btn', function() { $(this).blur(); if (currentCardIndex < currentCardList.length - 1) window.loadModalContent(currentCardIndex + 1); else window.stopSlideshow(); });
    $('body').on('click', '.modal-info-btn', function() { $(this).blur(); const url = $(this).data('manifest-url'); if (url) window.buildTutorialSummary(url, $('#modal-content-area')); else { window.cardGlobalState.infoVisible = !window.cardGlobalState.infoVisible; window.applyInfoState(); } });
    
    $('body').on('input', '#youtube-search-box', filterYouTubeCards); 
    $('body').on('change', '#youtube-keyword-filter', filterYouTubeCards);
    // (Other filter bindings omitted for brevity but assumed present)
    
    // Initialize Deep Link Check
    window.checkDeepLink();
});
