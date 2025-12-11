import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Search, Download, Maximize, Minimize, Image, FileJson, X } from 'lucide-react';
import { GraphData, GraphNode, GraphLink } from '../types';

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  selectedNode: GraphNode | null; // Receive selected node for highlighting
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, onNodeClick, selectedNode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [filterText, setFilterText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Keep track of D3 objects to update styles without re-simulating
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelectionRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize and Run Simulation
  useEffect(() => {
    if (!data.nodes.length || !svgRef.current) return;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Deep copy data
    const nodes: GraphNode[] = data.nodes.map(d => ({ ...d }));
    const links: GraphLink[] = data.links.map(d => ({ ...d }));

    // Simulation setup
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("max-width", "100%")
      .style("height", "auto");

    svgSelectionRef.current = svg;

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#94a3b8")
      .attr("d", "M0,-5L10,0L0,5");

    // Draw Links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.8)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    // Draw Link Labels
    const linkLabel = g.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(links)
      .join("text")
      .text(d => d.relation)
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .style("pointer-events", "none");

    // Draw Nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .attr("id", d => `node-${d.id}`) // Add ID for easy selection
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      })
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    node.append("circle")
      .attr("r", 20)
      .attr("fill", (d) => color(d.group))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0px 2px 2px rgba(0,0,0,0.1))");

    node.append("text")
      .text(d => d.label.substring(0, 2).toUpperCase())
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .style("pointer-events", "none");

    node.append("text")
      .text(d => d.label)
      .attr("dy", 32)
      .attr("text-anchor", "middle")
      .attr("fill", "#334155")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      linkLabel
        .attr("x", d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr("y", d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      node.attr("transform", d => `translate(${d.x!},${d.y!})`);
    });

    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [data, dimensions]); // Note: removed onNodeClick from dependency to avoid re-render loop if ref changes

  // Handling Highlighting (Search + Selection)
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const nodes = svg.selectAll<SVGGElement, GraphNode>(".nodes g");
    const links = svg.selectAll<SVGLineElement, GraphLink>(".links line");
    const linkLabels = svg.selectAll<SVGTextElement, GraphLink>(".link-labels text");

    const isSearchActive = filterText.length > 0;
    const isSelectionActive = !!selectedNode;

    // Reset view if nothing active
    if (!isSearchActive && !isSelectionActive) {
      nodes.transition().style("opacity", 1);
      links.transition().style("opacity", 1).attr("stroke", "#cbd5e1");
      linkLabels.transition().style("opacity", 1);
      return;
    }

    // Determine which nodes match criteria
    const isNodeHighlighted = (d: GraphNode) => {
      if (isSearchActive) {
        return d.label.toLowerCase().includes(filterText.toLowerCase());
      }
      if (isSelectionActive) {
        return d.id === selectedNode.id || 
               data.links.some(l => 
                 (typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === selectedNode.id && (typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === d.id ||
                 (typeof l.target === 'object' ? (l.target as GraphNode).id : l.target) === selectedNode.id && (typeof l.source === 'object' ? (l.source as GraphNode).id : l.source) === d.id
               );
      }
      return true;
    };

    const isLinkHighlighted = (d: GraphLink) => {
      if (isSelectionActive) {
         return (typeof d.source === 'object' ? (d.source as GraphNode).id : d.source) === selectedNode.id ||
                (typeof d.target === 'object' ? (d.target as GraphNode).id : d.target) === selectedNode.id;
      }
      // For search, we highlight links between two highlighted nodes
      if (isSearchActive) {
         const sourceNode = typeof d.source === 'object' ? d.source as GraphNode : data.nodes.find(n => n.id === d.source);
         const targetNode = typeof d.target === 'object' ? d.target as GraphNode : data.nodes.find(n => n.id === d.target);
         return sourceNode && targetNode && 
                sourceNode.label.toLowerCase().includes(filterText.toLowerCase()) && 
                targetNode.label.toLowerCase().includes(filterText.toLowerCase());
      }
      return true;
    };

    // Apply styles
    nodes.transition().duration(300)
      .style("opacity", d => isNodeHighlighted(d) ? 1 : 0.1);

    links.transition().duration(300)
      .style("opacity", d => isLinkHighlighted(d) ? 1 : 0.1)
      .attr("stroke", d => isLinkHighlighted(d) ? "#6366f1" : "#cbd5e1"); // Indigo for active links

    linkLabels.transition().duration(300)
      .style("opacity", d => isLinkHighlighted(d) ? 1 : 0.1);

    // Auto-center on search match
    if (isSearchActive && zoomRef.current && svgSelectionRef.current) {
        const firstMatch = data.nodes.find(n => n.label.toLowerCase().includes(filterText.toLowerCase()));
        if (firstMatch && firstMatch.x && firstMatch.y) {
           const transform = d3.zoomIdentity
             .translate(dimensions.width / 2, dimensions.height / 2)
             .scale(1.5)
             .translate(-firstMatch.x, -firstMatch.y);
           
           svgSelectionRef.current.transition().duration(750).call(zoomRef.current.transform, transform);
        }
    }

  }, [filterText, selectedNode, data, dimensions]);


  // --- Actions ---

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const exportJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "knowledge_graph.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    
    // Add XML declaration
    const sourceWithNs = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sourceWithNs);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "knowledge_graph.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 relative overflow-hidden rounded-xl border border-slate-200 shadow-inner group">
        
        {/* Top Left: Search Bar */}
        <div className="absolute top-4 left-4 z-10 flex items-center bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg p-1 transition-all focus-within:ring-2 focus-within:ring-indigo-500 w-64">
           <Search className="w-4 h-4 text-slate-400 ml-2" />
           <input 
             type="text"
             value={filterText}
             onChange={(e) => setFilterText(e.target.value)}
             placeholder="搜索节点..."
             className="bg-transparent border-none outline-none text-sm px-2 py-1 w-full text-slate-700 placeholder:text-slate-400"
           />
           {filterText && (
             <button onClick={() => setFilterText('')} className="p-1 hover:bg-slate-100 rounded-full mr-1">
               <X className="w-3 h-3 text-slate-400" />
             </button>
           )}
        </div>

        {/* Top Right: Actions */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
            <div className="flex bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                <button 
                  onClick={exportJSON}
                  className="p-2 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors border-r border-slate-100" 
                  title="导出 JSON"
                >
                    <FileJson className="w-4 h-4" />
                </button>
                <button 
                  onClick={exportSVG}
                  className="p-2 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors" 
                  title="导出 SVG 图片"
                >
                    <Image className="w-4 h-4" />
                </button>
            </div>
            
            <button 
              onClick={toggleFullscreen}
              className="bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title={isFullscreen ? "退出全屏" : "全屏模式"}
            >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
        </div>

        <svg ref={svgRef} className="w-full h-full block touch-none"></svg>
        
        <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-white/80 p-2 rounded pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
            滚动缩放 • 拖拽移动 • 点击选中
        </div>
    </div>
  );
};

export default KnowledgeGraph;