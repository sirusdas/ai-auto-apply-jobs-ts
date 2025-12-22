const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
    mode: 'production',
    devtool: false, // No source maps in production
    entry: {
        popup: './src/popup/index.tsx',
        content: './src/content/index.ts',
        background: './src/background/index.ts',
        settings: './src/settings/index.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true // Clean dist folder before build
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true, // Remove all console.* statements
                        drop_debugger: true, // Remove debugger statements
                        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'], // Extra safety
                    },
                    mangle: {
                        // Mangle variable names to make code harder to read
                        toplevel: true,
                        safari10: true,
                    },
                    format: {
                        comments: false, // Remove all comments
                    },
                },
                extractComments: false, // Don't extract comments to separate file
            }),
        ],
    },
    plugins: [
        // Obfuscate the code to make it harder to reverse engineer
        new WebpackObfuscator(
            {
                rotateStringArray: true,
                stringArray: true,
                stringArrayThreshold: 0.8,
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.5,
                deadCodeInjection: false, // Keep false to avoid bloat and potential breaks
                debugProtection: false,
                disableConsoleOutput: true,
                identifierNamesGenerator: 'hexadecimal',
                log: false,
                numbersToExpressions: true,
                renameGlobals: false,
                selfDefending: true, // Safe in most modern browsers
                simplify: true,
                splitStrings: true,
                splitStringsChunkLength: 10,
                stringArrayShuffle: true,
                stringArrayWrappersCount: 2,
                stringArrayWrappersChainedCalls: true,
                stringArrayWrappersParametersMaxCount: 4,
                stringArrayWrappersType: 'function',
                stringArrayIndexShift: true,
                stringArrayRotate: true,
                stringArrayEncoding: ['base64', 'rc4'],
                target: 'browser-no-eval',
                transformObjectKeys: true,
                unicodeEscapeSequence: true
            },
            ['popup.js', 'content.js', 'background.js', 'settings.js']
        )
    ],
    performance: {
        hints: false, // Disable performance hints for production
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    }
};
