import { GoogleGenAI, Type } from "@google/genai";
import { GraphData } from "../types";

// Initialize Gemini Client
// CRITICAL: process.env.API_KEY is automatically injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateKnowledgeGraph = async (query: string, domain?: string, entityTypes?: string): Promise<GraphData> => {
  const model = "gemini-2.5-flash"; // Fast and good at following JSON schemas

  let constraints = "";
  if (domain && domain.trim()) {
    constraints += `\n    严格限定领域 (Domain): "${domain.trim()}"。请仅在此领域背景下进行分析，忽略不相关含义。`;
  }
  if (entityTypes && entityTypes.trim()) {
    constraints += `\n    优先提取的实体类型 (Entity Types): "${entityTypes.trim()}"。请尽可能将节点归类为这些类型。`;
  }

  const prompt = `
    请分析以下文本 or 主题，并构建一个可视化的知识图谱数据。
    提取关键实体（nodes）及其关系（links）。
    
    主题/文本: "${query}"
    ${constraints}
    
    要求:
    1. 识别最重要的概念、人物、地点或物体作为 'nodes' (节点)。
    2. 识别它们之间有意义的连接作为 'links' (连线)。
    3. 将节点分为逻辑类别 (例如："人物", "地点", "概念", "事件")，赋值给 'group' 字段。
    4. 确保 links 中的 'source' 和 'target' 必须完全匹配 nodes 中的 'id'。
    5. 图谱应简洁但信息丰富 (控制在 10-25 个节点，最适合可视化)。
    6. 为每个节点提供简短的中文描述 ('description')。
    7. **重要**: 所有的 label (标签), group (分组), description (描述), relation (关系) 必须使用简体中文输出。
  `;

  // Define the schema for structured JSON output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      nodes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "Unique identifier for the node (slug style, e.g. 'artificial-intelligence')" },
            label: { type: Type.STRING, description: "Display name of the node in Chinese" },
            group: { type: Type.STRING, description: "Category of the node in Chinese" },
            description: { type: Type.STRING, description: "Short description of the entity in Chinese" },
          },
          required: ["id", "label", "group"],
        },
      },
      links: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            source: { type: Type.STRING, description: "ID of the source node" },
            target: { type: Type.STRING, description: "ID of the target node" },
            relation: { type: Type.STRING, description: "Label for the relationship in Chinese (e.g., '属于', '创立了')" },
          },
          required: ["source", "target", "relation"],
        },
      },
    },
    required: ["nodes", "links"],
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3, // Lower temperature for more deterministic/structured output
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("AI 未返回数据");

    const data = JSON.parse(jsonText) as GraphData;
    return data;

  } catch (error) {
    console.error("Gemini Graph Generation Error:", error);
    throw new Error("生成知识图谱失败，请检查 API Key 或尝试其他主题。");
  }
};