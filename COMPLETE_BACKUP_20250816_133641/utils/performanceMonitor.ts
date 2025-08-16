// Performance Monitor for RiverBit Trading Interface
// Monitors AI module performance and overall application metrics

export interface PerformanceMetrics {
  componentLoadTime: number;
  aiResponseTime: number;
  memoryUsage: number;
  renderTime: number;
  timestamp: number;
}

export interface ComponentPerformance {
  name: string;
  mountTime: number;
  updateCount: number;
  lastUpdateTime: number;
  averageRenderTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private componentMetrics: Map<string, ComponentPerformance> = new Map();
  private startTime = performance.now();

  // Record AI module performance
  recordAIResponse(responseTime: number): void {
    const metric: PerformanceMetrics = {
      componentLoadTime: 0,
      aiResponseTime: responseTime,
      memoryUsage: this.getMemoryUsage(),
      renderTime: 0,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    this.cleanupOldMetrics();
  }

  // Record component performance
  recordComponentMount(componentName: string): number {
    const mountTime = performance.now();
    
    this.componentMetrics.set(componentName, {
      name: componentName,
      mountTime,
      updateCount: 0,
      lastUpdateTime: mountTime,
      averageRenderTime: 0
    });

    return mountTime;
  }

  // Record component update
  recordComponentUpdate(componentName: string, renderTime: number): void {
    const existing = this.componentMetrics.get(componentName);
    if (existing) {
      existing.updateCount++;
      existing.lastUpdateTime = performance.now();
      existing.averageRenderTime = 
        (existing.averageRenderTime * (existing.updateCount - 1) + renderTime) / existing.updateCount;
    }
  }

  // Get memory usage (if available)
  private getMemoryUsage(): number {
    // @ts-ignore
    if (performance.memory) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Clean up old metrics (keep last 100 entries)
  private cleanupOldMetrics(): void {
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }
  }

  // Get performance summary
  getPerformanceSummary(): {
    averageAIResponseTime: number;
    memoryUsage: number;
    slowestComponents: ComponentPerformance[];
    totalUptime: number;
    aiRequestCount: number;
  } {
    const aiMetrics = this.metrics.filter(m => m.aiResponseTime > 0);
    const averageAIResponseTime = aiMetrics.length > 0 
      ? aiMetrics.reduce((sum, m) => sum + m.aiResponseTime, 0) / aiMetrics.length 
      : 0;

    const slowestComponents = Array.from(this.componentMetrics.values())
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 5);

    return {
      averageAIResponseTime,
      memoryUsage: this.getMemoryUsage(),
      slowestComponents,
      totalUptime: (performance.now() - this.startTime) / 1000,
      aiRequestCount: aiMetrics.length
    };
  }

  // Get real-time performance data
  getRealTimeMetrics(): {
    fps: number;
    memoryTrend: number[];
    cpuUsage: number;
  } {
    const recent = this.metrics.slice(-10);
    const memoryTrend = recent.map(m => m.memoryUsage);
    
    return {
      fps: this.estimateFPS(),
      memoryTrend,
      cpuUsage: this.estimateCPUUsage()
    };
  }

  private estimateFPS(): number {
    // Simple FPS estimation based on render times
    const recentComponents = Array.from(this.componentMetrics.values())
      .filter(c => c.lastUpdateTime > Date.now() - 1000);
    
    return Math.min(60, recentComponents.length || 60);
  }

  private estimateCPUUsage(): number {
    // Rough CPU usage estimation
    const recentRenderTimes = Array.from(this.componentMetrics.values())
      .map(c => c.averageRenderTime)
      .filter(t => t > 0);
    
    if (recentRenderTimes.length === 0) return 0;
    
    const avgRenderTime = recentRenderTimes.reduce((a, b) => a + b, 0) / recentRenderTimes.length;
    return Math.min(100, (avgRenderTime / 16.67) * 100); // 16.67ms = 60fps
  }

  // Check for performance issues
  getPerformanceIssues(): string[] {
    const issues: string[] = [];
    const summary = this.getPerformanceSummary();

    if (summary.averageAIResponseTime > 2000) {
      issues.push('AI response time is slow (>2s)');
    }

    if (summary.memoryUsage > 150) {
      issues.push('High memory usage (>150MB)');
    }

    const slowComponents = summary.slowestComponents.filter(c => c.averageRenderTime > 50);
    if (slowComponents.length > 0) {
      issues.push(`Slow rendering components: ${slowComponents.map(c => c.name).join(', ')}`);
    }

    const realTime = this.getRealTimeMetrics();
    if (realTime.fps < 30) {
      issues.push('Low FPS detected (<30fps)');
    }

    return issues;
  }

  // Performance recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const issues = this.getPerformanceIssues();
    const summary = this.getPerformanceSummary();

    if (issues.some(i => i.includes('AI response'))) {
      recommendations.push('Consider implementing AI response caching');
      recommendations.push('Add loading states to improve perceived performance');
    }

    if (issues.some(i => i.includes('memory'))) {
      recommendations.push('Implement virtual scrolling for large lists');
      recommendations.push('Consider lazy loading for non-critical components');
    }

    if (issues.some(i => i.includes('rendering'))) {
      recommendations.push('Use React.memo for expensive components');
      recommendations.push('Implement debouncing for frequent updates');
    }

    if (summary.slowestComponents.length > 3) {
      recommendations.push('Consider code splitting for heavy components');
    }

    return recommendations;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance monitoring hook for React components
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = performance.now();

  React.useEffect(() => {
    performanceMonitor.recordComponentMount(componentName);
    
    return () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordComponentUpdate(componentName, renderTime);
    };
  }, [componentName]);

  return {
    recordAIResponse: (responseTime: number) => performanceMonitor.recordAIResponse(responseTime),
    getMetrics: () => performanceMonitor.getPerformanceSummary()
  };
};

// Performance debugging utilities
export const debugPerformance = () => {
  const summary = performanceMonitor.getPerformanceSummary();
  const issues = performanceMonitor.getPerformanceIssues();
  const recommendations = performanceMonitor.getOptimizationRecommendations();
  
  console.group('🔍 RiverBit Performance Analysis');
  console.log('📊 Summary:', summary);
  console.log('⚠️ Issues:', issues);
  console.log('💡 Recommendations:', recommendations);
  console.groupEnd();
  
  return { summary, issues, recommendations };
};