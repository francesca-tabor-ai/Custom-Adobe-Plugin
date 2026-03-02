const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    libraryTarget: "commonjs2",
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@brand-sync/shared": path.resolve(__dirname, "../../shared/src"),
      "@brand-sync/plugin-core": path.resolve(__dirname, "../../plugin-core/src"),
    },
  },
  module: {
    rules: [
      { test: /\.ts$/, use: { loader: "ts-loader", options: { transpileOnly: true } }, exclude: /node_modules/ },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "plugin", to: "." }],
    }),
  ],
  externals: {
    uxp: "commonjs2 uxp",
    photoshop: "commonjs2 photoshop",
  },
  devtool: "source-map",
};
