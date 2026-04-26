const path = require('path');
const glob = require('glob-all');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const Dotenv = require('dotenv-webpack'); // Added this

const PATHS = {
    src: path.join(__dirname, 'src')
};

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        mode: isProduction ? 'production' : 'development', // Dynamic mode
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
                        // Use MiniCss for prod, style-loader for faster dev
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
            historyApiFallback: true, // Critical for SPAs on Vercel
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
                systemvars: true, // This allows Vercel's Environment Variables to work!
            }),
            new MiniCssExtractPlugin({
                filename: 'css/[name].[contenthash].css',
            }),
            // Only run PurgeCSS in production to keep dev builds fast
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