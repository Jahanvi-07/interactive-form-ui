const commonPasswords = new Set([
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password1',
    '111111', '12345678', 'iloveyou', 'admin', 'welcome', 'monkey'
]);

function evaluatePasswordStrength(password) {
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
}

module.exports = { evaluatePasswordStrength };


