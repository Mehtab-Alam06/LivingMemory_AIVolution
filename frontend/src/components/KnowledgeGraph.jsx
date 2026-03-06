import { useState, useEffect, useRef } from 'react';
import PaperCard from './PaperCard.jsx';

const KnowledgeGraph = ({ title }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showFullNetwork, setShowFullNetwork] = useState(true);
  const [region, setRegion] = useState('all');
  const [traceMode, setTraceMode] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const canvasRef = useRef(null);

  // Sample knowledge graph data
  const graphData = {
    nodes: [
      { id: 'pattachitra', label: 'Pattachitra', category: 'craft', x: 400, y: 200, size: 'large' },
      { id: 'natural-indigo', label: 'Natural Indigo', category: 'material', x: 300, y: 300, size: 'medium' },
      { id: 'palm-leaf', label: 'Palm Leaf', category: 'material', x: 500, y: 300, size: 'medium' },
      { id: 'rath-yatra', label: 'Rath Yatra', category: 'ritual', x: 600, y: 200, size: 'medium' },
      { id: 'dongria-kondh', label: 'Dongria Kondh', category: 'community', x: 200, y: 400, size: 'medium' },
      { id: 'sacred-grove', label: 'Sacred Grove', category: 'ecology', x: 350, y: 400, size: 'medium' },
      { id: 'wooden-loom', label: 'Wooden Loom', category: 'tool', x: 450, y: 350, size: 'small' },
      { id: 'sambalpuri-ikat', label: 'Sambalpuri Ikat', category: 'craft', x: 250, y: 250, size: 'large' },
      { id: 'sdg-4', label: 'Quality Education', category: 'sdg', x: 550, y: 450, size: 'small' },
      { id: 'sdg-11', label: 'Sustainable Communities', category: 'sdg', x: 650, y: 400, size: 'small' },
      { id: 'herbal-medicine', label: 'Herbal Medicine', category: 'craft', x: 150, y: 300, size: 'large' },
      { id: 'medicinal-plants', label: 'Medicinal Plants', category: 'material', x: 100, y: 350, size: 'medium' },
      { id: 'tribal-healing', label: 'Tribal Healing', category: 'ritual', x: 200, y: 450, size: 'medium' }
    ],
    edges: [
      { from: 'pattachitra', to: 'natural-indigo', type: 'uses' },
      { from: 'pattachitra', to: 'palm-leaf', type: 'uses' },
      { from: 'pattachitra', to: 'rath-yatra', type: 'influences' },
      { from: 'sambalpuri-ikat', to: 'natural-indigo', type: 'uses' },
      { from: 'sambalpuri-ikat', to: 'wooden-loom', type: 'depends-on' },
      { from: 'dongria-kondh', to: 'sacred-grove', type: 'preserves' },
      { from: 'herbal-medicine', to: 'medicinal-plants', type: 'uses' },
      { from: 'herbal-medicine', to: 'tribal-healing', type: 'originates-from' },
      { from: 'sacred-grove', to: 'medicinal-plants', type: 'sustains' },
      { from: 'pattachitra', to: 'sdg-4', type: 'supports' },
      { from: 'sacred-grove', to: 'sdg-11', type: 'supports' }
    ]
  };

  const nodeDetails = {
    'natural-indigo': {
      category: 'Material',
      description: 'Traditional natural dye extracted from Indigofera tinctoria plants',
      connectedTo: ['Pattachitra', 'Sambalpuri Ikat'],
      sdgLinks: ['Responsible Consumption', 'Climate Action'],
      interviewRefs: 12,
      confidence: 0.95
    },
    'pattachitra': {
      category: 'Craft',
      description: 'Traditional cloth-based scroll painting from Odisha',
      connectedTo: ['Natural Indigo', 'Palm Leaf', 'Rath Yatra'],
      sdgLinks: ['Quality Education', 'Cultural Preservation'],
      interviewRefs: 18,
      confidence: 0.92
    },
    'sacred-grove': {
      category: 'Ecology',
      description: 'Community-protected forest patches with cultural significance',
      connectedTo: ['Dongria Kondh', 'Medicinal Plants'],
      sdgLinks: ['Sustainable Communities', 'Life on Land'],
      interviewRefs: 8,
      confidence: 0.88
    }
  };

  useEffect(() => {
    drawGraph();
  }, [filter, showFullNetwork, region]);

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    graphData.edges.forEach(edge => {
      const fromNode = graphData.nodes.find(n => n.id === edge.from);
      const toNode = graphData.nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw nodes
    graphData.nodes.forEach(node => {
      const colors = {
        craft: '#8B4513',
        material: '#2E7D32',
        ritual: '#D32F2F',
        ecology: '#1976D2',
        community: '#7B1FA2',
        tool: '#F57C00',
        sdg: '#0097A7'
      };

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size === 'large' ? 20 : node.size === 'medium' ? 15 : 10, 0, 2 * Math.PI);
      ctx.fillStyle = colors[node.category] || '#666';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 35);
    });
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked node
    const clickedNode = graphData.nodes.find(node => {
      const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
      return distance <= (node.size === 'large' ? 20 : node.size === 'medium' ? 15 : 10);
    });

    setSelectedNode(clickedNode);
  };

  const insights = {
    relationships: 42,
    dependencies: 18,
    influences: 6
  };

  return (
    <div className="knowledge-graph">
      {/* Header */}
      <div className="kg-header">
        <h1>Knowledge Graph – Mapping Living Traditions</h1>
        <p>Explore how Odisha's traditional systems connect across materials, rituals, ecology, and community.</p>
        {title && <div className="graph-focus">Graph Focus: {title}</div>}
      </div>

      {/* Filters */}
      <div className="kg-filters">
        <div className="filter-group">
          <label>Filter by:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="craft">Craft</option>
            <option value="agriculture">Agriculture</option>
            <option value="ritual">Ritual</option>
            <option value="ecology">Ecology</option>
            <option value="tribal">Tribal Systems</option>
            <option value="architecture">Architecture</option>
            <option value="sdg">SDG Alignment</option>
          </select>
        </div>
        
        <div className="toggle-group">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showFullNetwork}
              onChange={(e) => setShowFullNetwork(e.target.checked)}
            />
            <span className="slider"></span>
            <span className="toggle-label">
              {showFullNetwork ? 'Show Full Network' : 'Show Only Direct Connections'}
            </span>
          </label>
        </div>

        <div className="filter-group">
          <button 
            className={`btn ${traceMode ? 'active' : ''}`}
            onClick={() => setTraceMode(!traceMode)}
          >
            Trace Knowledge Lineage
          </button>
          <button 
            className={`btn ${researchMode ? 'active' : ''}`}
            onClick={() => setResearchMode(!researchMode)}
          >
            Research View
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="kg-main">
        {/* Graph Canvas */}
        <div className="graph-container">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="graph-canvas"
            onClick={handleCanvasClick}
          />
        </div>

        {/* Side Panel */}
        {selectedNode && (
          <PaperCard variant="default">
            <div className="node-panel">
              <div className="panel-header">
                <h3>{selectedNode.label}</h3>
                <button className="close-btn" onClick={() => setSelectedNode(null)}>×</button>
              </div>
              
              <div className="panel-content">
                <div className="node-category">
                  <span className="category-badge">{selectedNode.category}</span>
                </div>
                
                {nodeDetails[selectedNode.id] && (
                  <>
                    <p className="node-description">{nodeDetails[selectedNode.id].description}</p>
                    
                    <div className="node-connections">
                      <h4>Connected to:</h4>
                      <ul>
                        {nodeDetails[selectedNode.id].connectedTo.map((conn, idx) => (
                          <li key={idx}>{conn}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="node-sdg">
                      <h4>SDG Links:</h4>
                      <ul>
                        {nodeDetails[selectedNode.id].sdgLinks.map((sdg, idx) => (
                          <li key={idx}>{sdg}</li>
                        ))}
                      </ul>
                    </div>

                    {researchMode && (
                      <div className="research-info">
                        <h4>Research Data:</h4>
                        <p>Interview References: {nodeDetails[selectedNode.id].interviewRefs}</p>
                        <p>Confidence Level: {(nodeDetails[selectedNode.id].confidence * 100).toFixed(0)}%</p>
                        <p>Validation Status: Verified</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </PaperCard>
        )}
      </div>

      {/* Intelligence Indicator */}
      <div className="intelligence-panel">
        <h4>Structured Insights Generated:</h4>
        <div className="insights-grid">
          <div className="insight-item">
            <span className="insight-number">{insights.relationships}</span>
            <span className="insight-label">relationships identified</span>
          </div>
          <div className="insight-item">
            <span className="insight-number">{insights.dependencies}</span>
            <span className="insight-label">material dependencies mapped</span>
          </div>
          <div className="insight-item">
            <span className="insight-number">{insights.influences}</span>
            <span className="insight-label">cross-domain influences detected</span>
          </div>
        </div>
      </div>

      {/* Explore by Region */}
      <div className="region-explorer">
        <h4>Explore by Region</h4>
        <div className="region-buttons">
          <button 
            className={`region-btn ${region === 'coastal' ? 'active' : ''}`}
            onClick={() => setRegion('coastal')}
          >
            Coastal Odisha
          </button>
          <button 
            className={`region-btn ${region === 'western' ? 'active' : ''}`}
            onClick={() => setRegion('western')}
          >
            Western Odisha
          </button>
          <button 
            className={`region-btn ${region === 'tribal' ? 'active' : ''}`}
            onClick={() => setRegion('tribal')}
          >
            Tribal Belt
          </button>
          <button 
            className={`region-btn ${region === 'temple' ? 'active' : ''}`}
            onClick={() => setRegion('temple')}
          >
            Temple Architecture Cluster
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
