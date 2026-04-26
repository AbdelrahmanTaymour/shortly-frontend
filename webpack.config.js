const path = require('path');
const glob = require('glob-all');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin'); // NEW
const Dotenv = require('dotenv-webpack');

const PATHS = {
    src: path.join(__dirname, 'src')
};

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        mode: isProduction ? 'production' : 'development',
        entry: './src/main.js',
        output: {
            publicPath: '/',
            filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                        'css-loader'
                    ],
                },
            ],
        },
        optimization: {
            minimize: isProduction,
            minimizer: [
                `...`,
                new CssMinimizerPlugin(),
            ],
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    apexcharts: {
                        test: /[\\/]node_modules[\\/]apexcharts[\\/]/,
                        name: 'vendor-apexcharts',
                        priority: 20
                    },
                    vendors: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        priority: 10
                    }
                }
            },
        },
        devServer: {
            static: {
                directory: path.resolve(__dirname, 'src'),
                publicPath: '/',
                watch: true, // Live-reload when template HTML files change
            },
            historyApiFallback: true,
            port: 3000,
            hot: true,
            open: true,
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './index.html',
                inject: 'body',
            }),
            new Dotenv({
                systemvars: true,
            }),
            new MiniCssExtractPlugin({
                filename: 'css/[name].[contenthash].css',
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, 'src/ui'),
                        to:   path.resolve(__dirname, 'dist/ui'),
                        globOptions: {
                            ignore: ['**/*.js'], // Bundled by webpack; don't duplicate
                        },
                        noErrorOnMissing: true,
                    },
                    {
                        from: path.resolve(__dirname, 'src/styles'),
                        to:   path.resolve(__dirname, 'dist/styles'),
                        noErrorOnMissing: true,
                    },
                ],
            }),

            // PurgeCSS only in production — keep dev builds fast
            ...(isProduction ? [
                new PurgeCSSPlugin({
                    paths: glob.sync([
                        `${PATHS.src}/**/*`,
                        `${path.join(__dirname, '_legacy')}/**/*`,
                    ], { nodir: true }),
                    safelist: ['is-active', 'loaded']
                })
            ] : []),
        ],
    };
};