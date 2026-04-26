const path = require('path');
const glob = require('glob-all');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

const PATHS = {
    src:    path.resolve(__dirname, 'src'),
    styles: path.resolve(__dirname, 'styles'),   // root-level, not src/styles
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
            static: [
                {
                    directory: PATHS.src,       // GET /ui/pages/X.html → src/ui/pages/X.html
                    publicPath: '/',
                    watch: true,
                },
                {
                    directory: PATHS.styles,    // GET /styles/fontawesome/... → styles/fontawesome/...
                    publicPath: '/styles',
                    watch: true,
                },
            ],
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
                        from: path.join(PATHS.src, 'ui'),
                        to:   path.resolve(__dirname, 'dist/ui'),
                        globOptions: {
                            ignore: ['**/*.js'],
                        },
                        noErrorOnMissing: true,
                    },
                    {
                        from: PATHS.styles,                           // root styles/
                        to:   path.resolve(__dirname, 'dist/styles'), // → dist/styles/
                        noErrorOnMissing: true,
                    },
                ],
            }),

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