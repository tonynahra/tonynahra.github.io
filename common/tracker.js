(function() {
    const CONFIG = {
        endpoint: 'https://mediamaze.com/tony/track.php', 
        debug: true 
    };

    const VisitorTracker = {
        sessionId: null,
        startTime: Date.now(),
        maxScroll: 0,

        init: function() {
            this.sessionId = this.getSessionId();
            this.bindEvents();
            this.track('page_view', {
                title: document.title,
                referrer: document.referrer,
                screen: `${window.screen.width}x${window.screen.height}`,
                userAgent: navigator.userAgent
            });
        },

        // Generates or retrieves a Session ID for this visit
        getSessionId: function() {
            let sid = sessionStorage.getItem('vt_sid');
            if (!sid) {
                sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('vt_sid', sid);
            }
            return sid;
        },

        // Core sending logic
        track: function(eventType, data = {}) {
            const payload = {
                event: eventType,
                session_id: this.sessionId,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                data: data
            };

            if (CONFIG.debug) console.log('Tracking:', payload);

            // Use sendBeacon for reliability (works even if tab closes)
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            const sent = navigator.sendBeacon(CONFIG.endpoint, blob);

            // Fallback for older browsers if sendBeacon fails
            if (!sent) {
                fetch(CONFIG.endpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    keepalive: true,
                    headers: { 'Content-Type': 'application/json' }
                }).catch(e => console.error('Tracking failed', e));
            }
        },

        bindEvents: function() {
            // 1. Track Clicks (Delegation)
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

            // 2. Track Scroll Depth (Throttled)
            let scrollTimer;
            document.addEventListener('scroll', () => {
                if (scrollTimer) return;
                scrollTimer = setTimeout(() => {
                    const percent = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
                    // Only log milestones: 25, 50, 75, 90, 100
                    if (percent > this.maxScroll && [25, 50, 75, 90, 100].some(p => percent >= p && this.maxScroll < p)) {
                        this.maxScroll = percent;
                        this.track('scroll_milestone', { depth: percent + '%' });
                    }
                    scrollTimer = null;
                }, 500);
            });

            // 3. Track Time on Page (Visibility Change is more reliable than unload)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
                    this.track('session_end', { duration_seconds: timeSpent });
                }
            });
        }
    };

    // Start Tracking
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VisitorTracker.init());
    } else {
        VisitorTracker.init();
    }
})();
