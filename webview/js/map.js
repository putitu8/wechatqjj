const STADIA_KEY = '94b4b80b-f12e-4c63-b860-93a6c584bfe9';
const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([30.243, 120.145], 13);
L.tileLayer(`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}`, {
  maxZoom: 19,
  attribution: ''
}).addTo(map);
window._map = map;
