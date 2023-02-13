const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const miniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");

// 判断当前是什么环境

module.exports = (env) => {
return {
    entry: path.join(__dirname, "src/main.js"),
    output: {
      publicPath: env.development ? "/":"http://h5.cdn.intech.szhhhd.com/jx/a20230215_mh/",
      path: path.join(__dirname, "dist"),
      filename: "[name].[contenthash:8].js",
    },
    module: {
      rules: [
        {
          test: /\.html$/,
          use: {
            loader: 'html-loader',
            // options: {}
          }
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: miniCssExtractPlugin.loader,
              // 配置css文件路径，不配置图片资源引入路径会发生错误
              options: { publicPath: "../" },
            },
            "css-loader",
          ],
        },
        {
          test: /\.js$/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          loader: "url-loader",
          options: {
            // 小于该值的图片会使用base64编码
            limit: 1024,
            // 打包后的图片名称 [ext]指图片格式
            // name: "images/[name].[hash:8].[ext]",
            name: "images/[name].[ext]",
            // publicPath: "./"
          },
        },
      ],
    },
    optimization: {
      minimize: true,
    },
    plugins: [
      // 清除打包文件
      new CleanWebpackPlugin(),
      // 配置html打包
      new HtmlWebPackPlugin({
        template: "./src/index.html",
        filename: "./index.html",
        hash: true,
        minify: {
          // 删除空格、换行
          collapseWhitespace: true,
        },
      }),
      // 打包分离 css 文件
      new miniCssExtractPlugin({
        // 输出的css文件名，放置在dist目录下
        filename: "css/[name].[contenthash:8].css",
        chunkFilename: "css/[name].[contenthash:8].chunk.css",
      }),
      // 压缩 css 文件
      new OptimizeCssAssetsPlugin(),
    ],
    devServer: {
      disableHostCheck: true,
      port: 8900,
      proxy: {
        '/api': {
          target: 'http://h5.intech.szhhhd.com',
          // pathRewrite: { '/api': '/api' },
          changeOrigin: true
        }
      },
    },
  }
}
