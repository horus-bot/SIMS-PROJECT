import React, { useMemo, useState } from "react";
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

const VIEWBOX = "0 0 4101 3025";

const TestMap: React.FC = () => {
  const [originNode, setOriginNode] = useState<string>("");
  const [destinationNode, setDestinationNode] = useState<string>("");

  // ------------------ NODE MAP ------------------
  const nodeMap = useMemo(() => {
    return testData.nodes as Record<string, NodeType>;
  }, []);

  // ------------------ DESTINATION MAP (from JSON) ------------------
  const destinationMap = useMemo(() => {
    return (testData as any).destination as Record<string, string>;
  }, []);

  const destinationList = useMemo(() => {
    if (!destinationMap) return [];
    return Object.entries(destinationMap)
      .map(([name, nodeId]) => ({ name, nodeId }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [destinationMap]);

  // ------------------ ALL NODES LIST ------------------
  const nodes = useMemo(() => {
    return Object.entries(nodeMap)
      .filter(([_, n]) => n && typeof n.x === "number" && typeof n.y === "number")
      .map(([id, n]) => ({
        id,
        ...n
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [nodeMap]);

  // ------------------ SAFE EDGES ------------------
  const edges = useMemo(() => {
    const rawEdges = testData.edges as EdgeType[];

    return rawEdges.filter((e) => {
      const from = nodeMap[e.from];
      const to = nodeMap[e.to];
      return !!from && !!to;
    });
  }, [nodeMap]);

  // ------------------ BUILD GRAPH ------------------
  const graph = useMemo(() => {
    const g: Record<string, { to: string; weight: number }[]> = {};

    nodes.forEach((n) => {
      g[n.id] = [];
    });

    edges.forEach((e) => {
      const fromNode = nodeMap[e.from];
      const toNode = nodeMap[e.to];
      if (!fromNode || !toNode) return;

      const w = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
      g[e.from].push({ to: e.to, weight: w });
    });

    return g;
  }, [nodes, edges, nodeMap]);

  // ------------------ DIJKSTRA ------------------
  const dijkstra = (start: string, goal: string): string[] => {
    if (!graph[start] || !graph[goal]) return [];

    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    const visited = new Set<string>();

    Object.keys(graph).forEach((id) => {
      dist[id] = Infinity;
      prev[id] = null;
    });

    dist[start] = 0;

    while (true) {
      let current: string | null = null;
      let best = Infinity;

      for (const id of Object.keys(dist)) {
        if (!visited.has(id) && dist[id] < best) {
          best = dist[id];
          current = id;
        }
      }

      if (!current) break;
      if (current === goal) break;

      visited.add(current);

      for (const edge of graph[current]) {
        const alt = dist[current] + edge.weight;
        if (alt < dist[edge.to]) {
          dist[edge.to] = alt;
          prev[edge.to] = current;
        }
      }
    }

    const path: string[] = [];
    let cur: string | null = goal;

    while (cur) {
      path.unshift(cur);
      cur = prev[cur];
    }

    if (path[0] !== start) return [];
    return path;
  };

  // ------------------ ROUTE ------------------
  const routePath = useMemo(() => {
    if (!originNode || !destinationNode) return [];
    if (originNode === destinationNode) return [originNode];
    return dijkstra(originNode, destinationNode);
  }, [originNode, destinationNode, graph]);

  return (
    <div style={{ width: "100%" }}>
      <h2>Indoor Navigation (Node → Node)</h2>

      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        {/* ================= LEFT: MAP + CONTROLS ================= */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* CONTROLS */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "12px",
              flexWrap: "wrap"
            }}
          >
            <select value={originNode} onChange={(e) => setOriginNode(e.target.value)}>
              <option value="">Select Origin Node</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))}
            </select>

            <select
              value={destinationNode}
              onChange={(e) => setDestinationNode(e.target.value)}
            >
              <option value="">Select Destination Node</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setOriginNode("");
                setDestinationNode("");
              }}
              style={{ padding: "6px 10px", cursor: "pointer" }}
            >
              Clear
            </button>
          </div>

          {/* MAP */}
          <div style={{ position: "relative", border: "1px solid #333" }}>
            <img src="/DemoMap.svg" alt="Map" style={{ width: "100%" }} />

            <svg
              viewBox={VIEWBOX}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%"
              }}
            >
              {/* EDGES */}
              {edges.map((e, idx) => {
                const from = nodeMap[e.from];
                const to = nodeMap[e.to];
                if (!from || !to) return null;

                return (
                  <line
                    key={`edge-${idx}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#777"
                    strokeWidth="3"
                    opacity={0.25}
                  />
                );
              })}

              {/* ROUTE */}
              {routePath.length > 1 &&
                routePath.slice(0, -1).map((id, i) => {
                  const from = nodeMap[id];
                  const to = nodeMap[routePath[i + 1]];
                  if (!from || !to) return null;

                  return (
                    <line
                      key={`route-${id}-${routePath[i + 1]}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#1e90ff"
                      strokeWidth="10"
                      strokeLinecap="round"
                      opacity={0.95}
                    />
                  );
                })}

              {/* NODES */}
              {nodes.map((n) => {
                const isOrigin = n.id === originNode;
                const isDestination = n.id === destinationNode;
                const inRoute = routePath.includes(n.id);

                return (
                  <circle
                    key={n.id}
                    cx={n.x}
                    cy={n.y}
                    r={isOrigin || isDestination ? 12 : inRoute ? 8 : 5}
                    fill={
                      isOrigin
                        ? "#00ff00"
                        : isDestination
                        ? "#ff0000"
                        : inRoute
                        ? "#1e90ff"
                        : "#00e5ff"
                    }
                    stroke="#111"
                    strokeWidth={2}
                  />
                );
              })}
            </svg>
          </div>

          {/* DEBUG */}
          <div style={{ marginTop: "10px", fontSize: "14px" }}>
            Total Nodes: <strong>{nodes.length}</strong> | Total Edges:{" "}
            <strong>{edges.length}</strong>
            <br />
            {originNode && destinationNode && routePath.length === 0 && (
              <span style={{ color: "red" }}>
                ❌ No route found (graph disconnected)
              </span>
            )}
            {routePath.length > 0 && (
              <div>
                Route: <strong>{routePath.join(" → ")}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT: DESTINATIONS PANEL ================= */}
        <div
          style={{
            width: "320px",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "12px",
            maxHeight: "85vh",
            overflowY: "auto",
            background: "#111",
            color: "#fff"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Destinations</h3>

          {destinationList.length === 0 ? (
            <div style={{ fontSize: "14px", opacity: 0.8 }}>
              No destinations found in JSON (check <code>destination</code> key).
            </div>
          ) : (
            destinationList.map((d) => (
              <div
                key={d.name}
                style={{
                  border: "1px solid #222",
                  borderRadius: "8px",
                  padding: "10px",
                  marginBottom: "10px"
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>{d.name}</div>

                <div style={{ fontSize: "13px", opacity: 0.85 }}>
                  Nearest Node: <strong>{d.nodeId}</strong>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button
                    onClick={() => setOriginNode(d.nodeId)}
                    style={{
                      padding: "6px 10px",
                      cursor: "pointer",
                      background: "#00ff00",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 600
                    }}
                  >
                    Set Origin
                  </button>

                  <button
                    onClick={() => setDestinationNode(d.nodeId)}
                    style={{
                      padding: "6px 10px",
                      cursor: "pointer",
                      background: "#ff0000",
                      border: "none",
                      borderRadius: "6px",
                      color: "white",
                      fontWeight: 600
                    }}
                  >
                    Set Destination
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TestMap;
