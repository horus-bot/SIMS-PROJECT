const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "data", "nodesData4th.json");
const outputPath = path.join(__dirname, "..", "data", "graphData4th.json");

const STEP = 9;
const TOLERANCE = 0.6;

function isClose(a, b, tolerance = TOLERANCE) {
  return Math.abs(a - b) <= tolerance;
}

function groupByCoordinate(nodes, key) {
  const groups = {};

  Object.entries(nodes).forEach(([id, node]) => {
    const value = node[key].toFixed(1); // normalize float precision
    if (!groups[value]) groups[value] = [];
    groups[value].push({ id, ...node });
  });

  return groups;
}

function connectSequential(sortedNodes, axis) {
  const edges = [];

  for (let i = 0; i < sortedNodes.length - 1; i++) {
    const current = sortedNodes[i];
    const next = sortedNodes[i + 1];

    const distance =
      axis === "x"
        ? Math.abs(current.y - next.y)
        : Math.abs(current.x - next.x);

    if (isClose(distance, STEP)) {
      edges.push({ from: current.id, to: next.id });
    }
  }

  return edges;
}

function generateEdges(nodes) {
  const edges = [];

  // Vertical connections (same X)
  const verticalGroups = groupByCoordinate(nodes, "x");

  Object.values(verticalGroups).forEach(group => {
    group.sort((a, b) => a.y - b.y);
    edges.push(...connectSequential(group, "x"));
  });

  // Horizontal connections (same Y)
  const horizontalGroups = groupByCoordinate(nodes, "y");

  Object.values(horizontalGroups).forEach(group => {
    group.sort((a, b) => a.x - b.x);
    edges.push(...connectSequential(group, "y"));
  });

  return edges;
}

function main() {
  console.log("Reading nodes...");
  const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const nodes = data.nodes;

  console.log("Generating edges...");
  const edges = generateEdges(nodes);

  const output = {
    nodes,
    edges
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("Graph saved to:");
  console.log(outputPath);
}

main();