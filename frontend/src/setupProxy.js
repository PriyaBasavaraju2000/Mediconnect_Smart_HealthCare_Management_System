const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Proxy all /api requests to Spring Boot backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );

  // Proxy WebSocket connections to Spring Boot backend
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      ws: true, // enable WebSocket proxying
    })
  );

  // Proxy OAuth2 redirects
  app.use(
    '/oauth2',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
};