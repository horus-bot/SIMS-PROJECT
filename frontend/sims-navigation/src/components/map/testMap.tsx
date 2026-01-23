import React, { useMemo } from "react";
import testData from "../../data/test_1.json";

type NodeType = {
  x: number;
  y: number;
  type: string;
};

type EdgeType = {
  from: string;
  to: string;
};

const TestMap: React.FC = () => {
  // ------------------ SAFE NODES ------------------
  const nodes = useMemo(() => {
    return Object.entries(testData.nodes)
      .filter(([_, n]) => n && typeof n.x === "number" && typeof n.y === "number")
      .map(([id, data]) => ({
        id,
        ...(data as NodeType)
      }));
  }, []);

  const edges = testData.edges as EdgeType[];

  // Quick lookup
  const nodeMap = testData.nodes as Record<string, NodeType>;

  return (
    <div style={{ width: "100%" }}>
      <h2>Graph Debug View (Nodes + Edges)</h2>

      <div style={{ position: "relative", border: "1px solid #333" }}>
        <img src="/test.svg" alt="Map" style={{ width: "100%" }} />

        <svg
          viewBox="0 0 4101 3025"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%"
          }}
        >
          {/* ------------------ EDGES ------------------ */}
          {edges.map((e, idx) => {
            const from = nodeMap[e.from];
            const to = nodeMap[e.to];

            // skip broken edges
            if (!from || !to) return null;

            return (
              <line
                key={idx}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#999"
                strokeWidth="4"
                opacity={0.6}
              />
            );
          })}

          {/* ------------------ NODES ------------------ */}
          {nodes.map(n => (
            <circle
              key={n.id}
              cx={n.x}
              cy={n.y}
              r={6}
              fill="#00e5ff"
              stroke="#000"
              strokeWidth={1.5}
            />
          ))}
        </svg>
      </div>

      <div style={{ marginTop: "10px", fontSize: "14px" }}>
        Nodes: <strong>{nodes.length}</strong> <br />
        Edges: <strong>{edges.length}</strong>
      </div>
    </div>
  );
};

export default TestMap;
