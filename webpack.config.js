const path = require('path');
const glob = require('glob-all');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const PATHS = {
    src: path.join(__dirname, 'src')
};


module.exports = {
    mode: 'development',
    entry: './src/main.js',
    output: {
        publicPath: '/',
        filename: 'js/[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ],
            },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: [
            `...`, // This keeps the default JS minimizer active
            new CssMinimizerPlugin(), // This squashes your CSS
        ],
        splitChunks: {
            chunks: 'all',
            name: false, // Better for long-term caching
            cacheGroups: {
                // Isolate ApexCharts into its own chunk
                apexcharts: {
                    test: /[\\/]node_modules[\\/]apexcharts[\\/]/,
                    name: 'vendor-apexcharts',
                    chunks: 'all',
                    priority: 20 // Ensure this runs before the default vendor catch-all
                },
                // Default vendor chunk for everything else
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10
                }
            }
        },
    },
    devServer: {
        historyApiFallback: true,
        static: [
            { directory: path.join(__dirname, 'public') },
            { directory: path.join(__dirname, 'src') },
            { directory: path.join(__dirname, './') }
        ],
        compress: false,
        port: 3000,
        hot: true,
        open: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
            inject: 'body',
        }),
        new PurgeCSSPlugin({
            paths: glob.sync(
                [
                    `${PATHS.src}/**/*`,
                    `${path.join(__dirname, '_legacy')}/**/*`,
                ]
                , { nodir: true }),
            // Safe-list specific classes you don't want purged (e.g., dynamic classes)
            safelist: ['is-active', 'loaded']
        }),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash].css',
        }),
    ],
};