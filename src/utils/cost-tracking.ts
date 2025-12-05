export class CostTracker {
  private costs: Map<string, number> = new Map();

  addCost(layer: string, amount: number): void {
    const current = this.costs.get(layer) || 0;
    this.costs.set(layer, current + amount);
  }

  getCost(layer: string): number {
    return this.costs.get(layer) || 0;
  }

  getTotalCost(): number {
    return Array.from(this.costs.values()).reduce((sum, cost) => sum + cost, 0);
  }

  getCostBreakdown(): Record<string, number> {
    return Object.fromEntries(this.costs.entries());
  }

  reset(): void {
    this.costs.clear();
  }
}
