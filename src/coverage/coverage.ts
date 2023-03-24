export function isCoverageEnabled() {
    let cov = (global as any).__ton_coverage__;
    return !!cov;
}

export function reportCoverage(logs: string) {
    let cov = (global as any).__ton_coverage__;
    if (cov) {
        cov(logs);
    }
}