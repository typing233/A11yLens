const axios = require('axios');

class LLMService {
  constructor() {
    this.defaultBaseURL = 'https://ark.cn-beijing.volces.com/api/v3';
  }

  getBaseURL(customBaseURL) {
    if (customBaseURL) {
      let baseUrl = customBaseURL.trim();
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
      }
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      return baseUrl;
    }
    return this.defaultBaseURL;
  }

  async chatCompletions(messages, llmConfig, options = {}) {
    const { baseUrl, apiKey, modelName } = llmConfig;
    const { maxTokens = 1000, temperature = 0.7 } = options;
    
    if (!apiKey || !modelName) {
      throw new Error('API Key 和 Model Name 是必需的');
    }

    const baseURL = this.getBaseURL(baseUrl);

    try {
      const response = await axios.post(
        `${baseURL}/chat/completions`,
        {
          model: modelName,
          messages,
          temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 60000
        }
      );
      
      return {
        success: true,
        content: response.data.choices[0]?.message?.content || '',
        usage: response.data.usage,
        model: response.data.model
      };
      
    } catch (error) {
      console.error('LLM API 调用失败:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('API Key 无效，请检查您的 API Key');
      } else if (error.response?.status === 404) {
        throw new Error('模型名称无效，请检查 Model Name 是否正确');
      } else if (error.response?.status === 429) {
        throw new Error('请求过于频繁，请稍后重试');
      }
      
      throw new Error(`LLM 服务错误: ${error.message}`);
    }
  }

  async generateSuggestions(violations, llmConfig) {
    const { baseUrl, apiKey, modelName } = llmConfig;
    
    if (!apiKey || !modelName) {
      throw new Error('API Key 和 Model Name 是必需的');
    }
    
    if (violations.length === 0) {
      return {
        summary: '未发现无障碍问题，页面表现优秀！',
        suggestions: []
      };
    }
    
    const violationsSummary = violations.map((v, index) => {
      const nodesSummary = v.nodes.slice(0, 3).map(n => ({
        selector: n.target,
        html: n.outerHTML ? n.outerHTML.substring(0, 200) : 'N/A'
      }));
      
      return {
        index: index + 1,
        ruleId: v.id,
        title: v.help,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        affectedElements: v.nodes.length,
        sampleNodes: nodesSummary
      };
    });
    
    const systemPrompt = `你是一位专业的网页无障碍（WCAG）专家。你的任务是分析网页无障碍检测结果，并提供具体、可执行的修复建议。

请遵循以下准则：
1. 分析每个无障碍违规问题，解释为什么它是个问题
2. 提供具体的代码修复建议，包含修复前后的代码对比
3. 按优先级排序建议（critical > serious > moderate > minor）
4. 解释每个修复如何改善残障用户的体验

请用中文回复，保持专业但易于理解。`;

    const userPrompt = `请分析以下网页无障碍检测结果，并提供详细的修复建议：

${JSON.stringify(violationsSummary, null, 2)}

请按以下格式回复：
1. 总体评估：简要总结页面的无障碍状况
2. 按优先级排序的问题和修复建议：
   - 问题编号和标题
   - 问题分析
   - 修复建议（包含代码示例）
   - 预期效果`;

    const result = await this.chatCompletions(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { baseUrl, apiKey, modelName },
      { maxTokens: 4000, temperature: 0.7 }
    );
      
    return {
      summary: this.extractSummary(result.content),
      detailedSuggestions: result.content,
      violations: violationsSummary
    };
  }

  extractSummary(content) {
    const lines = content.split('\n');
    const firstParagraph = lines.find(line => line.trim().length > 0) || '';
    return firstParagraph.substring(0, 200);
  }

  async analyzeScreenReaderPath(domTree, llmConfig) {
    const { baseUrl, apiKey, modelName } = llmConfig;
    
    if (!apiKey || !modelName) {
      throw new Error('API Key 和 Model Name 是必需的');
    }

    const focusableNodes = domTree.allNodes.filter(node => 
      node.accessibility?.isFocusable && node.isVisible
    );

    const semanticNodes = domTree.allNodes.filter(node => 
      node.isSemantic && node.isVisible
    );

    const systemPrompt = `你是一位屏幕阅读器行为分析专家。你的任务是分析网页 DOM 结构，并推演屏幕阅读器（如 NVDA、VoiceOver、JAWS）的解析路径。

屏幕阅读器的解析规则：
1. 按 DOM 顺序线性遍历，从上到下
2. 跳过隐藏元素（display: none, visibility: hidden, aria-hidden="true"）
3. 优先读取语义化标签（header, nav, main, section, article, aside, footer）
4. 读取表单元素的标签（label, aria-label）
5. 读取图片的 alt 属性
6. 按 Tab 顺序导航可聚焦元素（a, button, input, select, textarea, tabindex >= 0）
7. 通过 heading 层级（h1-h6）建立内容结构

请分析 DOM 结构并提供：
1. 屏幕阅读器的默认遍历顺序
2. 语义化地标识别
3. 可聚焦元素的 Tab 顺序
4. 潜在的无障碍问题
5. 具体的修复建议`;

    const userPrompt = `请分析以下 DOM 结构，推演屏幕阅读器的解析路径：

## 页面基本信息
- 总节点数: ${domTree.totalNodes}
- 视口大小: ${domTree.viewport?.width} x ${domTree.viewport?.height}

## 语义化节点 (${semanticNodes.length} 个)
${semanticNodes.slice(0, 20).map((node, i) => `${i + 1}. <${node.tagName}> ${node.idAttribute ? `#${node.idAttribute}` : ''} ${node.className ? `.${node.className.split(' ')[0]}` : ''}`).join('\n')}

## 可聚焦元素 (${focusableNodes.length} 个)
${focusableNodes.slice(0, 30).map((node, i) => `${i + 1}. <${node.tagName}> - ${node.textContent?.substring(0, 50) || node.idAttribute || '无文本'}`).join('\n')}

## 可访问性信息摘要
- 有 alt 属性的图片: ${domTree.allNodes.filter(n => n.tagName === 'img' && n.accessibility?.hasAlt).length}
- 有标签的输入框: ${domTree.allNodes.filter(n => n.tagName === 'input' && n.accessibility?.hasLabel).length}
- 有 tabindex 的元素: ${domTree.allNodes.filter(n => n.accessibility?.tabIndex !== null).length}

请按以下格式回复：
1. 屏幕阅读器解析路径推演
2. 语义化地标识别与导航路径
3. Tab 焦点导航顺序
4. 无障碍问题分析（按严重程度排序）
5. 修复建议（包含具体代码示例）`;

    try {
      const result = await this.chatCompletions(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        { baseUrl, apiKey, modelName },
        { maxTokens: 4000, temperature: 0.7 }
      );

      return {
        success: true,
        focusableNodes: focusableNodes.map(n => ({
          tagName: n.tagName,
          textContent: n.textContent?.substring(0, 100),
          position: n.position,
          tabIndex: n.accessibility?.tabIndex,
          idAttribute: n.idAttribute
        })),
        semanticNodes: semanticNodes.map(n => ({
          tagName: n.tagName,
          idAttribute: n.idAttribute,
          className: n.className,
          depth: n.depth
        })),
        analysis: result.content,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('屏幕阅读器路径分析失败:', error);
      throw error;
    }
  }

  async validateConfig(baseUrl, apiKey, modelName) {
    try {
      const baseURL = this.getBaseURL(baseUrl);
      
      let modelsEndpoint = `${baseURL}/models`;
      try {
        const modelsResponse = await axios.get(modelsEndpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 10000
        });
        
        const availableModels = modelsResponse.data?.data || [];
        const modelExists = availableModels.some(m => m.id === modelName);
        
        return {
          valid: true,
          message: '配置验证成功',
          baseUrl: baseURL,
          modelExists,
          availableModels: availableModels.slice(0, 10).map(m => m.id)
        };
      } catch (modelsError) {
        console.log('Models 端点不可用，尝试使用 chat completion 测试...');
      }

      const response = await this.chatCompletions(
        [
          { role: 'user', content: '请回复"连接测试成功"' }
        ],
        { baseUrl, apiKey, modelName },
        { maxTokens: 20, temperature: 0 }
      );
      
      return {
        valid: true,
        message: '配置验证成功',
        baseUrl: baseURL,
        response: response.content
      };
      
    } catch (error) {
      return {
        valid: false,
        message: `配置验证失败: ${error.response?.data?.error?.message || error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = new LLMService();
