'use strict';

const Path = require('path');
const Webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractSASS = new ExtractTextPlugin({ filename: './[name].[md5:contenthash:hex:20].css' });
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const webpack = require('webpack');
const WebpackGitHash = require('webpack-git-hash');

const pages = require('./src/pages');

let renderedPages = [];

for (let i = 0; i < pages.length; i++) {
  let page = Object.assign({}, pages[i]);
  renderedPages.push(
    new HtmlWebpackPlugin({
      template: page.template,
      filename: page.output,
      title: page.content.title,
      description: page.content.description
    })
  );
}

module.exports = (options) => {
  const dest = Path.join(__dirname, 'public');

  let webpackConfig = {
    devtool: options.devtool,
    entry: ['./src/app.js'],
    output: {
      path: dest,
      filename: options.isProduction ? './assets/scripts/[name].[githash].js' : './assets/scripts/[name].[hash].js',
      publicPath: './',
    },
    plugins: [
      new WebpackGitHash(),
      new Webpack.ProvidePlugin({}),
      new CopyWebpackPlugin([
        {from: './src/assets/images', to: './assets/images'}
      ]),
      new CopyWebpackPlugin([
        {from: './src/assets/fonts', to: './assets/fonts'}
      ]),
      new Webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(options.isProduction ? 'production' : 'development')
        }
      }),
			new webpack.EnvironmentPlugin(['LANG']),
		],
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader'
        },
        {
          test: /\.hbs$/,
          loader: 'handlebars-loader',
          query: {
            helperDirs: [
              Path.join(__dirname, 'src', 'helpers')
            ],
            partialDirs: [
              Path.join(__dirname, 'src', 'layouts'),
              Path.join(__dirname, 'src', 'components'),
              Path.join(__dirname, 'src', 'pages')
            ],
            inlineRequires: '\/assets/images\/'
          }
        },
        {
          test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: './assets/fonts'
            }
          }]
        },
        {
          test: /\.(gif|jpg|png)$/,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: './assets/images'
          }
        }
      ]
    }
  };

  if (options.isProduction) {
    webpackConfig.entry = ['./src/app.js'];

    webpackConfig.plugins.push(
      ExtractSASS,
      new CleanWebpackPlugin(['public'], {
        verbose: true,
        dry: false
      })
    );

    webpackConfig.module.rules.push({
      test: /\.scss$/i,
      use: ExtractSASS.extract(['css-loader', 'sass-loader'])
    }, {
      test: /\.css$/i,
      use: ExtractSASS.extract(['css-loader'])
    });

  } else {
    webpackConfig.plugins.push(
      new Webpack.HotModuleReplacementPlugin()
    );

    webpackConfig.module.rules.push({
      test: /\.scss$/i,
      use: ['style-loader?sourceMap', 'css-loader?sourceMap', 'sass-loader?sourceMap']
    }, {
      test: /\.css$/i,
      use: ['style-loader', 'css-loader']
    }, {
      test: /\.js$/,
      use: 'eslint-loader',
      exclude: /node_modules/
    });

    webpackConfig.devServer = {
      port: options.port,
      contentBase: dest,
      historyApiFallback: true,
      compress: options.isProduction,
      inline: !options.isProduction,
      hot: !options.isProduction,
      stats: {
        chunks: false
      },
      publicPath: "/",
    };

    webpackConfig.plugins.push(
      new BrowserSyncPlugin({
        host: 'localhost',
        port: 3001,
        proxy: 'http://localhost:8081/',
        files: [{
          match: [
            '**/*.hbs'
          ],
          fn: function (event, file) {
            if (event === 'change' || event === 'add' || event === 'unlink') {
              const bs = require('browser-sync').get('bs-webpack-plugin');
              bs.reload();
            }
          }
        }]
      }, {
        reload: false
      })
    );

  }

  webpackConfig.plugins = webpackConfig.plugins.concat(renderedPages);

  return webpackConfig;

};
