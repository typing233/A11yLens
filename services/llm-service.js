const axios = require('axios');

class LLMService {
  constructor() {
    this.baseURL = 'https://ark.cn-beijing.volces.com/api/v3';
  }

  async generateSuggestions(violations, llmConfig) {
    const { apiKey, modelName } = llmConfig;
    
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

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 60000
        }
      );
      
      const content = response.data.choices[0]?.message?.content || '';
      
      return {
        summary: this.extractSummary(content),
        detailedSuggestions: content,
        violations: violationsSummary
      };
      
    } catch (error) {
      console.error('LLM API 调用失败:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('API Key 无效，请检查您的火山方舟 API Key');
      } else if (error.response?.status === 404) {
        throw new Error('模型名称无效，请检查接入点 ID 是否正确');
      } else if (error.response?.status === 429) {
        throw new Error('请求过于频繁，请稍后重试');
      }
      
      throw new Error(`LLM 服务错误: ${error.message}`);
    }
  }

  extractSummary(content) {
    const lines = content.split('\n');
    const firstParagraph = lines.find(line => line.trim().length > 0) || '';
    return firstParagraph.substring(0, 200);
  }

  async validateConfig(apiKey, modelName) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: modelName,
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          max_tokens: 10
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 10000
        }
      );
      
      return {
        valid: true,
        message: '配置验证成功'
      };
    } catch (error) {
      return {
        valid: false,
        message: `配置验证失败: ${error.response?.data?.error?.message || error.message}`
      };
    }
  }
}

module.exports = new LLMService();
