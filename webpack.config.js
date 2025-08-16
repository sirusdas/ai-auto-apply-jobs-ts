const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    popup: './src/popup/index.tsx',
    content: './src/content/index.ts',
    background: './src/background/index.ts',
    settings: './src/settings/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
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
  }
};