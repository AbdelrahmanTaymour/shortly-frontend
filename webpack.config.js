const path = require('path');
const { globSync } = require('glob');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

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
                    styles: {
                        name: 'main',
                        type: 'css/mini-extract',
                        chunks: 'all',
                        enforce: true,
                    },
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
                favicon: "./src/assets/favicon.ico",
                inject: 'body',
            }),
            new Dotenv({
                systemvars: true,
            }),

            new MiniCssExtractPlugin({
                filename: 'css/[name].[contenthash].css',
                chunkFilename: 'css/[id].[contenthash].css', // Ensures lazy CSS goes to /css/
            }),


            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.join(PATHS.styles, 'fontawesome/css/all.min.css'),
                        to: 'styles/fontawesome/css/all.min.css'
                    },
                    {
                        from: path.join(PATHS.styles, 'fontawesome/webfonts'),
                        to: 'styles/fontawesome/webfonts'
                    },
                    {
                        from: path.join(PATHS.src, 'ui'),
                        to: path.resolve(__dirname, 'dist/ui'),
                        globOptions: { ignore: ['**/*.js'] },
                        noErrorOnMissing: true,
                    },
                    {
                        from: PATHS.styles,
                        to: path.resolve(__dirname, 'dist/styles'),
                        globOptions: {
                            // This is the critical line: do not copy the whole fontawesome folder again
                            ignore: ['**/fontawesome/**']
                        },
                        noErrorOnMissing: true,
                    },
                ],
            }),


            ...(isProduction ? [
                new PurgeCSSPlugin({
                    paths: globSync([
                        path.join(PATHS.src, '**/*'),
                        path.join(__dirname, '_legacy', '**/*'),
                    ], { nodir: true }),
                    safelist: ['is-active', 'loaded']
                })
            ] : []),

            new BundleAnalyzerPlugin({
                analyzerMode: 'static', // Generates an HTML file in 'dist'
                openAnalyzer: false,    // Set to true to open automatically after build
            }),
        ],
    };
};