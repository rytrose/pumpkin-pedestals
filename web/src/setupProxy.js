const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    createProxyMiddleware("/websocket", {
      target: "ws://127.0.0.1:5000",
      ws: true,
      changeOrigin: true,
    })
  );
};
