import React, { useState, useRef } from 'react';
import { Search, Loader2, Info, Network, RotateCcw, HelpCircle, X, Upload, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import KnowledgeGraph from './components/KnowledgeGraph';
import ExplanationPanel from './components/ExplanationPanel';
import { generateKnowledgeGraph } from './services/geminiService';
import { GraphData, GraphNode, GenerationStatus } from './types';

// Initial sample data in Chinese
const INITIAL_DATA: GraphData = {
  nodes: [
    { id: "ai", label: "人工智能", group: "技术" },
    { id: "ml", label: "机器学习", group: "技术" },
    { id: "dl", label: "深度学习", group: "技术" },
    { id: "nn", label: "神经网络", group: "概念" },
    { id: "gemini", label: "Gemini", group: "模型" },
  ],
  links: [
    { source: "ai", target: "ml", relation: "包含" },
    { source: "ml", target: "dl", relation: "包含" },
    { source: "dl", target: "nn", relation: "使用" },
    { source: "gemini", target: "ai", relation: "属于" },
  ]
};

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  // Advanced options state
  const [domain, setDomain] = useState('');
  const [entityTypes, setEntityTypes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [graphData, setGraphData] = useState<GraphData>(INITIAL_DATA);
  const [status, setStatus] = useState<GenerationStatus>({ 
    loading: false, 
    step: 'idle', 
    message: '' 
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showTips, setShowTips] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus({ loading: true, step: 'analyzing', message: 'Gemini 正在分析文本...' });
    setSelectedNode(null);

    try {
      // Simulate a small delay for better UX flow visualization
      await new Promise(r => setTimeout(r, 500));
      
      const newData = await generateKnowledgeGraph(query, domain, entityTypes);
      
      setStatus({ loading: true, step: 'building', message: '正在构建力导向图...' });
      await new Promise(r => setTimeout(r, 500)); // Smooth transition

      setGraphData(newData);
      setStatus({ loading: false, step: 'complete', message: '图谱生成完毕!' });
    } catch (error: any) {
      setStatus({ 
        loading: false, 
        step: 'error', 
        message: error.message || '出错了，请稍后重试。' 
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (file.size > 1024 * 1024 * 5) { // Increased limit for JSON files
      alert("文件过大，建议上传 5MB 以内的文件。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        
        // FEATURE: Direct JSON Import
        if (file.name.toLowerCase().endsWith('.json')) {
          try {
            const parsedData = JSON.parse(content);
            
            // Validate GraphData Schema
            if (Array.isArray(parsedData.nodes) && Array.isArray(parsedData.links)) {
               // Basic check for required node fields
               const validNodes = parsedData.nodes.every((n: any) => n.id && n.label);
               
               if (validNodes) {
                 setGraphData(parsedData);
                 setQuery(''); // Clear input as we are viewing imported data
                 setStatus({ 
                   loading: false, 
                   step: 'complete', 
                   message: `已导入文件: ${file.name}` 
                 });
                 // Reset selection
                 setSelectedNode(null);
                 return;
               } else {
                 alert("JSON 格式错误：节点缺少 id 或 label 字段。");
               }
            } else {
               alert("JSON 格式错误：文件必须包含 'nodes' 和 'links' 数组。");
            }
          } catch (err) {
            console.error("JSON Parse Error", err);
            alert("无法解析 JSON 文件，请检查文件格式。");
          }
          // Reset input on error so user can retry
          e.target.value = '';
          return;
        }

        // Default: Treat as text for Gemini generation
        setQuery(content);
      }
    };
    reader.readAsText(file);
    
    // Reset input so user can re-upload same file if needed
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow submitting with Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (query.trim() && !status.loading) {
         handleGenerate(e as any);
      }
    }
  };

  // Helper to safely get ID from link source/target which might be object or string
  const getNodeId = (node: string | any): string => {
    return typeof node === 'object' ? node.id : node;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Network className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              知识图谱生成器
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-sm text-slate-500 hidden md:block">
              基于 Gemini 2.5 & D3.js
            </div>
            <button 
              onClick={() => setShowTips(true)}
              className="text-slate-500 hover:text-indigo-600 transition-colors p-1"
              title="使用提示"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tips Modal */}
      {showTips && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">使用提示</h3>
              <button 
                onClick={() => setShowTips(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-slate-600">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">输入或导入</h4>
                  <p className="text-sm">支持输入文本、上传 .txt/.md 供 AI 分析，或者直接上传 .json 文件进行可视化。</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">搜索与筛选</h4>
                  <p className="text-sm">使用图谱左上角的搜索框可以快速定位节点。输入关键词后，无关节点将变暗。</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">导出与分享</h4>
                  <p className="text-sm">点击右上角的按钮可以将图谱导出为 JSON 数据或 SVG 图片。您也可以点击全屏按钮进行演示。</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 text-right">
              <button 
                onClick={() => setShowTips(false)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-6">
        
        {/* Input Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-2 p-3 items-start">
            <div className="relative flex-1 w-full">
              <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入主题，或者上传文件内容... (例如: '互联网历史', '光合作用')"
                rows={3}
                className="block w-full pl-10 pr-10 py-3 border-none rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 resize-none leading-relaxed"
              />
              
              {/* File Upload Button */}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-3 right-2 p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded hover:bg-slate-100"
                title="导入文件 (.txt, .md 分析; .json 可视化)"
              >
                <Upload className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".txt,.md,.csv,.json"
                onChange={handleFileUpload}
              />
            </div>
            
            <button
              type="submit"
              disabled={status.loading || !query.trim()}
              className="h-[88px] px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-2 min-w-[120px]"
            >
              {status.loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">处理中</span>
                </>
              ) : (
                <>
                  <span className="text-lg font-bold">生成</span>
                  <span className="text-xs opacity-80 font-normal">图谱</span>
                </>
              )}
            </button>
          </form>

          {/* Advanced Options Toggle */}
          <div className="border-t border-slate-100">
             <button 
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
             >
                <div className="flex items-center gap-1">
                   <Settings className="w-3 h-3" />
                   高级选项 (Domain & Entity Types)
                </div>
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
             </button>
             
             {showAdvanced && (
               <div className="p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                     <label className="text-xs font-semibold text-slate-600 block">特定领域 (Domain)</label>
                     <input 
                        type="text" 
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="例如: 医疗, 法律, 金融..." 
                        className="w-full text-sm px-3 py-2 rounded border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                     />
                     <p className="text-[10px] text-slate-400">强制 AI 在此领域背景下进行分析。</p>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-semibold text-slate-600 block">实体类型 (Entity Types)</label>
                     <input 
                        type="text" 
                        value={entityTypes}
                        onChange={(e) => setEntityTypes(e.target.value)}
                        placeholder="例如: 药品, 症状, 医院..." 
                        className="w-full text-sm px-3 py-2 rounded border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                     />
                     <p className="text-[10px] text-slate-400">优先识别并归类为这些类型的实体。</p>
                  </div>
               </div>
             )}
          </div>
          
          {status.step !== 'idle' && (
             <div className={`px-4 pb-2 pt-2 text-sm flex items-center gap-2 border-t border-slate-100 ${status.step === 'error' ? 'text-red-500' : 'text-slate-500'}`}>
                {status.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                {status.message}
             </div>
          )}
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
          
          {/* Graph Container */}
          <div className="lg:col-span-2 h-[500px] lg:h-auto min-h-[500px] flex flex-col">
             <KnowledgeGraph 
                data={graphData} 
                onNodeClick={setSelectedNode}
                selectedNode={selectedNode}
             />
          </div>

          {/* Sidebar / Info Panel */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Selected Node Details */}
            <div className={`bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-full transition-all ${!selectedNode ? 'opacity-70' : ''}`}>
              {selectedNode ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded uppercase tracking-wider">
                      {selectedNode.group}
                    </span>
                    <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600" title="清空选择">
                      <RotateCcw size={16} />
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedNode.label}</h2>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedNode.description || "该实体暂无详细描述。"}
                  </p>
                  
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">相关连接</h3>
                    <ul className="space-y-2">
                      {graphData.links
                        .filter((link) => {
                           const sId = getNodeId(link.source);
                           const tId = getNodeId(link.target);
                           return sId === selectedNode.id || tId === selectedNode.id;
                        })
                        .map((link, i) => {
                          const sId = getNodeId(link.source);
                          const isSource = sId === selectedNode.id;
                          // Find the full node object for the other end
                          const otherId = isSource ? getNodeId(link.target) : sId;
                          const otherNode = graphData.nodes.find(n => n.id === otherId);
                          
                          if (!otherNode) return null;

                          return (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <span className="text-slate-400 w-4">{isSource ? '→' : '←'}</span>
                              <span className="font-medium text-slate-700">{link.relation}</span>
                              <span className="text-slate-400">...</span>
                              <button 
                                className="text-indigo-600 hover:underline cursor-pointer text-left" 
                                onClick={() => setSelectedNode(otherNode)}
                              >
                                {otherNode.label}
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Info size={48} className="mb-4 text-slate-200" />
                  <p className="text-lg font-medium text-slate-600">选择一个节点</p>
                  <p className="text-sm">点击图谱中的圆圈可查看详情和关系。</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Technical Explanation */}
        <ExplanationPanel />
      </main>
    </div>
  );
};

export default App;