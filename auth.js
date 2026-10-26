// Shared helpers for login.html and signup.html: show/hide password buttons, Caps Lock hint, busy submit button.
// Load at the end of <body>, before the page's own script.

// Every .toggle-pass button shows or hides the input in the same .password-field.
function initPasswordToggles() {
    document.querySelectorAll('.password-field').forEach(field => {
        const input = field.querySelector('input');
        const btn = field.querySelector('.toggle-pass');
        btn.addEventListener('click', () => {
            const show = input.type === 'password';
            // Keep the caret where it was, so toggling mid-typing doesn't jump.
            const start = input.selectionStart, end = input.selectionEnd;
            input.type = show ? 'text' : 'password';
            btn.setAttribute('aria-pressed', String(show));
            btn.setAttribute('aria-label', show ? btn.dataset.hideLabel : btn.dataset.showLabel);
            btn.title = btn.getAttribute('aria-label');
            if (document.activeElement === input && start !== null) input.setSelectionRange(start, end);
        });
    });
}

// Called from applyTranslations so screen readers hear the button in the page's language.
function setPasswordToggleLabels(showLabel, hideLabel) {
    document.querySelectorAll('.toggle-pass').forEach(btn => {
        btn.dataset.showLabel = showLabel;
        btn.dataset.hideLabel = hideLabel;
        const label = btn.getAttribute('aria-pressed') === 'true' ? hideLabel : showLabel;
        btn.setAttribute('aria-label', label);
        btn.title = label;
    });
}

// Shows the element with id hintId while Caps Lock is on and one of the inputs has focus.
function watchCapsLock(inputs, hintId) {
    const hint = document.getElementById(hintId);
    const update = e => {
        if (typeof e.getModifierState === 'function') hint.classList.toggle('show', e.getModifierState('CapsLock'));
    };
    inputs.forEach(input => {
        input.addEventListener('keydown', update);
        input.addEventListener('keyup', update);
        input.addEventListener('blur', () => hint.classList.remove('show'));
    });
}

// Puts a spinner in the submit button and blocks double submits while a request runs.
function setBusy(btn, busy, text) {
    btn.disabled = busy;
    btn.setAttribute('aria-busy', String(busy));
    btn.textContent = text;
    if (busy) {
        const spin = document.createElement('span');
        spin.className = 'spinner';
        spin.setAttribute('aria-hidden', 'true');
        btn.appendChild(spin);
    }
}
