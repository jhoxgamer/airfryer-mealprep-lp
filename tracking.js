(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        sessionStorageKey: 'af_session_id',
        localStorageKey: 'af_tracking_session',
        maxSessionAge: 30 * 60 * 1000, // 30 minutes
        endpoints: {
            // Add your analytics endpoint here
            // analytics: 'https://your-analytics-endpoint.com/collect'
        }
    };
    

    // Capture UTMs from URL and store in sessionStorage for form tracking
    function captureUtms() {
        const params = new URLSearchParams(window.location.search);
        const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        utmFields.forEach(field => {
            const value = params.get(field);
            if (value) {
                sessionStorage.setItem(field, value);
            }
        });
    }
    
    // Get UTM data for forms/events
    function getUtmData() {
        const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        const utmData = {};
        utmFields.forEach(field => {
            const value = sessionStorage.getItem(field);
            if (value) utmData[field] = value;
        });
        return utmData;
    }
    
    // Initialize UTM capture
    captureUtms();

    // Generate or retrieve session ID
    function getSessionId() {
        let sessionId = sessionStorage.getItem(CONFIG.sessionStorageKey);
        const sessionStart = sessionStorage.getItem(CONFIG.sessionStorageKey + '_start');
        const now = Date.now();
        
        // Check if session expired
        if (sessionId && sessionStart && (now - parseInt(sessionStart, 10)) > CONFIG.maxSessionAge) {
            sessionId = null;
            sessionStorage.removeItem(CONFIG.sessionStorageKey);
            sessionStorage.removeItem(CONFIG.sessionStorageKey + '_start');
        }
        
        if (!sessionId) {
            sessionId = generateId();
            sessionStorage.setItem(CONFIG.sessionStorageKey, sessionId);
            sessionStorage.setItem(CONFIG.sessionStorageKey + '_start', now.toString());
        }
        
        return sessionId;
    }
    
    // Generate unique ID
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Get or create persistent user ID
    function getUserId() {
        let userId = localStorage.getItem(CONFIG.localStorageKey);
        if (!userId) {
            userId = generateId();
            localStorage.setItem(CONFIG.localStorageKey, userId);
        }
        return userId;
    }
    
    // Core tracking function
    function trackEvent(eventType, data = {}) {
        const event = {
            sessionId: getSessionId(),
            userId: getUserId(),
            eventType: eventType,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            path: window.location.pathname,
            referrer: document.referrer || 'direct',
            userAgent: navigator.userAgent,
            screen: {
                width: screen.width,
                height: screen.height,
                devicePixelRatio: window.devicePixelRatio || 1
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            ...data,
            ...getUtmData()
        };
        
        // Log to console for debugging
        console.log('[Tracking]', eventType, event);
        
        // Send to analytics endpoint if configured
        if (CONFIG.endpoints.analytics) {
            sendEvent(event);
        }
        
        // Push to dataLayer for GTM
        if (window.dataLayer) {
            window.dataLayer.push({
                event: eventType,
                ...data,
                ...getUtmData()
            });
        }
        
        return event;
    }
    
    // Send event to analytics endpoint
    function sendEvent(event) {
        // Use sendBeacon for reliability (works even during page unload)
        if (navigator.sendBeacon) {
            navigator.sendBeacon(
                CONFIG.endpoints.analytics,
                JSON.stringify(event)
            );
        } else {
            // Fallback to fetch
            fetch(CONFIG.endpoints.analytics, {
                method: 'POST',
                body: JSON.stringify(event),
                headers: {
                    'Content-Type': 'application/json'
                },
                keepalive: true
            }).catch(err => console.warn('Tracking send failed:', err));
        }
    }
    
    // Track page view
    function trackPageView() {
        trackEvent('page_view', {
            title: document.title,
            loadTime: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : null
        });
    }
    
    // Track scroll depth
    let maxScrollDepth = 0;
    const scrollDepthThresholds = [25, 50, 75, 90, 100];
    const trackedDepths = new Set();
    
    function trackScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);
        
        if (scrollPercent > maxScrollDepth) {
            maxScrollDepth = scrollPercent;
        }
        
        scrollDepthThresholds.forEach(threshold => {
            if (maxScrollDepth >= threshold && !trackedDepths.has(threshold)) {
                trackedDepths.add(threshold);
                trackEvent('scroll_depth', {
                    depth: threshold,
                    maxDepth: maxScrollDepth
                });
            }
        });
    }
    
    // Track time on page
    let timeOnPageInterval;
    const timeThresholds = [10, 30, 60, 120, 300]; // seconds
    const trackedTimes = new Set();
    
    function startTimeTracking() {
        let seconds = 0;
        timeOnPageInterval = setInterval(() => {
            seconds++;
            timeThresholds.forEach(threshold => {
                if (seconds >= threshold && !trackedTimes.has(threshold)) {
                    trackedTimes.add(threshold);
                    trackEvent('time_on_page', {
                        seconds: threshold
                    });
                }
            });
        }, 1000);
    }
    
    function stopTimeTracking() {
        if (timeOnPageInterval) {
            clearInterval(timeOnPageInterval);
        }
    }
    
    // Track form interactions
    function initFormTracking() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form.tagName === 'FORM') {
                trackEvent('form_submit', {
                    formId: form.id || form.name || 'unknown',
                    formAction: form.action,
                    method: form.method,
                    formClasses: form.className
                });
            }
        });
        
        // Track form field interactions
        document.addEventListener('focusin', function(e) {
            if (e.target.matches('input, textarea, select')) {
                trackEvent('form_field_focus', {
                    fieldName: e.target.name || e.target.id || 'unknown',
                    fieldType: e.target.type || e.target.tagName.toLowerCase(),
                    formId: e.target.form?.id || 'unknown'
                });
            }
        }, true);
    }
    
    // Track offer/button clicks
    function initOfferTracking() {
        document.addEventListener('click', function(e) {
            const offerElement = e.target.closest('.track-offer, .offer-btn, [data-track-offer]');
            if (offerElement) {
                trackEvent('offer_click', {
                    offerId: offerElement.dataset.offerId || offerElement.id || 'unknown',
                    elementText: offerElement.innerText.trim().substring(0, 100),
                    elementHref: offerElement.href || null,
                    elementClasses: offerElement.className
                });
            }
            
            // Track CTA clicks
            const ctaElement = e.target.closest('[data-cta]');
            if (ctaElement) {
                trackEvent('cta_click', {
                    ctaId: ctaElement.dataset.cta,
                    ctaText: ctaElement.innerText.trim().substring(0, 100),
                    ctaHref: ctaElement.href || null
                });
            }
        });
    }
    
    // Track external link clicks
    function initExternalLinkTracking() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href^="http"]');
            if (link && !link.href.includes(window.location.hostname)) {
                trackEvent('external_link_click', {
                    href: link.href,
                    linkText: link.innerText.trim().substring(0, 100),
                    isOffer: link.classList.contains('track-offer') || link.classList.contains('offer-btn')
                });
            }
        });
    }
    
    // Track video plays (if any)
    function initVideoTracking() {
        document.querySelectorAll('video').forEach(video => {
            ['play', 'pause', 'ended', 'timeupdate'].forEach(eventType => {
                video.addEventListener(eventType, function() {
                    if (eventType === 'timeupdate') {
                        // Track quartiles
                        const percent = (this.currentTime / this.duration) * 100;
                        [25, 50, 75, 100].forEach(q => {
                            if (percent >= q && !this.dataset['trackedQ' + q]) {
                                this.dataset['trackedQ' + q] = 'true';
                                trackEvent('video_progress', {
                                    quartile: q,
                                    videoSrc: this.currentSrc
                                });
                            }
                        });
                    } else {
                        trackEvent('video_' + eventType, {
                            videoSrc: this.currentSrc,
                            currentTime: this.currentTime,
                            duration: this.duration
                        });
                    }
                });
            });
        });
    }
    
    // Track errors
    function initErrorTracking() {
        window.addEventListener('error', function(e) {
            trackEvent('js_error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                stack: e.error?.stack
            });
        });
        
        window.addEventListener('unhandledrejection', function(e) {
            trackEvent('promise_rejection', {
                reason: e.reason?.toString(),
                stack: e.reason?.stack
            });
        });
    }
    
    // Track performance metrics
    function trackPerformance() {
        if (window.performance && window.performance.timing) {
            window.addEventListener('load', function() {
                setTimeout(() => {
                    const timing = performance.timing;
                    const navStart = timing.navigationStart;
                    
                    trackEvent('performance_metrics', {
                        dns: timing.domainLookupEnd - timing.domainLookupStart,
                        tcp: timing.connectEnd - timing.connectStart,
                        ttfb: timing.responseStart - navStart,
                        domLoad: timing.domContentLoadedEventEnd - navStart,
                        fullLoad: timing.loadEventEnd - navStart,
                        fcp: performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || null,
                        lcp: 0 // Would need PerformanceObserver
                    });
                    
                    // Track LCP if supported
                    if (window.PerformanceObserver) {
                        try {
                            const observer = new PerformanceObserver(list => {
                                const entries = list.getEntries();
                                const lastEntry = entries[entries.length - 1];
                                trackEvent('lcp', {
                                    value: lastEntry.startTime,
                                    element: lastEntry.element?.tagName?.toLowerCase() || 'unknown'
                                });
                            });
                            observer.observe({ type: 'largest-contentful-paint', buffered: true });
                        } catch (e) {
                            // LCP not supported
                        }
                    }
                }, 0);
            });
        }
    }
    
    // Initialize all tracking
    function init() {
        trackPageView();
        initFormTracking();
        initOfferTracking();
        initExternalLinkTracking();
        initVideoTracking();
        initErrorTracking();
        trackPerformance();
        
        // Scroll depth tracking (throttled)
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(trackScrollDepth, 100);
        }, { passive: true });
        
        // Time on page tracking
        startTimeTracking();
        
        // Stop time tracking on page hide
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                stopTimeTracking();
            } else {
                startTimeTracking();
            }
        });
        
        // Track before unload
        window.addEventListener('beforeunload', function() {
            stopTimeTracking();
            trackEvent('page_unload', {
                timeOnPage: Array.from(trackedTimes).pop() || 0,
                maxScrollDepth: maxScrollDepth
            });
        });
    }
    
    // Expose globally
    window.trackEvent = trackEvent;
    window.getSessionId = getSessionId;
    window.getUserId = getUserId;
    
    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();