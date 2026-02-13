import React, { useState } from 'react';
import data from '../data/test_1.json';

const Test: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [showRoutes, setShowRoutes] = useState<boolean>(false);
  const [showAllNodes, setShowAllNodes] = useState<boolean>(false);

  const handleNodeSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNode(event.target.value);
  };

  const handleShowRoutes = () => {
    setShowRoutes(!showRoutes);
  };

  const handleShowAllNodes = () => {
    setShowAllNodes(!showAllNodes);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  return (
    <div>
      <h1>Test Page</h1>
      <div>
        <label htmlFor="nodeSelect">Select Node: </label>
        <select id="nodeSelect" value={selectedNode} onChange={handleNodeSelect}>
          <option value="">-- Select a node --</option>
          {Object.keys(data.nodes).map(nodeId => (
            <option key={nodeId} value={nodeId}>{nodeId}</option>
          ))}
        </select>
      </div>
      <button onClick={handleShowRoutes}>
        {showRoutes ? 'Hide Routes' : 'Show Routes'}
      </button>
      <button onClick={handleShowAllNodes}>
        {showAllNodes ? 'Hide All Nodes' : 'Show All Nodes'}
      </button>
      {selectedNode && <p>Selected Node: {selectedNode}</p>}
      <div style={{ position: 'relative', width: '100%', maxWidth: '100vw', height: 'auto', overflow: 'auto' }}>
        <img src="/test.svg" alt="map" style={{ width: '100%', height: 'auto', display: 'block' }} />
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto' }}
          viewBox="0 0 4101 3025"
          preserveAspectRatio="xMidYMid meet"
        >
          {selectedNode && data.nodes[selectedNode as keyof typeof data.nodes] && (
            <circle
              cx={data.nodes[selectedNode as keyof typeof data.nodes].x}
              cy={data.nodes[selectedNode as keyof typeof data.nodes].y}
              r="10"
              fill="red"
              stroke="black"
              strokeWidth="2"
            />
          )}
          {showAllNodes &&
            Object.entries(data.nodes).map(([nodeId, node]) => (
              <circle
                key={nodeId}
                cx={node.x}
                cy={node.y}
                r="5"
                fill="green"
                stroke="black"
                strokeWidth="1"
                onClick={() => handleNodeClick(nodeId)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          {showRoutes &&
            data.edges.map((edge, index) => {
              const fromNode = data.nodes[edge.from as keyof typeof data.nodes];
              const toNode = data.nodes[edge.to as keyof typeof data.nodes];
              if (fromNode && toNode) {
                return (
                  <line
                    key={index}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="blue"
                    strokeWidth="3"
                  />
                );
              }
              return null;
            })}
        </svg>
      </div>
    </div>
  );
}

export default Test;
