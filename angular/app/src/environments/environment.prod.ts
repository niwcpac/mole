const world = 'ne_simple_style/style.json';
const world2 = 'ne_simple_style2/style.json';


export const environment = {
  production: false,
  maptiles:  {
    world: `/mapbox/styles/${world}`,
    world2: `/mapbox/styles/${world2}`,
  },
  hostname: `${window.location.hostname}`,
  staticURL: "/static",
  baseHref: "/",
  fonts: `http://`+`${window.location.hostname}`+`:8081/fonts/{fontstack}/{range}.pbf`,
  pulsarPort: '8090'
};


