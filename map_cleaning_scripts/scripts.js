const MAP_VIEWBOX = "0 0 4101 3025";

// bright kid-friendly palettes
const blueSet = ["#60A5FA", "#3B82F6", "#2563EB", "#93C5FD"];
const orangeSet = ["#FDBA74", "#FB923C", "#F97316", "#FED7AA"];

async function loadMap() {
  const container = document.getElementById("mapContainer");

  // load SVG
  const svgText = await fetch("map.svg").then(r => r.text());
  container.innerHTML = svgText;

  const svg = container.querySelector("svg");
  svg.setAttribute("viewBox", MAP_VIEWBOX);
  svg.style.background = "#FFF7ED";

  // remove global black fills
  resetBaseStyles(svg);

  // load room/route data
  const data = await fetch("mapStyleDataVaishuEdition.json").then(r => r.json());

  // create defs once
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", "roomShadow");
  filter.setAttribute("x", "-20%");
  filter.setAttribute("y", "-20%");
  filter.setAttribute("width", "140%");
  filter.setAttribute("height", "140%");

  const drop = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
  drop.setAttribute("dx", "0");
  drop.setAttribute("dy", "6");
  drop.setAttribute("stdDeviation", "6");
  drop.setAttribute("flood-opacity", "0.25");

  filter.appendChild(drop);
  defs.appendChild(filter);
  svg.prepend(defs);

  styleRooms(svg, data.rooms, defs);
  styleRoutes(svg, data.routes);
}

function resetBaseStyles(svg) {
  const shapes = svg.querySelectorAll("path, rect, polygon, circle");

  shapes.forEach(el => {
    el.removeAttribute("fill");
    el.removeAttribute("stroke");
    el.style.fill = "none";
    el.style.stroke = "none";
  });
}

function styleRooms(svg, rooms, defs) {
  rooms.forEach((room, index) => {
    const el = svg.getElementById(room.id);
    if (!el) return;

    // choose palette
    const palette = index % 2 === 0 ? blueSet : orangeSet;
    const baseColor = palette[index % palette.length];
    const sideColor = darken(baseColor, 50);
    const topColor = lighten(baseColor, 30);

    // create gradient for top
    const gradId = `grad_${room.id}`;
    const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    grad.setAttribute("id", gradId);
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0");
    grad.setAttribute("y2", "1");

    const stopTop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stopTop.setAttribute("offset", "0%");
    stopTop.setAttribute("stop-color", topColor);

    const stopBottom = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stopBottom.setAttribute("offset", "100%");
    stopBottom.setAttribute("stop-color", baseColor);

    grad.appendChild(stopTop);
    grad.appendChild(stopBottom);
    defs.appendChild(grad);

    // create side wall
    const side = el.cloneNode(true);
    side.removeAttribute("id");

    side.style.fill = sideColor;
    side.style.stroke = "none";
    side.style.filter = "none";
    side.setAttribute("transform", "translate(8,8)");

    // insert side behind room
    el.parentNode.insertBefore(side, el);

    // style top face
    el.style.fill = `url(#${gradId})`;
    el.style.stroke = "#1F2937";
    el.style.strokeWidth = "3";
    el.style.filter = "url(#roomShadow)";
  });
}

function styleRoutes(svg, routes) {
  routes.forEach(route => {
    const el = svg.getElementById(route.id);
    if (!el) return;

    el.style.stroke = "#0EA5E9";
    el.style.strokeWidth = "6";
    el.style.strokeLinecap = "round";
    el.style.strokeLinejoin = "round";
    el.style.fill = "none";
    el.style.opacity = "0.9";
  });
}

// color helpers
function lighten(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;

  r = Math.min(255, r);
  g = Math.min(255, g);
  b = Math.min(255, b);

  return `rgb(${r},${g},${b})`;
}

function darken(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) - amount;
  let g = ((num >> 8) & 0x00ff) - amount;
  let b = (num & 0x0000ff) - amount;

  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);

  return `rgb(${r},${g},${b})`;
}

// start
loadMap();