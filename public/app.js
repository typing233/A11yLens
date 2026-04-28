class A11yLensApp {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSavedConfig();
  }

  bindEvents() {
    const scanBtn = document.getElementById('scanBtn');
    const urlInput = document.getElementById('urlInput');
    const toggleConfig = document.getElementById('toggleConfig');
    const configSection = document.getElementById('configSection');
    const retryBtn = document.getElementById('retryBtn');
    const closeModal = document.getElementById('closeModal');
    const modal = document.getElementById('issueModal');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    scanBtn.addEventListener('click', () => this.startScan());
    
    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startScan();
    });
    
    toggleConfig.addEventListener('click', () => {
      configSection.classList.toggle('hidden');
    });
    
    retryBtn.addEventListener('click', () => {
      this.hideSection('errorSection');
      this.showSection('inputSection');
    });
    
    closeModal.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
    
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterIssues(btn.dataset.filter);
      });
    });
    
    ['apiKey', 'modelName', 'useLLM'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => this.saveConfig());
      }
    });
  }

  loadSavedConfig() {
    try {
      const savedConfig = localStorage.getItem('a11yLensConfig');
      if (!savedConfig) return;
      
      const config = JSON.parse(savedConfig);
      
      const apiKeyEl = document.getElementById('apiKey');
      const modelNameEl = document.getElementById('modelName');
      const useLLMEl = document.getElementById('useLLM');
      
      if (apiKeyEl && config.apiKey) {
        apiKeyEl.value = config.apiKey;
      }
      if (modelNameEl && config.modelName) {
        modelNameEl.value = config.modelName;
      }
      if (useLLMEl && config.useLLM !== undefined) {
        useLLMEl.checked = config.useLLM;
      }
    } catch (e) {
      console.warn('无法加载配置:', e);
    }
  }

  saveConfig() {
    const apiKeyEl = document.getElementById('apiKey');
    const modelNameEl = document.getElementById('modelName');
    const useLLMEl = document.getElementById('useLLM');
    
    const config = {
      apiKey: apiKeyEl ? apiKeyEl.value : '',
      modelName: modelNameEl ? modelNameEl.value : '',
      useLLM: useLLMEl ? useLLMEl.checked : true
    };
    
    try {
      localStorage.setItem('a11yLensConfig', JSON.stringify(config));
    } catch (e) {
      console.warn('无法保存配置到 localStorage:', e);
    }
  }

  getLLMConfig() {
    const useLLMEl = document.getElementById('useLLM');
    if (!useLLMEl || !useLLMEl.checked) return null;
    
    const apiKeyEl = document.getElementById('apiKey');
    const modelNameEl = document.getElementById('modelName');
    
    const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';
    const modelName = modelNameEl ? modelNameEl.value.trim() : '';
    
    if (!apiKey || !modelName) return null;
    
    return { apiKey, modelName };
  }

  async startScan() {
    const urlInputEl = document.getElementById('urlInput');
    const url = urlInputEl ? urlInputEl.value.trim() : '';
    
    if (!url) {
      alert('请输入目标网页 URL');
      return;
    }
    
    if (!this.isValidUrl(url)) {
      alert('请输入有效的 URL，例如 https://example.com');
      return;
    }
    
    const llmConfig = this.getLLMConfig();
    
    this.hideSection('inputSection');
    this.hideSection('resultsSection');
    this.hideSection('errorSection');
    this.showSection('loadingSection');
    
    this.updateProgress(10, '正在加载页面...');
    
    try {
      const response = await fetch('/api/accessibility/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          llmConfig
        })
      });
      
      this.updateProgress(50, '正在执行无障碍检测...');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '扫描失败');
      }
      
      this.updateProgress(80, '正在生成报告...');
      
      const data = await response.json();
      
      this.updateProgress(100, '完成！');
      
      setTimeout(() => {
        this.hideSection('loadingSection');
        this.showResults(data);
      }, 500);
      
    } catch (error) {
      this.hideSection('loadingSection');
      this.showError(error.message);
    }
  }

  updateProgress(percent, text) {
    const progressFill = document.getElementById('progressFill');
    const loadingText = document.getElementById('loadingText');
    
    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }
    if (loadingText) {
      loadingText.textContent = text;
    }
  }

  showResults(data) {
    this.showSection('resultsSection');
    
    const scanUrlEl = document.getElementById('scanUrl');
    const scanTimeEl = document.getElementById('scanTime');
    
    if (scanUrlEl) scanUrlEl.textContent = data.url;
    if (scanTimeEl) scanTimeEl.textContent = new Date(data.timestamp).toLocaleString('zh-CN');
    
    this.updateScoreDisplay(data.score);
    this.updateStats(data.summary);
    this.updateScreenshots(data);
    this.updateIssuesList(data.violations, data.suggestions);
    
    if (data.llmSuggestions) {
      this.showLLMSuggestions(data.llmSuggestions);
    } else {
      this.hideSection('llmSection');
    }
    
    if (data.llmError) {
      console.warn('LLM Error:', data.llmError);
    }
  }

  updateScoreDisplay(scoreData) {
    const scoreValue = document.getElementById('scoreValue');
    const scoreGrade = document.getElementById('scoreGrade');
    const scoreMessage = document.getElementById('scoreMessage');
    const scoreCircle = document.getElementById('scoreCircle');
    
    if (scoreValue) scoreValue.textContent = scoreData.score;
    if (scoreGrade) {
      scoreGrade.textContent = scoreData.grade;
      scoreGrade.style.color = scoreData.color;
    }
    if (scoreMessage) scoreMessage.textContent = scoreData.message;
    if (scoreCircle) {
      const scoreDeg = (scoreData.score / 100) * 360;
      scoreCircle.style.setProperty('--score-deg', `${scoreDeg}deg`);
    }
  }

  updateStats(summary) {
    const statCritical = document.getElementById('statCritical');
    const statSerious = document.getElementById('statSerious');
    const statModerate = document.getElementById('statModerate');
    const statMinor = document.getElementById('statMinor');
    
    if (statCritical) statCritical.textContent = summary.critical;
    if (statSerious) statSerious.textContent = summary.serious;
    if (statModerate) statModerate.textContent = summary.moderate;
    if (statMinor) statMinor.textContent = summary.minor;
  }

  updateScreenshots(data) {
    const originalImg = document.getElementById('originalScreenshot');
    const highlightedImg = document.getElementById('highlightedScreenshot');
    
    if (originalImg && data.originalScreenshot) {
      originalImg.src = data.originalScreenshot;
    }
    if (highlightedImg && data.highlightedScreenshot) {
      highlightedImg.src = data.highlightedScreenshot;
    }
  }

  updateIssuesList(violations, suggestions) {
    const issuesList = document.getElementById('issuesList');
    if (!issuesList) {
      console.warn('[updateIssuesList] issuesList 元素不存在');
      return;
    }
    
    issuesList.innerHTML = '';
    
    if (!violations || violations.length === 0) {
      issuesList.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <h3>太棒了！</h3>
          <p>未发现任何无障碍问题。</p>
        </div>
      `;
      return;
    }
    
    const sortedViolations = [...violations].sort((a, b) => {
      const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      return (impactOrder[a.impact] || 99) - (impactOrder[b.impact] || 99);
    });
    
    sortedViolations.forEach((violation, index) => {
      const suggestion = suggestions ? suggestions.find(s => s.ruleId === violation.id) : null;
      const issueElement = this.createIssueElement(violation, suggestion, index);
      issuesList.appendChild(issueElement);
    });
  }

  createIssueElement(violation, suggestion, index) {
    if (!violation) {
      return document.createElement('div');
    }
    
    const div = document.createElement('div');
    const impact = violation.impact || 'minor';
    div.className = `issue-item ${impact}`;
    div.dataset.impact = impact;
    
    const nodes = violation.nodes || [];
    const affectedCount = nodes.length;
    
    const nodesHtml = nodes.slice(0, 5).map(node => {
      const target = node.target;
      const displayText = Array.isArray(target) ? target[0] : target;
      return `<div class="affected-node">${this.escapeHtml(displayText || 'N/A')}</div>`;
    }).join('');
    
    const moreNodesHtml = affectedCount > 5 
      ? `<p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">... 还有 ${affectedCount - 5} 个元素</p>` 
      : '';
    
    const suggestionHtml = suggestion ? `
      <div class="issue-section">
        <h5>修复建议</h5>
        <p style="margin-bottom: 12px;">${suggestion.suggestion || ''}</p>
        <pre class="code-example">${this.escapeHtml(suggestion.codeExample || '')}</pre>
      </div>
    ` : '';
    
    div.innerHTML = `
      <div class="issue-header">
        <div class="issue-left">
          <span class="issue-impact ${impact}">${impact}</span>
          <span class="issue-title">${this.escapeHtml(violation.help || '未知问题')}</span>
        </div>
        <div class="issue-meta">
          <span>${affectedCount} 个元素受影响</span>
          <span class="issue-expand">▼</span>
        </div>
      </div>
      <div class="issue-body">
        <div class="issue-section">
          <h5>问题描述</h5>
          <p class="issue-description">${this.escapeHtml(violation.description || '暂无描述')}</p>
          ${violation.helpUrl ? `<a href="${violation.helpUrl}" target="_blank" class="help-link">查看 WCAG 规范文档 →</a>` : ''}
        </div>
        <div class="issue-section">
          <h5>受影响的元素 (${affectedCount})</h5>
          <div class="affected-nodes">
            ${nodesHtml}
            ${moreNodesHtml}
          </div>
        </div>
        ${suggestionHtml}
      </div>
    `;
    
    const header = div.querySelector('.issue-header');
    if (header) {
      header.addEventListener('click', () => {
        div.classList.toggle('expanded');
      });
    }
    
    return div;
  }

  filterIssues(filter) {
    const issues = document.querySelectorAll('.issue-item');
    
    issues.forEach(issue => {
      if (filter === 'all' || issue.dataset.impact === filter) {
        issue.style.display = 'block';
      } else {
        issue.style.display = 'none';
      }
    });
  }

  showLLMSuggestions(llmSuggestions) {
    const llmSection = document.getElementById('llmSection');
    const llmContent = document.getElementById('llmContent');
    
    if (llmSection) {
      llmSection.classList.remove('hidden');
    }
    
    if (llmContent && llmSuggestions && llmSuggestions.detailedSuggestions) {
      llmContent.innerHTML = this.formatMarkdown(llmSuggestions.detailedSuggestions);
    }
  }

  formatMarkdown(text) {
    let formatted = text
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    }
    
    return formatted;
  }

  showError(message) {
    this.showSection('errorSection');
    const errorMessageEl = document.getElementById('errorMessage');
    if (errorMessageEl) {
      errorMessageEl.textContent = message;
    }
  }

  showSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.classList.remove('hidden');
    } else {
      console.warn(`[showSection] 元素不存在: ${sectionId}`);
    }
  }

  hideSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.classList.add('hidden');
    } else {
      console.warn(`[hideSection] 元素不存在: ${sectionId}`);
    }
  }

  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new A11yLensApp();
});
