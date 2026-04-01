/**
 * Performance Monitoring Utility
 * Tracks and logs performance metrics for optimization
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Start measuring a performance metric
   */
  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  /**
   * End measuring and record the metric
   */
  measure(name: string, metadata?: Record<string, any>) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance mark '${name}' not found`);
      return;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    this.marks.delete(name);

    // Log if duration exceeds threshold (customizable)
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }

    return metric;
  }

  /**
   * Get average duration for a metric
   */
  getAverage(name: string): number {
    const matching = this.metrics.filter((m) => m.name === name);
    if (matching.length === 0) return 0;

    const total = matching.reduce((sum, m) => sum + m.duration, 0);
    return total / matching.length;
  }

  /**
   * Get all metrics for export/analysis
   */
  getMetrics() {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Export metrics as JSON
   */
  export() {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const metricNames = new Set(this.metrics.map((m) => m.name));
    const summary: Record<string, any> = {};

    metricNames.forEach((name) => {
      const matching = this.metrics.filter((m) => m.name === name);
      summary[name] = {
        count: matching.length,
        avgDuration: this.getAverage(name),
        minDuration: Math.min(...matching.map((m) => m.duration)),
        maxDuration: Math.max(...matching.map((m) => m.duration)),
      };
    });

    return summary;
  }

  /**
   * Log summary to console
   */
  logSummary() {
    console.table(this.getSummary());
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook for performance monitoring
 */
export function usePerformanceMonitor(operationName: string) {
  return {
    start: () => performanceMonitor.mark(operationName),
    end: (metadata?: Record<string, any>) =>
      performanceMonitor.measure(operationName, metadata),
  };
}

/**
 * Measure API call performance
 */
export async function measureApiCall<T>(
  name: string,
  apiFn: () => Promise<T>
): Promise<T> {
  performanceMonitor.mark(name);
  try {
    const result = await apiFn();
    performanceMonitor.measure(name, { status: 'success' });
    return result;
  } catch (error) {
    performanceMonitor.measure(name, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export default performanceMonitor;
