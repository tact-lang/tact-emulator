export function isCoverageEnabled() {
    let cov = typeof globalThis !== 'undefined' && (globalThis as any).__ton_coverage__;
    return !!cov;
}

export function reportCoverage(logs: string) {
    let cov = typeof globalThis !== 'undefined' && (globalThis as any).__ton_coverage__;
    if (cov) {
        cov(logs);
    }
}