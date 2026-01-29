
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: [
                "localhost:3000",
                "127.0.0.1:3000",
                "192.168.1.110:3000",
                "0.0.0.0:3000",
                "erpstable.com",
                "www.erpstable.com"
            ]
        },
        serverComponentsExternalPackages: ['@libsql/client', 'libsql', 'better-sqlite3']
    },
    webpack: (config, { webpack, isServer }) => {
        // Add fallbacks for Node.js modules in client-side code
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
                path: false,
                stream: false,
                util: false,
                child_process: false,
                'better-sqlite3': false,
                '@libsql/client': false,
                'libsql': false,
            };
        }

        // Ignore native binaries and libsql modules in client bundle
        config.plugins.push(
            new webpack.IgnorePlugin({
                checkResource(resource, context) {
                    // Ignore libsql platform-specific binaries
                    const lazyImports = [
                        '@libsql/darwin-arm64',
                        '@libsql/linux-x64-gnu',
                        '@libsql/win32-x64-msvc',
                    ];

                    if (lazyImports.some((lib) => resource.includes(lib))) {
                        return true;
                    }

                    // Ignore libsql client entirely in client-side bundles
                    if (!isServer && (resource.includes('@libsql/client') || resource.includes('libsql'))) {
                        return true;
                    }

                    return false;
                },
            })
        );

        // Handle markdown, LICENSE, and other doc files
        config.module.rules.push({
            test: /\.md$/,
            type: 'asset/source',
        });

        // Handle LICENSE files (with and without extension)
        config.module.rules.push({
            test: /LICENSE$/,
            type: 'asset/source',
        });

        // Handle .node files
        config.module.rules.push({
            test: /\.node$/,
            type: 'asset/resource',
        });

        // Handle TypeScript declaration files from node_modules
        config.module.rules.push({
            test: /\.d\.ts$/,
            type: 'asset/source',
        });

        return config;
    }
};

module.exports = withNextIntl(nextConfig);
