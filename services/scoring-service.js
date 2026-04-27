class ScoringService {
  calculateScore(axeResults) {
    const { violations, passes, incomplete } = axeResults;
    
    const impactWeights = {
      critical: 10,
      serious: 5,
      moderate: 2,
      minor: 1
    };
    
    let totalPenalty = 0;
    let maxPossiblePenalty = 0;
    
    violations.forEach(violation => {
      const weight = impactWeights[violation.impact] || 1;
      const nodeCount = violation.nodes.length;
      const penalty = weight * nodeCount;
      totalPenalty += penalty;
      
      const maxWeight = impactWeights.critical;
      maxPossiblePenalty += maxWeight * nodeCount;
    });
    
    incomplete.forEach(item => {
      const weight = 0.5;
      const nodeCount = item.nodes.length;
      totalPenalty += weight * nodeCount;
      maxPossiblePenalty += impactWeights.critical * nodeCount;
    });
    
    if (maxPossiblePenalty === 0) {
      return {
        score: 100,
        grade: 'A+',
        color: '#28a745',
        message: '完美！未发现无障碍问题。'
      };
    }
    
    const penaltyRatio = totalPenalty / maxPossiblePenalty;
    let rawScore = 100 - (penaltyRatio * 100);
    
    rawScore = Math.max(0, Math.min(100, rawScore));
    
    const score = Math.round(rawScore * 10) / 10;
    
    const { grade, color, message } = this.getGrade(score);
    
    const breakdown = {
      violations: violations.length,
      critical: violations.filter(v => v.impact === 'critical').length,
      serious: violations.filter(v => v.impact === 'serious').length,
      moderate: violations.filter(v => v.impact === 'moderate').length,
      minor: violations.filter(v => v.impact === 'minor').length,
      incomplete: incomplete.length
    };
    
    return {
      score,
      grade,
      color,
      message,
      breakdown,
      details: {
        totalPenalty,
        maxPossiblePenalty,
        penaltyRatio: (penaltyRatio * 100).toFixed(2) + '%'
      }
    };
  }
  
  getGrade(score) {
    if (score >= 95) {
      return {
        grade: 'A+',
        color: '#28a745',
        message: '优秀！页面无障碍合规性非常好。'
      };
    } else if (score >= 90) {
      return {
        grade: 'A',
        color: '#28a745',
        message: '很好！页面无障碍合规性良好。'
      };
    } else if (score >= 80) {
      return {
        grade: 'B',
        color: '#ffc107',
        message: '良好，但有一些需要改进的地方。'
      };
    } else if (score >= 70) {
      return {
        grade: 'C',
        color: '#fd7e14',
        message: '一般，存在较多无障碍问题需要修复。'
      };
    } else if (score >= 60) {
      return {
        grade: 'D',
        color: '#dc3545',
        message: '较差，需要立即关注无障碍问题。'
      };
    } else {
      return {
        grade: 'F',
        color: '#dc3545',
        message: '不合格，存在严重的无障碍问题。'
      };
    }
  }
  
  getScoreColor(score) {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  }
}

module.exports = new ScoringService();
