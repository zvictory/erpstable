import bcrypt from 'bcryptjs';

export const PASSWORD_CONFIG = {
    SALT_ROUNDS: 10,
    MIN_LENGTH: 8,
    MAX_LENGTH: 100,
};

export async function hashPassword(password: string): Promise<string> {
    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
        throw new Error(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`);
    }
    if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
        throw new Error(`Password must not exceed ${PASSWORD_CONFIG.MAX_LENGTH} characters`);
    }
    return bcrypt.hash(password, PASSWORD_CONFIG.SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`);
    }

    if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
        errors.push(`Password must not exceed ${PASSWORD_CONFIG.MAX_LENGTH} characters`);
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
