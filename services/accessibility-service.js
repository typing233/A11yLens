const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const scoringService = require('./scoring-service');

class AccessibilityService {
  constructor() {
    this.browser = null;
    this.screenshotsDir = path.join(__dirname, '..', 'screenshots');
    this.ensureScreenshotsDir();

    const cleanup = async () => {
      await this.close();
    };
    process.once('SIGINT', async () => { await cleanup(); process.exit(0); });
    process.once('SIGTERM', async () => { await cleanup(); process.exit(0); });
  }

  async ensureScreenshotsDir() {
    await fs.mkdir(this.screenshotsDir, { recursive: true });
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
    }
    return this.browser;
  }

  async captureScreenshot(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setViewport({ width: 1280, height: 800 });
      
      console.log(`正在截图: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await this.ensureScreenshotsDir();
      const timestamp = Date.now();
      const screenshotPath = path.join(this.screenshotsDir, `vision-sim-${timestamp}.png`);
      
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      const base64 = await fs.readFile(screenshotPath, 'base64');
      
      await page.close();
      
      return {
        success: true,
        url,
        screenshotPath: `/screenshots/vision-sim-${timestamp}.png`,
        screenshotBase64: `data:image/png;base64,${base64}`,
        timestamp
      };
      
    } catch (error) {
      try {
        await page.close();
      } catch (e) {}
      throw error;
    }
  }

  async scanPage(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setViewport({ width: 1280, height: 800 });
      
      console.log(`正在加载页面: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      console.log('正在执行无障碍检测...');
      const axeResults = await new AxePuppeteer(page)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      console.log('正在获取问题节点位置信息...');
      const violationsWithPositions = await this.addNodePositions(page, axeResults.violations);
      
      console.log('正在生成截图...');
      await this.ensureScreenshotsDir();
      const timestamp = Date.now();
      const originalScreenshotPath = path.join(this.screenshotsDir, `original-${timestamp}.png`);
      const highlightedScreenshotPath = path.join(this.screenshotsDir, `highlighted-${timestamp}.png`);
      
      await page.screenshot({ 
        path: originalScreenshotPath, 
        fullPage: true 
      });
      
      console.log('正在生成高亮截图...');
      await this.generateHighlightedScreenshot(
        originalScreenshotPath, 
        highlightedScreenshotPath, 
        violationsWithPositions
      );
      
      console.log('正在计算无障碍评分...');
      const score = scoringService.calculateScore(axeResults);
      
      console.log('正在生成基础修复建议...');
      const suggestions = this.generateBasicSuggestions(violationsWithPositions);
      
      await page.close();
      
      return {
        success: true,
        url,
        timestamp: new Date().toISOString(),
        score,
        originalScreenshot: `/screenshots/original-${timestamp}.png`,
        highlightedScreenshot: `/screenshots/highlighted-${timestamp}.png`,
        violations: violationsWithPositions,
        passes: axeResults.passes,
        inapplicable: axeResults.inapplicable,
        incomplete: axeResults.incomplete,
        suggestions,
        summary: {
          totalViolations: violationsWithPositions.length,
          critical: violationsWithPositions.filter(v => v.impact === 'critical').length,
          serious: violationsWithPositions.filter(v => v.impact === 'serious').length,
          moderate: violationsWithPositions.filter(v => v.impact === 'moderate').length,
          minor: violationsWithPositions.filter(v => v.impact === 'minor').length
        }
      };
      
    } catch (error) {
      try {
        await page.close();
      } catch (e) {}
      throw error;
    }
  }

  async addNodePositions(page, violations) {
    return Promise.all(violations.map(async (violation) => {
      const nodesWithPositions = await Promise.all(violation.nodes.map(async (node) => {
        try {
          const selector = node.target[0] || node.target;
          const element = await page.$(selector);
          
          if (element) {
            const boundingBox = await element.boundingBox();
            const outerHTML = await page.evaluate(el => el.outerHTML, element);
            
            return {
              ...node,
              position: boundingBox,
              outerHTML: outerHTML ? outerHTML.substring(0, 500) : 'N/A'
            };
          }
        } catch (e) {
          console.log(`无法获取节点位置: ${node.target}`);
        }
        
        return {
          ...node,
          position: null,
          outerHTML: '无法获取'
        };
      }));
      
      return {
        ...violation,
        nodes: nodesWithPositions
      };
    }));
  }

  async generateHighlightedScreenshot(originalPath, outputPath, violations) {
    const image = sharp(originalPath);
    const metadata = await image.metadata();
    
    const allProblemAreas = [];
    
    violations.forEach(violation => {
      const impactColors = {
        critical: { r: 220, g: 53, b: 69 },
        serious: { r: 255, g: 140, b: 0 },
        moderate: { r: 255, g: 204, b: 0 },
        minor: { r: 66, g: 153, b: 255 }
      };
      
      const color = impactColors[violation.impact] || impactColors.minor;
      
      violation.nodes.forEach(node => {
        if (node.position) {
          const x = Math.max(0, node.position.x);
          const y = Math.max(0, node.position.y);
          allProblemAreas.push({
            x,
            y,
            width: Math.min(node.position.width, metadata.width - x),
            height: Math.min(node.position.height, metadata.height - y),
            color,
            impact: violation.impact
          });
        }
      });
    });
    
    if (allProblemAreas.length === 0) {
      await image.toFile(outputPath);
      return;
    }
    
    const svgOverlays = allProblemAreas.map((area, index) => {
      const heatmapOpacity = {
        critical: 0.4,
        serious: 0.3,
        moderate: 0.25,
        minor: 0.2
      };
      
      const opacity = heatmapOpacity[area.impact] || 0.2;
      
      return `
        <rect 
          x="${area.x}" 
          y="${area.y}" 
          width="${area.width}" 
          height="${area.height}"
          fill="rgba(${area.color.r}, ${area.color.g}, ${area.color.b}, ${opacity})"
          stroke="rgb(${area.color.r}, ${area.color.g}, ${area.color.b})"
          stroke-width="3"
          rx="2"
        />
        <text 
          x="${area.x + 5}" 
          y="${area.y + 18}" 
          font-size="14" 
          font-weight="bold"
          fill="white"
          stroke="rgba(0,0,0,0.5)"
          stroke-width="0.5"
        >${index + 1}</text>
      `;
    }).join('');
    
    const svg = `
      <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
        ${svgOverlays}
      </svg>
    `;
    
    await image
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0
        }
      ])
      .toFile(outputPath);
  }

  generateBasicSuggestions(violations) {
    const suggestions = [];
    
    const ruleSuggestions = {
      'color-contrast': {
        title: '色彩对比度不足',
        suggestion: '确保文本与背景之间的对比度符合 WCAG 标准。普通文本对比度至少 4.5:1，大文本至少 3:1。',
        codeExample: `/* 修复示例 */
.bad-text {
  color: #777777; /* 对比度不足 */
}

.good-text {
  color: #333333; /* 对比度符合要求 */
  background-color: #ffffff;
}`
      },
      'image-alt': {
        title: '图片缺少 alt 属性',
        suggestion: '为所有 <img> 标签添加有意义的 alt 属性。装饰性图片使用空 alt=""。',
        codeExample: `<!-- 修复示例 -->
<img src="logo.png" alt="公司logo">

<!-- 装饰性图片 -->
<img src="decorative-line.png" alt="">`
      },
      'label': {
        title: '表单控件缺少标签',
        suggestion: '确保所有表单控件都有关联的 <label> 标签，或使用 aria-label/aria-labelledby 属性。',
        codeExample: `<!-- 修复示例 -->
<label for="username">用户名:</label>
<input type="text" id="username" name="username">

<!-- 或使用 aria-label -->
<input type="search" aria-label="搜索网站">`
      },
      'link-name': {
        title: '链接缺少可访问名称',
        suggestion: '确保链接有可访问的文本内容。避免使用仅包含图片的链接而没有 alt 属性。',
        codeExample: `<!-- 修复示例 -->
<a href="/about">关于我们</a>

<!-- 图片链接 -->
<a href="/home">
  <img src="home-icon.png" alt="返回首页">
</a>`
      },
      'button-name': {
        title: '按钮缺少可访问名称',
        suggestion: '按钮应该有可访问的名称。使用 aria-label 或确保按钮内有文本内容。',
        codeExample: `<!-- 修复示例 -->
<button>提交表单</button>

<!-- 图标按钮 -->
<button aria-label="关闭弹窗">
  <span class="close-icon">×</span>
</button>`
      },
      'heading-order': {
        title: '标题层级顺序不正确',
        suggestion: '确保标题按逻辑顺序排列（h1 > h2 > h3），不要跳过层级。',
        codeExample: `<!-- 修复示例 -->
<h1>页面主标题</h1>
<h2>章节标题</h2>
<h3>小节标题</h3>`
      },
      'landmark-one-main': {
        title: '缺少主内容地标',
        suggestion: '页面应该包含一个 <main> 元素或 role="main" 的地标。',
        codeExample: `<!-- 修复示例 -->
<main>
  <h1>页面主内容</h1>
  <!-- 主要内容 -->
</main>`
      },
      'region': {
        title: '页面区域缺少地标',
        suggestion: '使用语义化标签如 <header>, <nav>, <main>, <aside>, <footer> 或 ARIA role 来标识页面区域。',
        codeExample: `<!-- 修复示例 -->
<header role="banner">...</header>
<nav role="navigation">...</nav>
<main role="main">...</main>
<aside role="complementary">...</aside>
<footer role="contentinfo">...</footer>`
      },
      'duplicate-id': {
        title: '重复的 ID 属性',
        suggestion: '确保页面中所有 ID 属性都是唯一的。',
        codeExample: `<!-- 修复示例 -->
<div id="section-1">...</div>
<div id="section-2">...</div>  <!-- 不要重复使用相同的 ID -->`
      }
    };
    
    violations.forEach(violation => {
      const ruleInfo = ruleSuggestions[violation.id] || {
        title: violation.help,
        suggestion: violation.description,
        codeExample: '请参考 WCAG 规范进行修复。'
      };
      
      suggestions.push({
        ruleId: violation.id,
        title: ruleInfo.title,
        impact: violation.impact,
        description: violation.description,
        helpUrl: violation.helpUrl,
        suggestion: ruleInfo.suggestion,
        codeExample: ruleInfo.codeExample,
        affectedElements: violation.nodes.length,
        nodes: violation.nodes.map(node => ({
          selector: node.target,
          html: node.outerHTML
        }))
      });
    });
    
    return suggestions;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new AccessibilityService();
