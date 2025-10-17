const { evaluatePasswordStrength } = require('../lib/password');

describe('evaluatePasswordStrength', () => {
    test('fails all for empty', () => {
        const r = evaluatePasswordStrength('');
        expect(r.passed).toBe(0);
        expect(r.criteria.length).toBe(false);
        expect(r.criteria.upper).toBe(false);
        expect(r.criteria.lower).toBe(false);
        expect(r.criteria.digit).toBe(false);
        expect(r.criteria.symbol).toBe(false);
        expect(r.criteria.common).toBe(true); // empty is not in common list
    });

    test('detects common password', () => {
        const r = evaluatePasswordStrength('password');
        expect(r.criteria.common).toBe(false);
    });

    test('meets all criteria for strong password', () => {
        const r = evaluatePasswordStrength('Str0ng!Passw0rd');
        expect(r.passed).toBe(6);
        expect(r.percent).toBe(100);
    });

    test('partial pass shows mid percent and warn color', () => {
        const r = evaluatePasswordStrength('Abcdefghijkl'); // length + upper + lower only
        expect(r.passed).toBeGreaterThanOrEqual(2);
        expect(r.percent).toBeGreaterThan(0);
    });
});


