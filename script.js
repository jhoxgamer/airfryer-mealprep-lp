// Form submission handling with tracking integration
(function() {
    'use strict';
    
    const form = document.getElementById('emailForm');
    if (!form) return;
    
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');
    
    // Email validation regex (RFC 5322 compliant simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    
    // Show message helper
    function showMessage(text, type) {
        formMessage.textContent = text;
        formMessage.className = 'form-message ' + type;
        formMessage.setAttribute('aria-live', 'polite');
    }
    
    // Set button loading state
    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.textContent = isLoading ? 'Enviando...' : 'Quero o Ebook Grátis';
        submitBtn.setAttribute('aria-busy', isLoading.toString());
    }
    
    // Validate email
    function validateEmail(email) {
        return emailRegex.test(email.trim());
    }
    
    // Track form submit event
    function trackFormSubmit(success, email) {
        if (typeof window.trackEvent === 'function') {
            window.trackEvent('form_submit', {
                formId: 'emailForm',
                success: success,
                hasEmail: !!email,
                timestamp: new Date().toISOString()
            });
        }
        // Also send to GA4
        if (typeof gtag === 'function') {
            gtag('event', success ? 'generate_lead' : 'form_error', {
                form_id: 'emailForm',
                form_name: 'Ebook Air Fryer Download'
            });
        }
        // Also send to Meta Pixel
        if (typeof fbq === 'function') {
            fbq('track', success ? 'Lead' : 'FormError', {
                form_id: 'emailForm'
            });
        }
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Client-side validation
        if (!validateEmail(email)) {
            showMessage('Por favor, insira um e-mail válido (ex: nome@email.com).', 'error');
            emailInput.focus();
            emailInput.setAttribute('aria-invalid', 'true');
            trackFormSubmit(false, email);
            return;
        }
        
        emailInput.setAttribute('aria-invalid', 'false');
        setLoading(true);
        formMessage.textContent = '';
        formMessage.className = 'form-message';
        
        // Prepare form data
        const formData = new FormData(form);
        
        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                // Success
                showMessage('Obrigado! Verifique seu e-mail para receber o ebook gratuito.', 'success');
                form.reset();
                setLoading(false);
                trackFormSubmit(true, email);
                
                // Redirect after brief delay for better UX
                setTimeout(() => {
                    window.location.href = form.querySelector('[name="_next"]').value;
                }, 1500);
            } else {
                // Server returned error
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erro no envio do formulário');
            }
        } catch (error) {
            console.error('Form submit error:', error);
            showMessage('Ops! Ocorreu um erro ao enviar. Tente novamente em alguns instantes.', 'error');
            setLoading(false);
            trackFormSubmit(false, email);
        }
    });
    
    // Clear error on input
    emailInput.addEventListener('input', function() {
        if (formMessage.classList.contains('error')) {
            formMessage.textContent = '';
            formMessage.className = 'form-message';
        }
        if (emailInput.getAttribute('aria-invalid') === 'true') {
            emailInput.setAttribute('aria-invalid', 'false');
        }
    });
    
    // Handle Enter key in email field
    emailInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
})();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.focus({ preventScroll: true });
        }
    });
});

// Performance: Preload thank you page on hover
const offerLink = document.querySelector('.offer-btn, .track-offer');
if (offerLink) {
    let preloaded = false;
    offerLink.addEventListener('mouseenter', function() {
        if (!preloaded) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = this.href;
            document.head.appendChild(link);
            preloaded = true;
        }
    }, { once: true, passive: true });
}

// Console log for debugging
console.log('Air Fryer Meal Prep LP loaded - tracking active');


// Capture UTMs from URL and populate form hidden fields
function populateFormWithUtms() {
    const form = document.getElementById('emailForm');
    if (!form) return;
    
    const params = new URLSearchParams(window.location.search);
    const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    
    utmFields.forEach(field => {
        const value = params.get(field) || sessionStorage.getItem(field);
        if (value) {
            // Check if hidden input already exists
            let hiddenInput = form.querySelector('input[name="' + field + '"]');
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = field;
                form.appendChild(hiddenInput);
            }
            hiddenInput.value = value;
        }
    });
}

// Also store UTMs in sessionStorage for persistence across pages
function storeUtmsInSession() {
    const params = new URLSearchParams(window.location.search);
    const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    
    utmFields.forEach(field => {
        const value = params.get(field);
        if (value) {
            sessionStorage.setItem(field, value);
        }
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        storeUtmsInSession();
        populateFormWithUtms();
    });
} else {
    storeUtmsInSession();
    populateFormWithUtms();
}
