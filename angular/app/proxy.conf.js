const traefik_host = 'proxy';
const traefik_port = '80';

const rewriteFn = function (path, req) {
  return path;
};

// TODO: Confirm which of these are actually necessary. Suspect only first 2 may be necessary.
const PROXY_CONFIG = [
  {
    context: [
      "/api",
    ],
    "target": "http://" + traefik_host + ":" + traefik_port,
    "secure": false,
    "changeOrigin": true,
    "headers": { "Host": "localhost" },
  },
  {
    context: [
      "/angular/sockjs-node",
    ],
    "target": "http://" + traefik_host + ":" + traefik_port,
    "secure": false,
    "changeOrigin": true,
    "ws": true,
    "headers": { "Host": "localhost" },
  },
  {
    context: [
      "/angular/ws",
    ],
    "target": "http://" + traefik_host + ":" + traefik_port,
    "secure": false,
    "changeOrigin": true,
    "ws": true,
    "headers": { "Host": "localhost" },
  },
  {
    context: [
      "/media",
    ],
    "target": "http://" + traefik_host + ":" + traefik_port,
    "secure": false,
    "changeOrigin": true,
    "headers": { "Host": "localhost" },
  },
  {
    context: [
      "/api-auth-token",
    ],
    "target": "http://" + traefik_host + ":" + traefik_port,
    "secure": false,
    "changeOrigin": true,
    "headers": { "Host": "localhost" },
  },
  {
    context: [
      "/static",
    ],
    "target": "http://" + traefik_host + ":" + traefik_port,
    "secure": false,
    "changeOrigin": true,
    "headers": { "Host": "localhost" },
  },
  {
    context: [
      "/mapbox",
    ],
    "target": "http://" + traefik_host + ":" + traefik_port,
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": {
      "^/mapbox": "/maps"
    },
    "headers": { "Host": "localhost" },
  }
];

module.exports = PROXY_CONFIG;

