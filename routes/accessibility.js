const express = require('express');
const path = require('path');
const router = express.Router();
const accessibilityService = require('../services/accessibility-service');
const llmService = require('../services/llm-service');

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

router.get('/screenshot/:filename', (req, res) => {
  const filename = req.params.filename;
  // Prevent path traversal: only allow simple filenames without dots (no '..', no subdirectories)
  if (!filename || !/^[\w\-]+\.png$/.test(filename)) {
    return res.status(400).json({ error: '无效的文件名' });
  }
  res.sendFile(path.join(__dirname, '..', 'screenshots', filename));
});

module.exports = router;
