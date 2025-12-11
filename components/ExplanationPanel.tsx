import React from 'react';
import { Brain, Database, Share2, Sparkles } from 'lucide-react';

const ExplanationPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-8">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        实现原理 (Technical Implementation)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-2">
            <Brain size={20} />
          </div>
          <h3 className="font-semibold text-slate-700">1. Gemini AI 语义分析</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            我们使用 <strong>Gemini 2.5 Flash</strong> 模型来理解您输入的文本。通过特定的提示词 (Prompt) 和 Schema 约束，强制大语言模型输出包含 <code>nodes</code> (节点) 和 <code>links</code> (关系) 的结构化 JSON 数据。
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-2">
            <Database size={20} />
          </div>
          <h3 className="font-semibold text-slate-700">2. 数据转换与校验</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            原始的 JSON 响应会被解析为类型安全的图结构。我们会校验所有的关系连线是否都指向了存在的节点 ID，确保数据在可视化渲染时不会出错。
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-2">
            <Share2 size={20} />
          </div>
          <h3 className="font-semibold text-slate-700">3. D3.js 力导向图布局</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            利用 <strong>D3.js Force</strong> 模块模拟物理效果。节点之间存在斥力 (Charge)，而连线则像弹簧一样牵引相关节点。这种算法会自动计算出最优的 X/Y 坐标，生成美观且互不重叠的拓扑结构。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExplanationPanel;