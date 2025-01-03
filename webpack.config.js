const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');

module.exports = {
  target: 'web',
  devtool: 'source-map',
  entry: {
    background: './src/background/background.js',
    settings: './src/settings/settings.jsx',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: path.resolve(__dirname, 'dist') },
        { from: 'public', to: path.resolve(__dirname, 'dist') },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/settings/settings.html',
      filename: 'settings.html',
      chunks: ['settings']
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
    }),
    new webpack.HotModuleReplacementPlugin()
  ],
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          }
        }
      }
    ]
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
    minimize: true,
  },
  devServer: {
    // static: './dist',
    // static: './dist',
    hot: true,
    open: true,
    historyApiFallback: true,
    writeToDisk: true
  }
};