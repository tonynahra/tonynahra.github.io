(function() {
    // --- CONFIGURATION ---
    const CONFIG = {
        // REPLACE THIS with your exact PHP URL
        endpoint: 'https://mediamaze.com/tony/track.php', 
        debug: true // Set to false to stop console logs
    };

    const VisitorTracker = {
        sessionId: null,
        startTime: Date.now(),
        maxScroll: 0,

        init: function() {
            this.sessionId = this.getSessionId();
            this.bindEvents();
            
            // Log the initial page view
            this.track('page_view', {
                title: document.title,
                referrer: document.referrer,
                screen: `${window.screen.width}x${window.screen.height}`,
                userAgent: navigator.userAgent
            });
        },

        getSessionId: function() {
            let sid = sessionStorage.getItem('vt_sid');
            if (!sid) {
                sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('vt_sid', sid);
            }
            return sid;
        },

        // --- CORE TRACKING FUNCTION ---
        track: function(eventType, extraData = {}) {
            // 1. DEFINE PAYLOAD (This was missing causing your error)
            const payload = {
                event: eventType,
                session_id: this.sessionId,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                data: extraData
            };

            if (CONFIG.debug) console.log('Tracking:', payload);

            // 2. SEND TO SERVER
            // We use credentials: 'omit' to fix the CORS error
            fetch(CONFIG.endpoint, {
                method: 'POST',
                credentials: 'omit', 
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).catch(error => console.error('Tracking Error:', error));
        },

        bindEvents: function() {
            // Track Clicks
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a, button, .track-me');
                if (target) {
                    this.track('click', {
                        tag: target.tagName,
                        id: target.id || 'no-id',
                        class: target.className,
                        text: target.innerText.substring(0, 50).trim(),
                        href: target.href || null
                    });
                }
            });

            // Track Scroll (Throttled)
            let scrollTimer;
            document.addEventListener('scroll', () => {
                if (scrollTimer) return;
                scrollTimer = setTimeout(() => {
                    const percent = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
                    if (percent > this.maxScroll && [25, 50, 75, 90, 100].some(p => percent >= p && this.maxScroll < p)) {
                        this.maxScroll = percent;
                        this.track('scroll_milestone', { depth: percent + '%' });
                    }
                    scrollTimer = null;
                }, 500);
            });

            // Track Time on Page (when tab is hidden/closed)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
                    this.track('session_end', { duration_seconds: timeSpent });
                }
            });
        }
    };

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VisitorTracker.init());
    } else {
        VisitorTracker.init();
    }
})();
