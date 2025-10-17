// Tiny hash router + complex form validation + dynamic UI updates

(function () {
    // Allow importing in tests (CommonJS)
    if (typeof module !== 'undefined' && module.exports) {
        try {
            const { evaluatePasswordStrength } = require('./lib/password');
            module.exports.evaluatePasswordStrength = evaluatePasswordStrength;
        } catch (_) {}
    }
    const appRoot = document.getElementById('app');
    const routes = {
        '/': document.getElementById('view-home'),
        '/form': document.getElementById('view-form'),
        '/about': document.getElementById('view-about')
    };
    const notFound = document.getElementById('view-404');

    let formDirty = false; // navigation guard flag

    function setActiveLink(path) {
        const links = document.querySelectorAll('.nav__links a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            const linkPath = href ? href.replace('#', '') : '';
            if (linkPath === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    function setTitle(path) {
        const titleBase = 'Cognifyz Demo';
        const map = { '/': 'Home', '/form': 'Create Account', '/about': 'About' };
        const label = map[path] || 'Not Found';
        document.title = `${label} – ${titleBase}`;
    }

    function render(path) {
        const tpl = routes[path] || notFound || routes['/'];
        if (!tpl) return;
        appRoot.classList.add('route-fade');
        setTimeout(() => {
            appRoot.innerHTML = '';
            appRoot.appendChild(tpl.content.cloneNode(true));
            appRoot.classList.remove('route-fade');
            // After DOM is updated, set nav/title and bind view-specific handlers
            setActiveLink(path);
            setTitle(path);
            if (path === '/') bindHomeView();
            if (path === '/form') bindFormView();
            // Focus main region for screen-readers after navigation
            queueMicrotask(() => { try { appRoot.setAttribute('tabindex', '-1'); appRoot.focus({ preventScroll: true }); appRoot.removeAttribute('tabindex'); } catch (_) {} });
        }, 90);
    }

    function currentPath() {
        const hash = window.location.hash || '#/';
        try {
            const [, path] = hash.match(/^#(\/[\w-]*)?/) || [];
            return path || '/';
        } catch (_) {
            return '/';
        }
    }

    function navigate(path) {
        if (currentPath() === path) {
            render(path);
            return;
        }
        // Guard unsaved changes when leaving form
        if (currentPath() === '/form' && path !== '/form' && formDirty) {
            const ok = confirm('You have unsaved changes. Leave this page?');
            if (!ok) return;
        }
        window.location.hash = path;
    }

    // Home view interactions
    function bindHomeView() {
        const cta = document.getElementById('home-cta');
        if (cta) cta.addEventListener('click', () => navigate('/form'));
    }

    // Form validation logic
    const commonPasswords = new Set([
        'password', '123456', '123456789', 'qwerty', 'abc123', 'password1',
        '111111', '12345678', 'iloveyou', 'admin', 'welcome', 'monkey'
    ]);

    // Use shared lib for evaluation in app
    const passwordLib = (function() { try { return require('./lib/password'); } catch (_) { return null; } })();
    const evaluatePasswordStrength = passwordLib ? passwordLib.evaluatePasswordStrength : function(password) {
        const criteria = {
            length: password.length >= 12,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            digit: /\d/.test(password),
            symbol: /[^A-Za-z0-9]/.test(password),
            common: !commonPasswords.has(password.toLowerCase())
        };
        const passed = Object.values(criteria).filter(Boolean).length;
        const percent = Math.round((passed / 6) * 100);
        let color = 'var(--danger)';
        if (percent >= 83) color = 'var(--accent)';
        else if (percent >= 50) color = 'var(--warn)';
        return { criteria, passed, percent, color };
    };

    function showError(forName, message) {
        const el = document.querySelector(`[data-error-for="${forName}"]`);
        if (el) el.textContent = message || '';
    }

    function bindFormView() {
        const form = document.getElementById('signup-form');
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const confirm = document.getElementById('confirmPassword');
        const terms = document.getElementById('terms');
        const meterBar = document.querySelector('[data-strength-bar]');
        const criteriaList = document.getElementById('password-criteria');
        const success = document.getElementById('form-success');
        const emailStatus = document.getElementById('email-status');
        const emailSpinner = document.getElementById('email-spinner');
        const pwToggle = document.getElementById('pw-toggle');
        const pwGenerate = document.getElementById('pw-generate');
        const pwSuggestions = document.getElementById('password-suggestions');
        const toastRoot = document.getElementById('toast-root');

        // Restore draft (email only for safety)
        try {
            const draft = JSON.parse(localStorage.getItem('signupDraft') || 'null');
            if (draft && typeof draft.email === 'string') {
                email.value = draft.email;
            }
            if (draft && typeof draft.terms === 'boolean') {
                terms.checked = draft.terms;
            }
        } catch (_) {}

        function updateCriteriaUI(passwordValue) {
            const { criteria, percent, color } = evaluatePasswordStrength(passwordValue);
            // Update meter
            if (meterBar) {
                meterBar.style.width = `${percent}%`;
                meterBar.style.background = color;
            }
            // Update list
            if (criteriaList) {
                for (const key of Object.keys(criteria)) {
                    const item = criteriaList.querySelector(`[data-criteria="${key}"]`);
                    if (item) item.classList.toggle('ok', !!criteria[key]);
                }
            }
            if (pwSuggestions) {
                const suggestions = [];
                if (!criteria.length) suggestions.push('Use at least 12 characters');
                if (!criteria.upper) suggestions.push('Add an uppercase letter');
                if (!criteria.lower) suggestions.push('Add a lowercase letter');
                if (!criteria.digit) suggestions.push('Include a number');
                if (!criteria.symbol) suggestions.push('Include a symbol');
                if (!criteria.common) suggestions.push('Avoid common passwords');
                pwSuggestions.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
            }
        }

        function validateEmail() {
            const value = email.value.trim();
            if (!value) { showError('email', 'Email is required'); return false; }
            // Simple but robust email pattern for client-side use
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            const valid = emailRe.test(value);
            showError('email', valid ? '' : 'Enter a valid email address');
            return valid;
        }

        function validatePassword() {
            const value = password.value;
            if (!value) { showError('password', 'Password is required'); return false; }
            const { passed } = evaluatePasswordStrength(value);
            const valid = passed === 6; // all criteria
            showError('password', valid ? '' : 'Password does not meet all requirements');
            return valid;
        }

        function validateConfirm() {
            const valid = !!confirm.value && confirm.value === password.value;
            showError('confirmPassword', valid ? '' : 'Passwords do not match');
            return valid;
        }

        function validateTerms() {
            const valid = terms.checked;
            showError('terms', valid ? '' : 'You must accept the terms');
            return valid;
        }

        function validateForm() {
            const v1 = validateEmail();
            const v2 = validatePassword();
            const v3 = validateConfirm();
            const v4 = validateTerms();
            return v1 && v2 && v3 && v4;
        }

        // Email availability check (debounced, simulated)
        let emailTimer = null;
        function checkEmailAvailability(value) {
            // Simulate network latency and result: emails containing 'taken' are unavailable
            emailSpinner.hidden = false;
            emailStatus.textContent = '';
            return new Promise(resolve => {
                setTimeout(() => {
                    const unavailable = /taken/i.test(value);
                    resolve(!unavailable);
                }, 650);
            }).then(available => {
                emailSpinner.hidden = true;
                emailStatus.textContent = available ? 'Email available' : 'Email already in use';
                emailStatus.style.color = available ? 'var(--accent)' : 'var(--danger)';
                return available;
            });
        }

        email.addEventListener('input', () => {
            formDirty = true;
            validateEmail();
            clearTimeout(emailTimer);
            const value = email.value.trim();
            if (!value) { if (emailStatus) emailStatus.textContent = ''; emailSpinner.hidden = true; return; }
            emailTimer = setTimeout(() => { checkEmailAvailability(value); }, 500);
            // Save draft
            try { localStorage.setItem('signupDraft', JSON.stringify({ email: value, terms: terms.checked })); } catch (_) {}
        });
        password.addEventListener('input', () => {
            formDirty = true;
            updateCriteriaUI(password.value);
            validatePassword();
            validateConfirm(); // re-check match as user types
        });
        confirm.addEventListener('input', () => { formDirty = true; validateConfirm(); });
        terms.addEventListener('change', () => { formDirty = true; validateTerms(); try { localStorage.setItem('signupDraft', JSON.stringify({ email: email.value.trim(), terms: terms.checked })); } catch (_) {} });

        if (pwToggle) {
            pwToggle.addEventListener('click', () => {
                const showing = password.type === 'text';
                password.type = showing ? 'password' : 'text';
                pwToggle.textContent = showing ? 'Show' : 'Hide';
            });
        }

        // CapsLock detection
        password.addEventListener('keydown', (e) => {
            const caps = e.getModifierState && e.getModifierState('CapsLock');
            if (caps) showToast('Caps Lock is ON', 'warn');
        });

        function generateStrongPassword() {
            const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            const lower = 'abcdefghijkmnopqrstuvwxyz';
            const digits = '23456789';
            const symbols = '!@#$%^&*()-_=+[]{};:,.?';
            function pick(str, n) { return Array.from({ length: n }, () => str[Math.floor(Math.random() * str.length)]).join(''); }
            let candidate = pick(upper, 3) + pick(lower, 5) + pick(digits, 2) + pick(symbols, 2) + pick(upper + lower + digits + symbols, 4);
            candidate = candidate.split('').sort(() => Math.random() - 0.5).join('');
            return candidate;
        }

        if (pwGenerate) {
            pwGenerate.addEventListener('click', () => {
                const newPw = generateStrongPassword();
                password.value = newPw;
                formDirty = true;
                password.dispatchEvent(new Event('input', { bubbles: true }));
                copyToClipboard(newPw).then(() => showToast('Generated password copied to clipboard', 'ok'));
            });
        }

        function copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text).catch(() => Promise.resolve());
            }
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (_) {}
            document.body.removeChild(ta);
            return Promise.resolve();
        }

        function showToast(message, type) {
            if (!toastRoot) return;
            const el = document.createElement('div');
            el.textContent = message;
            el.setAttribute('role', 'status');
            el.style.background = type === 'ok' ? 'rgba(110,231,183,0.15)' : (type === 'warn' ? 'rgba(251,191,36,0.15)' : 'rgba(252,165,165,0.15)');
            el.style.border = type === 'ok' ? '1px solid rgba(110,231,183,0.35)' : (type === 'warn' ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(252,165,165,0.35)');
            el.style.color = type === 'ok' ? 'var(--accent)' : (type === 'warn' ? 'var(--warn)' : 'var(--danger)');
            el.style.padding = '8px 12px';
            el.style.borderRadius = '8px';
            el.style.margin = '8px 16px';
            toastRoot.hidden = false;
            toastRoot.appendChild(el);
            setTimeout(() => { el.remove(); if (!toastRoot.children.length) toastRoot.hidden = true; }, 3000);
        }

        // Initialize UI state
        updateCriteriaUI(password.value || '');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            success.hidden = true;
            if (!validateForm()) return;
            const submitBtn = form.querySelector('button[type="submit"]');
            const prevText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating...'; }
            await new Promise(r => setTimeout(r, 800));
            form.reset();
            updateCriteriaUI('');
            success.hidden = false;
            formDirty = false;
            try { localStorage.removeItem('signupDraft'); } catch (_) {}
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevText; }
            showToast('Account created successfully', 'ok');
        });
    }

    // Initialize routing
    window.addEventListener('hashchange', (e) => {
        const next = currentPath();
        const prevHash = e.oldURL ? e.oldURL.split('#')[1] || '/' : '/';
        // Guard when leaving form via manual hash change
        if (prevHash === '/form' && next !== '/form' && formDirty) {
            const ok = confirm('You have unsaved changes. Leave this page?');
            if (!ok) { history.pushState(null, '', '#' + prevHash); return; }
        }
        render(next);
    });
    window.addEventListener('DOMContentLoaded', () => render(currentPath()));

    // beforeunload guard
    window.addEventListener('beforeunload', (e) => {
        if (!formDirty) return;
        e.preventDefault();
        e.returnValue = '';
    });
})();


