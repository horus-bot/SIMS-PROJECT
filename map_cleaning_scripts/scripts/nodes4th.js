// nodes4th.js

const fs = require("fs");
const path = require("path");

// Resolve paths properly
const svgPath = path.join(__dirname, "..", "data", "4thUNCLEAN.svg");
const outputPath = path.join(__dirname, "..", "data", "nodesData4th.json");

function extractNodesFromSVG(svgContent) {
  const circleRegex = /<circle\b[^>]*>/g;
  const cxRegex = /cx="([^"]+)"/;
  const cyRegex = /cy="([^"]+)"/;

  const nodes = {};
  const circles = svgContent.match(circleRegex) || [];

  circles.forEach((circleTag, index) => {
    const cxMatch = circleTag.match(cxRegex);
    const cyMatch = circleTag.match(cyRegex);

    if (cxMatch && cyMatch) {
      const x = parseFloat(cxMatch[1]);
      const y = parseFloat(cyMatch[1]);

      const nodeId = `node_${String(index + 1).padStart(3, "0")}`;

      nodes[nodeId] = {
        x,
        y,
        type: "path"
      };
    }
  });

  return { nodes };
}

function main() {
  try {
    console.log("Reading SVG file...");
    const svgContent = fs.readFileSync(svgPath, "utf8");

    console.log("Extracting nodes...");
    const nodesData = extractNodesFromSVG(svgContent);

    console.log("Saving JSON...");
    fs.writeFileSync(outputPath, JSON.stringify(nodesData, null, 2));

    console.log("Done. Nodes saved to:");
    console.log(outputPath);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();