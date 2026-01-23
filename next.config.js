
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: ["localhost:3000", "127.0.0.1:3000", "192.168.1.110:3000", "0.0.0.0:3000"]
        }
    }
};

module.exports = withNextIntl(nextConfig);
