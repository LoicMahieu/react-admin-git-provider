const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  module: {
    rules: [{ test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }],
  },
  mode: "development",
  plugins: [
    new HtmlWebpackPlugin({
      title: "Sample",
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'GITLAB_API': JSON.stringify(process.env.GITLAB_API),
        'GITLAB_OAUTH_CLIENT_ID': JSON.stringify(process.env.GITLAB_OAUTH_CLIENT_ID),
        'GITLAB_OAUTH_BASE_URL': JSON.stringify(process.env.GITLAB_OAUTH_BASE_URL),
        'GITLAB_PROJECT_ID': JSON.stringify(process.env.GITLAB_PROJECT_ID),
        'GITLAB_REF': JSON.stringify(process.env.GITLAB_REF),

        'GITHUB_OAUTH_CLIENT_ID': JSON.stringify(process.env.GITHUB_OAUTH_CLIENT_ID),
      },
    }),
  ],
  devServer: {
    historyApiFallback: true,
    hot: false,
    inline: true,
    contentBase: "./app",
    port: 3000,
    host: "0.0.0.0",
    disableHostCheck: true,
  },
};
