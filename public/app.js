class A11yLensApp {
  constructor() {
    this.domTree = null;
    this.renderMode = 'blocks';
    this.autoRotate = false;
    this.showLabels = false;
    this.currentTab = 'scan';
    
    this.parkourState = {
      level: 1,
      score: 0,
      time: 0,
      isPlaying: false,
      timerInterval: null,
      targetOrder: [],
      currentTargetIndex: 0
    };
    
    this.init();
  }

  init() {
    this.loadSavedConfig();
    this.bindEvents();
    this.updateCurrentConfigDisplay();
  }

  loadSavedConfig() {
    try {
      const savedConfig = localStorage.getItem('a11yLensConfig');
      if (!savedConfig) return;
      
      const config = JSON.parse(savedConfig);
      
      const baseUrlEl = document.getElementById('configBaseUrl');
      const apiKeyEl = document.getElementById('configApiKey');
      const modelNameEl = document.getElementById('configModelName');
      
      if (baseUrlEl && config.baseUrl) {
        baseUrlEl.value = config.baseUrl;
      }
      if (apiKeyEl && config.apiKey) {
        apiKeyEl.value = config.apiKey;
      }
      if (modelNameEl && config.modelName) {
        modelNameEl.value = config.modelName;
      }
    } catch (e) {
      console.warn('无法加载配置:', e);
    }
  }

  saveConfig(config) {
    try {
      localStorage.setItem('a11yLensConfig', JSON.stringify(config));
    } catch (e) {
      console.warn('无法保存配置到 localStorage:', e);
    }
  }

  getLLMConfig() {
    const baseUrlEl = document.getElementById('configBaseUrl');
    const apiKeyEl = document.getElementById('configApiKey');
    const modelNameEl = document.getElementById('configModelName');
    
    const baseUrl = baseUrlEl ? baseUrlEl.value.trim() : '';
    const apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';
    const modelName = modelNameEl ? modelNameEl.value.trim() : '';
    
    if (!apiKey || !modelName) return null;
    
    return { baseUrl, apiKey, modelName };
  }

  updateCurrentConfigDisplay() {
    const config = this.getLLMConfig();
    const currentBaseUrl = document.getElementById('currentBaseUrl');
    const currentApiKeyStatus = document.getElementById('currentApiKeyStatus');
    const currentModelName = document.getElementById('currentModelName');
    
    if (currentBaseUrl) {
      currentBaseUrl.textContent = config?.baseUrl || '未配置';
    }
    if (currentApiKeyStatus) {
      currentApiKeyStatus.textContent = config?.apiKey ? '已配置' : '未配置';
    }
    if (currentModelName) {
      currentModelName.textContent = config?.modelName || '未配置';
    }
  }

  bindEvents() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    const startScanBtn = document.getElementById('startScanBtn');
    const scanUrlInput = document.getElementById('scanUrlInput');
    if (startScanBtn) {
      startScanBtn.addEventListener('click', () => this.startScan());
    }
    if (scanUrlInput) {
      scanUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.startScan();
      });
    }

    const scanRetryBtn = document.getElementById('scanRetryBtn');
    if (scanRetryBtn) {
      scanRetryBtn.addEventListener('click', () => {
        this.hideSection('scanLoadingSection');
        this.hideSection('scanErrorSection');
        this.hideSection('scanResultsSection');
        this.showSection('scanTab');
      });
    }

    const loadTopologyBtn = document.getElementById('loadTopologyBtn');
    if (loadTopologyBtn) {
      loadTopologyBtn.addEventListener('click', () => this.loadTopology());
    }

    const renderModeBtns = document.querySelectorAll('[data-render-mode]');
    renderModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        renderModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderMode = btn.dataset.renderMode;
        if (this.domTree) {
          this.renderTopology();
        }
      });
    });

    const resetCameraBtn = document.getElementById('resetCameraBtn');
    if (resetCameraBtn) {
      resetCameraBtn.addEventListener('click', () => this.resetCamera());
    }

    const toggleAutoRotateBtn = document.getElementById('toggleAutoRotateBtn');
    if (toggleAutoRotateBtn) {
      toggleAutoRotateBtn.addEventListener('click', () => {
        this.autoRotate = !this.autoRotate;
        toggleAutoRotateBtn.classList.toggle('active', this.autoRotate);
      });
    }

    const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
    if (toggleLabelsBtn) {
      toggleLabelsBtn.addEventListener('click', () => {
        this.showLabels = !this.showLabels;
        toggleLabelsBtn.classList.toggle('active', this.showLabels);
        this.updateLabelsVisibility();
      });
    }

    const loadVisionSimScreenshotBtn = document.getElementById('loadVisionSimScreenshotBtn');
    if (loadVisionSimScreenshotBtn) {
      loadVisionSimScreenshotBtn.addEventListener('click', () => this.loadVisionSimScreenshot());
    }

    const resetToDemoBtn = document.getElementById('resetToDemoBtn');
    if (resetToDemoBtn) {
      resetToDemoBtn.addEventListener('click', () => this.resetToDemoContent());
    }

    const visionSimUrlInput = document.getElementById('visionSimUrlInput');
    if (visionSimUrlInput) {
      visionSimUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.loadVisionSimScreenshot();
      });
    }

    const analyzeSRBtn = document.getElementById('analyzeSRBtn');
    if (analyzeSRBtn) {
      analyzeSRBtn.addEventListener('click', () => this.analyzeScreenReaderPath());
    }

    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.switchArcadeMode(mode);
      });
    });

    const simTypeBtns = document.querySelectorAll('.sim-type-btn');
    simTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        simTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyVisionSimulation(btn.dataset.simType);
      });
    });

    const visionSeverity = document.getElementById('visionSeverity');
    if (visionSeverity) {
      visionSeverity.addEventListener('input', () => {
        const activeBtn = document.querySelector('.sim-type-btn.active');
        if (activeBtn) {
          this.applyVisionSimulation(activeBtn.dataset.simType);
        }
      });
    }

    const startParkourBtn = document.getElementById('startParkourBtn');
    if (startParkourBtn) {
      startParkourBtn.addEventListener('click', () => this.startParkourGame());
    }

    const resetParkourBtn = document.getElementById('resetParkourBtn');
    if (resetParkourBtn) {
      resetParkourBtn.addEventListener('click', () => this.resetParkourGame());
    }

    const testConnectionBtn = document.getElementById('testConnectionBtn');
    if (testConnectionBtn) {
      testConnectionBtn.addEventListener('click', () => this.testLLMConnection());
    }

    const saveConfigBtn = document.getElementById('saveConfigBtn');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => this.saveCurrentConfig());
    }

    const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
    const configApiKey = document.getElementById('configApiKey');
    if (toggleApiKeyVisibility && configApiKey) {
      toggleApiKeyVisibility.addEventListener('click', () => {
        const isPassword = configApiKey.type === 'password';
        configApiKey.type = isPassword ? 'text' : 'password';
        toggleApiKeyVisibility.textContent = isPassword ? '🙈' : '👁️';
      });
    }

    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const baseUrl = btn.dataset.baseurl;
        const baseUrlEl = document.getElementById('configBaseUrl');
        if (baseUrlEl) {
          baseUrlEl.value = baseUrl;
        }
      });
    });

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterIssues(btn.dataset.filter);
      });
    });

    const closeModal = document.getElementById('closeModal');
    const modal = document.getElementById('issueModal');
    if (closeModal && modal) {
      closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }

    const closePanel = document.querySelector('.close-panel');
    const nodeInfoPanel = document.getElementById('topologyNodeInfo');
    if (closePanel && nodeInfoPanel) {
      closePanel.addEventListener('click', () => {
        nodeInfoPanel.classList.add('hidden');
      });
    }

    window.addEventListener('resize', () => {
      if (this.scene) {
        this.onWindowResize();
      }
    });
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.add('hidden');
    });

    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) {
      targetTab.classList.remove('hidden');
    }
  }

  showSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.classList.remove('hidden');
    }
  }

  hideSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.classList.add('hidden');
    }
  }

  updateScanProgress(percent, text) {
    const progressFill = document.getElementById('scanProgressFill');
    const loadingText = document.getElementById('scanLoadingText');
    
    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }
    if (loadingText) {
      loadingText.textContent = text;
    }
  }

  async startScan() {
    const urlInput = document.getElementById('scanUrlInput');
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!url) {
      alert('请输入目标网页 URL');
      return;
    }
    
    if (!this.isValidUrl(url)) {
      alert('请输入有效的 URL，例如 https://example.com');
      return;
    }
    
    const llmConfig = this.getLLMConfig();
    const startScanBtn = document.getElementById('startScanBtn');
    
    if (startScanBtn) startScanBtn.disabled = true;
    
    this.hideSection('scanErrorSection');
    this.hideSection('scanResultsSection');
    this.showSection('scanLoadingSection');
    
    this.updateScanProgress(10, '正在加载页面...');
    
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
      
      this.updateScanProgress(50, '正在执行无障碍检测...');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '扫描失败');
      }
      
      this.updateScanProgress(80, '正在生成报告...');
      
      const data = await response.json();
      
      this.updateScanProgress(100, '完成！');
      
      setTimeout(() => {
        this.hideSection('scanLoadingSection');
        this.showScanResults(data);
        if (startScanBtn) startScanBtn.disabled = false;
      }, 500);
      
    } catch (error) {
      this.hideSection('scanLoadingSection');
      this.showScanError(error.message);
      if (startScanBtn) startScanBtn.disabled = false;
    }
  }

  showScanError(message) {
    this.showSection('scanErrorSection');
    const errorMessageEl = document.getElementById('scanErrorMessage');
    if (errorMessageEl) {
      errorMessageEl.textContent = message;
    }
  }

  showScanResults(data) {
    this.showSection('scanResultsSection');
    
    const scanResultUrl = document.getElementById('scanResultUrl');
    const scanResultTime = document.getElementById('scanResultTime');
    
    if (scanResultUrl) scanResultUrl.textContent = data.url;
    if (scanResultTime) scanResultTime.textContent = new Date(data.timestamp).toLocaleString('zh-CN');
    
    this.updateScoreDisplay(data.score);
    this.updateStats(data.summary);
    this.updateScreenshots(data);
    this.updateIssuesList(data.violations, data.suggestions);
    
    if (data.llmSuggestions) {
      this.showLLMSuggestions(data.llmSuggestions);
    } else {
      this.hideSection('scanLLMSection');
    }
    
    if (data.llmError) {
      console.warn('LLM Error:', data.llmError);
    }
  }

  updateScoreDisplay(scoreData) {
    const scoreValue = document.getElementById('scanScoreValue');
    const scoreGrade = document.getElementById('scanScoreGrade');
    const scoreMessage = document.getElementById('scanScoreMessage');
    const scoreCircle = document.getElementById('scanScoreCircle');
    
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
    const statCritical = document.getElementById('scanStatCritical');
    const statSerious = document.getElementById('scanStatSerious');
    const statModerate = document.getElementById('scanStatModerate');
    const statMinor = document.getElementById('scanStatMinor');
    
    if (statCritical) statCritical.textContent = summary.critical;
    if (statSerious) statSerious.textContent = summary.serious;
    if (statModerate) statModerate.textContent = summary.moderate;
    if (statMinor) statMinor.textContent = summary.minor;
  }

  updateScreenshots(data) {
    const originalImg = document.getElementById('scanOriginalImg');
    const highlightedImg = document.getElementById('scanHighlightedImg');
    
    if (originalImg && data.originalScreenshot) {
      originalImg.src = data.originalScreenshot;
    }
    if (highlightedImg && data.highlightedScreenshot) {
      highlightedImg.src = data.highlightedScreenshot;
    }
  }

  updateIssuesList(violations, suggestions) {
    const issuesList = document.getElementById('scanIssuesList');
    if (!issuesList) return;
    
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
    const llmSection = document.getElementById('scanLLMSection');
    const llmContent = document.getElementById('scanLLMContent');
    
    if (llmSection) {
      llmSection.classList.remove('hidden');
    }
    
    if (llmContent && llmSuggestions && llmSuggestions.detailedSuggestions) {
      llmContent.innerHTML = this.formatMarkdown(llmSuggestions.detailedSuggestions);
    }
  }

  formatMarkdown(text) {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let formatted = escaped
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

  async loadTopology() {
    const urlInput = document.getElementById('topologyUrlInput');
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!url) {
      alert('请输入目标网页 URL');
      return;
    }
    
    if (!this.isValidUrl(url)) {
      alert('请输入有效的 URL，例如 https://example.com');
      return;
    }

    const placeholder = document.getElementById('topologyPlaceholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="loading-spinner" style="margin-bottom: 16px;">
          <div class="spinner"></div>
        </div>
        <p>正在提取 DOM 结构...</p>
      `;
    }

    try {
      const response = await fetch('/api/accessibility/dom-tree', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('DOM 树提取失败');
      }

      this.domTree = await response.json();
      this.updateTopologyStats();
      this.initThreeJS();
      this.renderTopology();
      
      if (placeholder) {
        placeholder.classList.add('hidden');
      }

    } catch (error) {
      console.error('加载拓扑图失败:', error);
      if (placeholder) {
        placeholder.innerHTML = `
          <div class="error-icon" style="margin-bottom: 16px;">❌</div>
          <p>加载失败: ${error.message}</p>
        `;
      }
    }
  }

  updateTopologyStats() {
    if (!this.domTree) return;
    
    const totalNodes = document.getElementById('topologyTotalNodes');
    const semanticCount = document.getElementById('topologySemanticCount');
    const focusableCount = document.getElementById('topologyFocusableCount');
    const maxDepth = document.getElementById('topologyMaxDepth');
    
    const semanticNodes = this.domTree.allNodes.filter(n => n.isSemantic);
    const focusableNodes = this.domTree.allNodes.filter(n => n.accessibility?.isFocusable);
    const depth = Math.max(...this.domTree.allNodes.map(n => n.depth));
    
    if (totalNodes) totalNodes.textContent = this.domTree.totalNodes;
    if (semanticCount) semanticCount.textContent = semanticNodes.length;
    if (focusableCount) focusableCount.textContent = focusableNodes.length;
    if (maxDepth) maxDepth.textContent = depth;
  }

  initThreeJS() {
    const container = document.getElementById('topologyCanvasContainer');
    const canvas = document.getElementById('topologyCanvas');
    
    if (!container || !canvas) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 600;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 50, 100);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4f46e5, 1, 200);
    pointLight.position.set(-50, 50, 50);
    this.scene.add(pointLight);

    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x333333);
    this.scene.add(gridHelper);

    this.nodeObjects = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
    canvas.addEventListener('click', (event) => this.onCanvasClick(event));

    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    
    canvas.addEventListener('mousedown', (event) => {
      this.isDragging = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mousemove', (event) => {
      if (this.isDragging) {
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        this.rotateCamera(deltaX * 0.01, deltaY * 0.01);
        
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
      }
    });

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.zoomCamera(event.deltaY > 0 ? -1 : 1);
    });

    this.animate();
  }

  rotateCamera(deltaX, deltaY) {
    if (!this.camera) return;

    const radius = Math.sqrt(
      this.camera.position.x ** 2 + 
      this.camera.position.y ** 2 + 
      this.camera.position.z ** 2
    );

    let theta = Math.atan2(this.camera.position.x, this.camera.position.z);
    let phi = Math.acos(this.camera.position.y / radius);

    theta -= deltaX;
    phi -= deltaY;

    phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

    this.camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = radius * Math.cos(phi);
    this.camera.position.z = radius * Math.sin(phi) * Math.cos(theta);

    this.camera.lookAt(0, 0, 0);
  }

  zoomCamera(direction) {
    if (!this.camera) return;
    
    const speed = 5;
    const directionVector = new THREE.Vector3();
    this.camera.getWorldDirection(directionVector);
    
    this.camera.position.add(directionVector.multiplyScalar(speed * direction));
  }

  renderTopology() {
    if (!this.scene || !this.domTree) return;

    this.nodeObjects.forEach(obj => {
      if (obj.mesh) this.scene.remove(obj.mesh);
      if (obj.labelSprite) this.scene.remove(obj.labelSprite);
    });
    this.nodeObjects = [];

    if (this.connectionLines) {
      this.connectionLines.forEach(line => this.scene.remove(line));
    }
    this.connectionLines = [];

    const visibleNodes = this.domTree.allNodes.filter(n => n.isVisible);
    
    const nodeMap = new Map(visibleNodes.map(n => [n.id, n]));
    
    const depthMap = new Map();
    visibleNodes.forEach(node => {
      if (!depthMap.has(node.depth)) {
        depthMap.set(node.depth, []);
      }
      depthMap.get(node.depth).push(node);
    });

    const maxDepth = Math.max(...Array.from(depthMap.keys()));
    const depthSpacing = 25;
    
    const radialPositions = this.calculateRadialTreeLayout(visibleNodes, nodeMap, depthSpacing);

    visibleNodes.forEach((node, index) => {
      const pos = radialPositions.get(node.id);
      if (!pos) return;

      const geometry = this.getGeometryForNode(node);
      const color = new THREE.Color(node.color);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
        shininess: 100
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData = { node, index, position: pos };

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        opacity: 0.4, 
        transparent: true 
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      const labelSprite = this.createLabelSprite(node);
      if (labelSprite) {
        labelSprite.position.set(pos.x, pos.y + 3, pos.z);
        labelSprite.visible = this.showLabels;
        this.scene.add(labelSprite);
      }

      this.scene.add(mesh);
      this.nodeObjects.push({ mesh, node, labelSprite });
    });

    this.addRadialConnectionLines(visibleNodes, nodeMap, radialPositions);
  }

  calculateRadialTreeLayout(nodes, nodeMap, depthSpacing) {
    const positions = new Map();
    
    const rootNode = nodes.find(n => n.depth === 0) || nodes[0];
    
    const depthNodesMap = new Map();
    nodes.forEach(node => {
      if (!depthNodesMap.has(node.depth)) {
        depthNodesMap.set(node.depth, []);
      }
      depthNodesMap.get(node.depth).push(node);
    });

    const maxDepth = Math.max(...Array.from(depthNodesMap.keys()));
    
    depthNodesMap.forEach((nodesAtDepth, depth) => {
      const nodeCount = nodesAtDepth.length;
      const z = depth * depthSpacing;
      
      if (depth === 0) {
        nodesAtDepth.forEach(node => {
          positions.set(node.id, { x: 0, y: 0, z: 0 });
        });
      } else {
        const parentDepth = depth - 1;
        const parentsAtDepth = depthNodesMap.get(parentDepth) || [];
        
        const nodesPerParent = Math.ceil(nodeCount / Math.max(parentsAtDepth.length, 1));
        
        nodesAtDepth.forEach((node, index) => {
          const parentIndex = Math.floor(index / nodesPerParent);
          const parent = parentsAtDepth[parentIndex] || parentsAtDepth[0];
          const parentPos = positions.get(parent?.id);
          
          const siblingsOfParent = nodesAtDepth.filter((n, i) => 
            Math.floor(i / nodesPerParent) === parentIndex
          );
          const siblingIndex = siblingsOfParent.indexOf(node);
          
          const siblingCount = siblingsOfParent.length;
          const angleSpread = Math.PI * 0.8;
          const startAngle = -angleSpread / 2;
          const angleStep = siblingCount > 1 ? angleSpread / (siblingCount - 1) : 0;
          const angle = startAngle + siblingIndex * angleStep;
          
          const radius = 15 + depth * 8;
          
          const baseX = parentPos ? parentPos.x : 0;
          const baseY = parentPos ? parentPos.y : 0;
          
          const x = baseX + Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
          const y = baseY + Math.sin(angle) * radius + (Math.random() - 0.5) * 2;
          
          positions.set(node.id, { x, y, z });
        });
      }
    });

    return positions;
  }

  createLabelSprite(node) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.font = 'Bold 14px Arial';
    context.textAlign = 'center';
    
    let labelText = `<${node.tagName}>`;
    if (node.idAttribute) {
      labelText += ` #${node.idAttribute}`;
    } else if (node.className) {
      const firstClass = node.className.split(' ')[0];
      if (firstClass.length < 15) {
        labelText += ` .${firstClass}`;
      }
    }

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const textWidth = Math.min(context.measureText(labelText).width + 20, 240);
    context.roundRect(128 - textWidth/2, 5, textWidth, 30, 5);
    context.fill();

    context.fillStyle = '#ffffff';
    context.fillText(labelText, 128, 26);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(12, 3, 1);
    
    return sprite;
  }

  updateLabelsVisibility() {
    if (!this.nodeObjects) return;
    this.nodeObjects.forEach(obj => {
      if (obj.labelSprite) {
        obj.labelSprite.visible = this.showLabels;
      }
    });
  }

  addRadialConnectionLines(nodes, nodeMap, positions) {
    this.connectionLines = this.connectionLines || [];

    nodes.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId);
        const childPos = positions.get(node.id);
        const parentPos = positions.get(parent.id);
        
        if (childPos && parentPos) {
          const start = new THREE.Vector3(parentPos.x, parentPos.y, parentPos.z);
          const end = new THREE.Vector3(childPos.x, childPos.y, childPos.z);

          const midZ = (start.z + end.z) / 2;
          const controlPoint = new THREE.Vector3(
            (start.x + end.x) / 2,
            (start.y + end.y) / 2,
            midZ
          );

          const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
          const points = curve.getPoints(20);
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          
          const depthProgress = (node.depth || 0) / 10;
          const lineColor = new THREE.Color();
          lineColor.setHSL(0.6 + depthProgress * 0.2, 0.5, 0.5);
          
          const material = new THREE.LineBasicMaterial({ 
            color: lineColor,
            opacity: 0.4, 
            transparent: true 
          });
          const line = new THREE.Line(geometry, material);
          this.scene.add(line);
          this.connectionLines.push(line);
        }
      }
    });
  }

  getGeometryForNode(node) {
    const width = Math.max((node.position?.width || 50) / 30, 1.5);
    const height = Math.max((node.position?.height || 30) / 30, 1.5);
    const depth = 2;

    switch (this.renderMode) {
      case 'spheres':
        const radius = Math.max(width, height) / 2;
        return new THREE.SphereGeometry(radius, 16, 16);
      case 'lines':
        return new THREE.BoxGeometry(0.5, 0.5, depth);
      default:
        return new THREE.BoxGeometry(width, height, depth);
    }
  }

  async loadVisionSimScreenshot() {
    const urlInput = document.getElementById('visionSimUrlInput');
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!url) {
      alert('请输入目标网页 URL');
      return;
    }
    
    if (!this.isValidUrl(url)) {
      alert('请输入有效的 URL，例如 https://example.com');
      return;
    }

    const imageContainer = document.getElementById('simulationImageContainer');
    const demoWrapper = document.getElementById('demoContentWrapper');
    const sourceLabel = document.getElementById('simulationSourceLabel');
    const loadBtn = document.getElementById('loadVisionSimScreenshotBtn');
    
    const originalBtnText = loadBtn ? loadBtn.textContent : '加载截图';
    
    try {
      if (loadBtn) {
        loadBtn.disabled = true;
        loadBtn.textContent = '加载中...';
      }

      const response = await fetch('/api/accessibility/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '截图加载失败');
      }

      const data = await response.json();
      
      if (data.screenshotBase64) {
        if (imageContainer) {
          imageContainer.innerHTML = `<img src="${data.screenshotBase64}" class="screenshot-image" alt="页面截图">`;
          imageContainer.classList.remove('hidden');
        }
        if (demoWrapper) {
          demoWrapper.classList.add('hidden');
        }
        if (sourceLabel) {
          sourceLabel.textContent = `真实截图: ${url}`;
          sourceLabel.classList.add('is-screenshot');
        }
        
        this.currentScreenshotUrl = data.screenshotBase64;
        
        const activeBtn = document.querySelector('.sim-type-btn.active');
        if (activeBtn) {
          this.applyVisionSimulation(activeBtn.dataset.simType);
        }
      }

    } catch (error) {
      console.error('截图加载失败:', error);
      alert('截图加载失败: ' + error.message);
    } finally {
      if (loadBtn) {
        loadBtn.disabled = false;
        loadBtn.textContent = originalBtnText;
      }
    }
  }

  resetToDemoContent() {
    const imageContainer = document.getElementById('simulationImageContainer');
    const demoWrapper = document.getElementById('demoContentWrapper');
    const sourceLabel = document.getElementById('simulationSourceLabel');
    
    if (imageContainer) {
      imageContainer.classList.add('hidden');
      imageContainer.innerHTML = '';
    }
    if (demoWrapper) {
      demoWrapper.classList.remove('hidden');
    }
    if (sourceLabel) {
      sourceLabel.textContent = 'Demo 内容';
      sourceLabel.classList.remove('is-screenshot');
    }
    
    this.currentScreenshotUrl = null;
    
    const activeBtn = document.querySelector('.sim-type-btn.active');
    if (activeBtn) {
      this.applyVisionSimulation(activeBtn.dataset.simType);
    }
  }

  onMouseMove(event) {
    if (!this.camera || !this.renderer) return;

    const canvas = document.getElementById('topologyCanvas');
    const rect = canvas.getBoundingClientRect();
    
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onCanvasClick(event) {
    if (!this.camera || !this.renderer || this.isDragging) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = this.nodeObjects.map(obj => obj.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const nodeData = clickedMesh.userData.node;
      this.showNodeInfo(nodeData);
    }
  }

  showNodeInfo(node) {
    const panel = document.getElementById('topologyNodeInfo');
    if (!panel) return;

    const tagName = document.getElementById('nodeInfoTagName');
    const idAttr = document.getElementById('nodeInfoId');
    const className = document.getElementById('nodeInfoClass');
    const position = document.getElementById('nodeInfoPosition');
    const size = document.getElementById('nodeInfoSize');
    const semantic = document.getElementById('nodeInfoSemantic');
    const focusable = document.getElementById('nodeInfoFocusable');
    const text = document.getElementById('nodeInfoText');

    if (tagName) tagName.textContent = `<${node.tagName}>`;
    if (idAttr) idAttr.textContent = node.idAttribute || '-';
    if (className) className.textContent = node.className || '-';
    if (position) position.textContent = `(${Math.round(node.position.x)}, ${Math.round(node.position.y)})`;
    if (size) size.textContent = `${Math.round(node.position.width)} × ${Math.round(node.position.height)}`;
    if (semantic) semantic.textContent = node.isSemantic ? '是 ✅' : '否';
    if (focusable) focusable.textContent = node.accessibility?.isFocusable ? '是 ✅' : '否';
    if (text) text.textContent = node.textContent?.substring(0, 100) || '-';

    panel.classList.remove('hidden');
  }

  resetCamera() {
    if (!this.camera) return;
    this.camera.position.set(0, 50, 100);
    this.camera.lookAt(0, 0, 0);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    
    const container = document.getElementById('topologyCanvasContainer');
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 600;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.autoRotate && this.camera) {
      this.rotateCamera(0.005, 0);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  async analyzeScreenReaderPath() {
    const urlInput = document.getElementById('srUrlInput');
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!url) {
      alert('请输入目标网页 URL');
      return;
    }
    
    if (!this.isValidUrl(url)) {
      alert('请输入有效的 URL，例如 https://example.com');
      return;
    }

    const llmConfig = this.getLLMConfig();

    this.hideSection('srResultsSection');
    this.showSection('srLoadingSection');

    try {
      const response = await fetch('/api/accessibility/screen-reader/path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, llmConfig })
      });

      if (!response.ok) {
        throw new Error('屏幕阅读器路径分析失败');
      }

      const data = await response.json();
      
      this.hideSection('srLoadingSection');
      this.showSRResults(data);

    } catch (error) {
      this.hideSection('srLoadingSection');
      console.error('屏幕阅读器路径分析失败:', error);
      alert('分析失败: ' + error.message);
    }
  }

  showSRResults(data) {
    this.showSection('srResultsSection');

    const focusOrderList = document.getElementById('srFocusOrderList');
    const semanticLandmarks = document.getElementById('srSemanticLandmarks');
    const srAnalysisContent = document.getElementById('srAnalysisContent');

    if (data.screenReaderAnalysis && data.screenReaderAnalysis.focusableNodes) {
      const nodes = data.screenReaderAnalysis.focusableNodes;
      if (focusOrderList) {
        focusOrderList.innerHTML = nodes.map((node, i) => `
          <div class="focus-order-item">
            <span class="focus-order-num">${i + 1}</span>
            <span class="focus-order-tag">${node.tagName}</span>
            <span class="focus-order-text">${node.textContent?.substring(0, 50) || node.idAttribute || '无文本'}</span>
          </div>
        `).join('');
      }
    }

    if (data.screenReaderAnalysis && data.screenReaderAnalysis.semanticNodes) {
      const nodes = data.screenReaderAnalysis.semanticNodes;
      if (semanticLandmarks) {
        semanticLandmarks.innerHTML = nodes.map((node, i) => `
          <div class="semantic-item">
            <span class="semantic-icon">🏷️</span>
            <span class="semantic-tag">${node.tagName}</span>
            <span class="semantic-detail">
              ${node.idAttribute ? `#${node.idAttribute}` : ''} 
              ${node.className ? `.${node.className.split(' ')[0]}` : ''}
            </span>
          </div>
        `).join('');
      }
    }

    if (data.screenReaderAnalysis && data.screenReaderAnalysis.analysis && srAnalysisContent) {
      srAnalysisContent.innerHTML = this.formatMarkdown(data.screenReaderAnalysis.analysis);
    }
  }

  switchArcadeMode(mode) {
    const visionSimSection = document.getElementById('visionSimSection');
    const focusParkourSection = document.getElementById('focusParkourSection');
    
    if (visionSimSection) {
      visionSimSection.classList.toggle('hidden', mode !== 'vision-sim');
    }
    if (focusParkourSection) {
      focusParkourSection.classList.toggle('hidden', mode !== 'focus-parkour');
    }

    if (mode === 'vision-sim') {
      this.applyVisionSimulation('normal');
    }
  }

  applyVisionSimulation(type) {
    const preview = document.getElementById('visionPreview');
    const severitySlider = document.getElementById('visionSeverity');
    const severity = severitySlider ? severitySlider.value / 100 : 1;
    
    if (!preview) return;

    let filter = '';
    let overlayStyles = {};

    switch (type) {
      case 'normal':
        filter = 'none';
        break;
      case 'protanopia':
        filter = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='protanopia'%3E%3CfeColorMatrix type='matrix' values='0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0'/%3E%3C/filter%3E%3C/svg%3E#protanopia")`;
        break;
      case 'deuteranopia':
        filter = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='deuteranopia'%3E%3CfeColorMatrix type='matrix' values='0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0'/%3E%3C/filter%3E%3C/svg%3E#deuteranopia")`;
        break;
      case 'tritanopia':
        filter = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='tritanopia'%3E%3CfeColorMatrix type='matrix' values='0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0'/%3E%3C/filter%3E%3C/svg%3E#tritanopia")`;
        break;
      case 'achromatopsia':
        filter = `grayscale(${1 * severity})`;
        break;
      case 'low-vision':
        filter = `blur(${3 * severity}px) contrast(${1 - 0.3 * severity})`;
        break;
      case 'glaucoma':
        filter = 'none';
        overlayStyles = {
          background: `radial-gradient(circle, transparent ${30 * (1 - severity)}%, rgba(0,0,0,${0.9 * severity}) 100%)`
        };
        break;
      case 'macular':
        filter = 'none';
        overlayStyles = {
          background: `radial-gradient(circle, rgba(0,0,0,${0.9 * severity}) 0%, transparent ${40 * severity}%)`
        };
        break;
    }

    preview.style.filter = filter;
    
    let overlay = preview.querySelector('.vision-overlay');
    if (Object.keys(overlayStyles).length > 0) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'vision-overlay';
        preview.appendChild(overlay);
      }
      Object.assign(overlay.style, overlayStyles);
    } else if (overlay) {
      overlay.remove();
    }
  }

  startParkourGame() {
    this.resetParkourGame();
    this.parkourState.isPlaying = true;

    const gameStartMessage = document.getElementById('gameStartMessage');
    const parkourTargets = document.getElementById('parkourTargets');
    const parkourInstructions = document.getElementById('parkourInstructions');

    if (gameStartMessage) gameStartMessage.classList.add('hidden');
    if (parkourTargets) parkourTargets.classList.remove('hidden');
    if (parkourInstructions) parkourInstructions.classList.add('hidden');

    this.generateParkourLevel();
    this.startTimer();

    document.addEventListener('keydown', (e) => this.handleParkourKeydown(e));
  }

  generateParkourLevel() {
    const targetsContainer = document.getElementById('parkourTargets');
    if (!targetsContainer) return;

    targetsContainer.innerHTML = '';
    this.parkourState.targetOrder = [];
    this.parkourState.currentTargetIndex = 0;

    const targetCount = 3 + this.parkourState.level;
    const targetColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#fdcb6e', '#6c5ce7', '#e17055', '#00b894'];

    for (let i = 0; i < targetCount; i++) {
      const target = document.createElement('button');
      target.className = 'parkour-target';
      target.tabIndex = 0;
      target.dataset.order = i;
      target.style.background = targetColors[i % targetColors.length];
      target.innerHTML = `<span class="target-number">${i + 1}</span>`;
      
      target.addEventListener('focus', () => {
        target.classList.add('focused');
      });
      
      target.addEventListener('blur', () => {
        target.classList.remove('focused');
      });

      target.addEventListener('click', (e) => {
        if (!this.parkourState.isPlaying) return;
        e.preventDefault();
        this.handleTargetClick(target);
      });

      targetsContainer.appendChild(target);
      this.parkourState.targetOrder.push(target);
    }

    for (let i = 0; i < this.parkourState.level * 2; i++) {
      const decoy = document.createElement('button');
      decoy.className = 'parkour-target decoy';
      decoy.tabIndex = 0;
      decoy.style.background = '#666';
      decoy.style.opacity = '0.5';
      decoy.innerHTML = '⚡';
      targetsContainer.appendChild(decoy);
    }

    this.highlightCurrentTarget();
  }

  handleTargetClick(target) {
    const order = parseInt(target.dataset.order);
    
    if (order === this.parkourState.currentTargetIndex) {
      target.classList.add('completed');
      target.disabled = true;
      this.parkourState.score += 100;
      this.updateParkourStats();
      
      this.parkourState.currentTargetIndex++;
      
      if (this.parkourState.currentTargetIndex >= this.parkourState.targetOrder.length) {
        this.completeLevel();
      } else {
        this.highlightCurrentTarget();
      }
    } else {
      target.classList.add('wrong');
      setTimeout(() => target.classList.remove('wrong'), 300);
      this.parkourState.score = Math.max(0, this.parkourState.score - 10);
      this.updateParkourStats();
    }
  }

  handleParkourKeydown(e) {
    if (!this.parkourState.isPlaying) return;

    if (e.key === 'Enter' || e.key === ' ') {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.classList.contains('parkour-target') && !activeElement.classList.contains('decoy')) {
        e.preventDefault();
        this.handleTargetClick(activeElement);
      }
    }
  }

  highlightCurrentTarget() {
    this.parkourState.targetOrder.forEach((target, i) => {
      target.classList.toggle('active', i === this.parkourState.currentTargetIndex);
    });
  }

  completeLevel() {
    this.stopTimer();
    
    const timeBonus = Math.max(0, 1000 - this.parkourState.time * 10);
    this.parkourState.score += timeBonus;
    
    alert(`🎉 恭喜完成第 ${this.parkourState.level} 关！\n得分: ${this.parkourState.score}\n用时: ${this.parkourState.time}秒`);
    
    this.parkourState.level++;
    this.updateParkourStats();
    
    setTimeout(() => {
      this.generateParkourLevel();
      this.startTimer();
    }, 1000);
  }

  resetParkourGame() {
    this.stopTimer();
    this.parkourState = {
      level: 1,
      score: 0,
      time: 0,
      isPlaying: false,
      timerInterval: null,
      targetOrder: [],
      currentTargetIndex: 0
    };

    const gameStartMessage = document.getElementById('gameStartMessage');
    const parkourTargets = document.getElementById('parkourTargets');
    const parkourInstructions = document.getElementById('parkourInstructions');

    if (gameStartMessage) gameStartMessage.classList.remove('hidden');
    if (parkourTargets) parkourTargets.classList.add('hidden');
    if (parkourInstructions) parkourInstructions.classList.remove('hidden');

    this.updateParkourStats();
    document.removeEventListener('keydown', (e) => this.handleParkourKeydown(e));
  }

  startTimer() {
    this.parkourState.timerInterval = setInterval(() => {
      this.parkourState.time++;
      this.updateParkourStats();
    }, 1000);
  }

  stopTimer() {
    if (this.parkourState.timerInterval) {
      clearInterval(this.parkourState.timerInterval);
      this.parkourState.timerInterval = null;
    }
  }

  updateParkourStats() {
    const levelEl = document.getElementById('parkourLevel');
    const scoreEl = document.getElementById('parkourScore');
    const timeEl = document.getElementById('parkourTime');

    if (levelEl) levelEl.textContent = this.parkourState.level;
    if (scoreEl) scoreEl.textContent = this.parkourState.score;
    if (timeEl) timeEl.textContent = `${this.parkourState.time}s`;
  }

  async testLLMConnection() {
    const config = this.getLLMConfig();
    const statusDiv = document.getElementById('connectionStatus');
    const statusDisplay = document.getElementById('connectionStatusDisplay');

    if (!config) {
      alert('请先填写 API Key 和 Model Name');
      return;
    }

    if (statusDiv) {
      statusDiv.classList.remove('hidden');
      statusDiv.className = 'connection-status testing';
      statusDiv.innerHTML = `
        <div class="loading-spinner" style="display: inline-block; margin-right: 8px;">
          <div class="spinner" style="width: 20px; height: 20px;"></div>
        </div>
        正在测试连接...
      `;
    }

    try {
      const response = await fetch('/api/accessibility/llm/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          modelName: config.modelName
        })
      });

      const result = await response.json();
      
      if (statusDiv) {
        statusDiv.className = `connection-status ${result.valid ? 'success' : 'error'}`;
        statusDiv.innerHTML = result.valid 
          ? `✅ ${result.message}` 
          : `❌ ${result.message}`;
      }

      if (statusDisplay) {
        statusDisplay.textContent = result.valid ? '连接成功' : '连接失败';
        statusDisplay.className = `status-value ${result.valid ? 'status-success' : 'status-error'}`;
      }

    } catch (error) {
      if (statusDiv) {
        statusDiv.className = 'connection-status error';
        statusDiv.innerHTML = `❌ 连接测试失败: ${error.message}`;
      }
      if (statusDisplay) {
        statusDisplay.textContent = '连接失败';
        statusDisplay.className = 'status-value status-error';
      }
    }
  }

  saveCurrentConfig() {
    const baseUrlEl = document.getElementById('configBaseUrl');
    const apiKeyEl = document.getElementById('configApiKey');
    const modelNameEl = document.getElementById('configModelName');

    const config = {
      baseUrl: baseUrlEl ? baseUrlEl.value.trim() : '',
      apiKey: apiKeyEl ? apiKeyEl.value.trim() : '',
      modelName: modelNameEl ? modelNameEl.value.trim() : ''
    };

    this.saveConfig(config);
    this.updateCurrentConfigDisplay();
    
    alert('配置已保存！');
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
