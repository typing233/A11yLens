const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

class DOMTreeService {
  constructor() {
    this.browser = null;
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

  async extractDOMTree(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setViewport({ width: 1280, height: 800 });
      
      console.log(`正在加载页面以提取 DOM 树: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      const domTree = await page.evaluate(() => {
        const visited = new Set();
        
        function getNodeColor(element) {
          const tagName = element.tagName.toLowerCase();
          const colors = {
            'html': '#1e3a5f',
            'head': '#2d4a6f',
            'body': '#3d5a7f',
            'header': '#ff6b6b',
            'nav': '#4ecdc4',
            'main': '#45b7d1',
            'section': '#96ceb4',
            'article': '#ffeaa7',
            'aside': '#dfe6e9',
            'footer': '#636e72',
            'div': '#74b9ff',
            'p': '#a29bfe',
            'span': '#fd79a8',
            'a': '#e17055',
            'img': '#00b894',
            'button': '#fdcb6e',
            'input': '#e84393',
            'form': '#0984e3',
            'ul': '#6c5ce7',
            'ol': '#a29bfe',
            'li': '#fd79a8',
            'h1': '#e74c3c',
            'h2': '#e67e22',
            'h3': '#f39c12',
            'h4': '#f1c40f',
            'h5': '#2ecc71',
            'h6': '#3498db',
            'table': '#9b59b6',
            'tr': '#8e44ad',
            'td': '#9b59b6',
            'th': '#e91e63',
            'video': '#ff5722',
            'audio': '#ff9800',
            'canvas': '#00bcd4',
            'svg': '#8bc34a',
            'script': '#607d8b',
            'style': '#9e9e9e',
            'link': '#03a9f4',
            'meta': '#009688',
            'title': '#e91e63'
          };
          return colors[tagName] || '#b2bec3';
        }

        function getElementInfo(element, depth = 0, parentId = null) {
          if (!element || visited.has(element)) return null;
          visited.add(element);

          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          const id = `node-${Math.random().toString(36).substr(2, 9)}`;
          
          const children = [];
          const childNodes = Array.from(element.children);
          
          childNodes.forEach((child, index) => {
            const childInfo = getElementInfo(child, depth + 1, id);
            if (childInfo) {
              childInfo.index = index;
              children.push(childInfo);
            }
          });

          const isVisible = 
            rect.width > 0 && 
            rect.height > 0 && 
            computedStyle.display !== 'none' &&
            computedStyle.visibility !== 'hidden' &&
            element.offsetParent !== null;

          const ariaRoles = [];
          if (element.getAttribute('role')) {
            ariaRoles.push(element.getAttribute('role'));
          }
          if (element.hasAttribute('aria-hidden')) {
            ariaRoles.push(`aria-hidden: ${element.getAttribute('aria-hidden')}`);
          }
          if (element.hasAttribute('aria-label')) {
            ariaRoles.push(`aria-label: ${element.getAttribute('aria-label')}`);
          }

          const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'figure', 'figcaption', 'mark', 'time'];
          const isSemantic = semanticTags.includes(element.tagName.toLowerCase());

          const accessibilityInfo = {
            hasAlt: element.tagName.toLowerCase() === 'img' ? !!element.getAttribute('alt') : null,
            hasLabel: element.tagName.toLowerCase() === 'input' ? !!(element.getAttribute('aria-label') || element.getAttribute('id') && document.querySelector(`label[for="${element.getAttribute('id')}"]`)) : null,
            tabIndex: element.hasAttribute('tabindex') ? parseInt(element.getAttribute('tabindex')) : null,
            isFocusable: element.tabIndex >= 0 || ['a', 'button', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase()),
            ariaRoles
          };

          return {
            id,
            parentId,
            index: 0,
            tagName: element.tagName.toLowerCase(),
            className: element.className || '',
            idAttribute: element.id || '',
            textContent: element.textContent?.substring(0, 100) || '',
            depth,
            color: getNodeColor(element),
            
            position: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            },
            
            style: {
              display: computedStyle.display,
              position: computedStyle.position,
              zIndex: computedStyle.zIndex === 'auto' ? 0 : parseInt(computedStyle.zIndex) || 0,
              opacity: parseFloat(computedStyle.opacity) || 1,
              backgroundColor: computedStyle.backgroundColor,
              color: computedStyle.color
            },
            
            accessibility: accessibilityInfo,
            isSemantic,
            isVisible,
            
            childrenCount: children.length,
            children
          };
        }

        const root = getElementInfo(document.documentElement, 0, null);
        
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY
        };

        const allNodes = [];
        function flatten(node) {
          if (!node) return;
          const { children, ...nodeWithoutChildren } = node;
          allNodes.push(nodeWithoutChildren);
          if (children) {
            children.forEach(flatten);
          }
        }
        flatten(root);

        return {
          root,
          viewport,
          allNodes,
          totalNodes: allNodes.length,
          timestamp: Date.now()
        };
      });

      await page.close();
      
      return {
        success: true,
        url,
        ...domTree
      };

    } catch (error) {
      try {
        await page.close();
      } catch (e) {}
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new DOMTreeService();
