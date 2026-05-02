const express = require('express');
const path = require('path');
const router = express.Router();
const accessibilityService = require('../services/accessibility-service');
const llmService = require('../services/llm-service');
const domTreeService = require('../services/dom-tree-service');

router.post('/screenshot', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供目标网页 URL' });
    }
    
    console.log(`正在截图: ${url}`);
    
    const result = await accessibilityService.captureScreenshot(url);
    
    res.json(result);
  } catch (error) {
    console.error('截图失败:', error);
    res.status(500).json({ 
      error: '截图过程中发生错误', 
      message: error.message 
    });
  }
});

router.post('/scan', async (req, res) => {
  try {
    const { url, llmConfig } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供目标网页URL' });
    }
    
    console.log(`开始扫描: ${url}`);
    
    const scanResult = await accessibilityService.scanPage(url);
    
    if (llmConfig && llmConfig.apiKey && llmConfig.modelName) {
      try {
        const enhancedSuggestions = await llmService.generateSuggestions(
          scanResult.violations,
          llmConfig
        );
        scanResult.llmSuggestions = enhancedSuggestions;
      } catch (llmError) {
        console.warn('LLM 建议生成失败:', llmError.message);
        scanResult.llmError = 'LLM 建议生成失败，请检查 API 配置';
      }
    }
    
    res.json(scanResult);
  } catch (error) {
    console.error('扫描失败:', error);
    res.status(500).json({ 
      error: '扫描过程中发生错误', 
      message: error.message 
    });
  }
});

router.post('/dom-tree', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供目标网页URL' });
    }
    
    console.log(`开始提取 DOM 树: ${url}`);
    
    const domTreeResult = await domTreeService.extractDOMTree(url);
    
    res.json(domTreeResult);
  } catch (error) {
    console.error('DOM 树提取失败:', error);
    res.status(500).json({ 
      error: 'DOM 树提取过程中发生错误', 
      message: error.message 
    });
  }
});

router.post('/llm/test', async (req, res) => {
  try {
    const { baseUrl, apiKey, modelName } = req.body;
    
    if (!apiKey || !modelName) {
      return res.status(400).json({ error: '请提供 API Key 和 Model Name' });
    }
    
    console.log('测试 LLM 连接...');
    
    const result = await llmService.validateConfig(baseUrl, apiKey, modelName);
    
    res.json(result);
  } catch (error) {
    console.error('LLM 连接测试失败:', error);
    res.status(500).json({ 
      error: 'LLM 连接测试失败', 
      message: error.message 
    });
  }
});

router.post('/screen-reader/path', async (req, res) => {
  try {
    const { url, llmConfig } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: '请提供目标网页URL' });
    }
    
    console.log(`分析屏幕阅读器解析路径: ${url}`);
    
    const domTreeResult = await domTreeService.extractDOMTree(url);
    
    let screenReaderAnalysis = null;
    
    if (llmConfig && llmConfig.apiKey && llmConfig.modelName) {
      try {
        screenReaderAnalysis = await llmService.analyzeScreenReaderPath(
          domTreeResult,
          llmConfig
        );
      } catch (llmError) {
        console.warn('LLM 屏幕阅读器分析失败:', llmError.message);
      }
    }
    
    res.json({
      success: true,
      url,
      domTree: domTreeResult,
      screenReaderAnalysis
    });
  } catch (error) {
    console.error('屏幕阅读器路径分析失败:', error);
    res.status(500).json({ 
      error: '屏幕阅读器路径分析失败', 
      message: error.message 
    });
  }
});

router.get('/screenshot/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!filename || !/^[\w\-]+\.png$/.test(filename)) {
    return res.status(400).json({ error: '无效的文件名' });
  }
  res.sendFile(path.join(__dirname, '..', 'screenshots', filename));
});

module.exports = router;
