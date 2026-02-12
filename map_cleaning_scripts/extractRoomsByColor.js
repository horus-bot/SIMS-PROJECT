const fs = require("fs");
const { DOMParser } = require("xmldom");

// helper to extract fill from style string
function getFill(el) {
  let fill = el.getAttribute("fill");

  if (fill && fill !== "none" && fill !== "transparent") {
    return fill;
  }

  const style = el.getAttribute("style");
  if (style) {
    const match = style.match(/fill:([^;]+)/);
    if (match) {
      const styleFill = match[1].trim();
      if (styleFill !== "none" && styleFill !== "transparent") {
        return styleFill;
      }
    }
  }

  return null;
}

// helper to convert NodeList to array
function toArray(nodeList) {
  const arr = [];
  for (let i = 0; i < nodeList.length; i++) {
    arr.push(nodeList.item(i));
  }
  return arr;
}

// load SVG
const svgText = fs.readFileSync("map2.svg", "utf8");
const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");

// collect shapes
const shapes = [
  ...toArray(doc.getElementsByTagName("path")),
  ...toArray(doc.getElementsByTagName("rect")),
  ...toArray(doc.getElementsByTagName("polygon")),
  ...toArray(doc.getElementsByTagName("circle"))
];

const rooms = [];
const routes = [];

shapes.forEach((el, index) => {
  const fill = getFill(el);

  const entry = {
    id: el.getAttribute("id") || `shape_${index}`,
    type: el.tagName
  };

  entry.d = el.getAttribute("d") || null;
  entry.points = el.getAttribute("points") || null;

  if (fill) {
    entry.fill = fill;
    rooms.push(entry);
  } else {
    routes.push(entry);
  }
});

const output = {
  rooms,
  routes
};

fs.writeFileSync("mapStyleDataVaishuEdition.json", JSON.stringify(output, null, 2));

console.log("Extraction complete.");
console.log("Rooms:", rooms.length);
console.log("Routes:", routes.length);