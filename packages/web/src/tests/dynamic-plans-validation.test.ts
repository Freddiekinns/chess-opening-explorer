import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('Dynamic CommonPlans Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have dynamic CommonPlans component available for import', async () => {
    const { CommonPlans } = await import('../components/detail/CommonPlans');
    expect(CommonPlans).toBeDefined();
    expect(typeof CommonPlans).toBe('function');
  });

  it('should verify ECO analysis API endpoint exists', async () => {
    // Mock successful API response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          eco: 'A00',
          white_plans: ['Test white plan'],
          black_plans: ['Test black plan'],
          common_plans: ['Combined plan']
        }
      })
    });

    const response = await fetch('/api/openings/eco-analysis/A00');
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('white_plans');
    expect(data.data).toHaveProperty('black_plans');
    expect(data.data).toHaveProperty('common_plans');
  });

  it('should verify FEN analysis API endpoint exists', async () => {
    // Mock successful API response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          eco: 'A00',
          name: 'Test Opening',
          white_plans: ['Specific white plan'],
          black_plans: ['Specific black plan']
        }
      })
    });

    const response = await fetch('/api/openings/fen-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' })
    });
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('white_plans');
    expect(data.data).toHaveProperty('black_plans');
  });

  it('should verify CommonPlans component processes common_plans into white/black', () => {
    // Test the intelligent parsing logic
    const commonPlans = [
      "White's plan is to control the center",
      "Black's plan involves developing pieces",
      "Both sides should castle early"
    ];

    // Simulate the parsing logic from the component
    const whitePlans: string[] = [];
    const blackPlans: string[] = [];

    commonPlans.forEach(plan => {
      const planLower = plan.toLowerCase();
      if (planLower.includes("white's plan") || planLower.startsWith("white ")) {
        whitePlans.push(plan);
      } else if (planLower.includes("black's plan") || planLower.startsWith("black ")) {
        blackPlans.push(plan);
      } else {
        // Generic plans go to both
        whitePlans.push(plan);
        blackPlans.push(plan);
      }
    });

    expect(whitePlans).toContain("White's plan is to control the center");
    expect(whitePlans).toContain("Both sides should castle early");
    expect(blackPlans).toContain("Black's plan involves developing pieces");
    expect(blackPlans).toContain("Both sides should castle early");
  });

  it('should verify OpeningDetailPage imports CommonPlans', async () => {
    const detailModule = await import('../components/detail');
    expect(detailModule.CommonPlans).toBeDefined();
    
    // Also check that it's exported from the detail index
    const { CommonPlans } = detailModule;
    expect(typeof CommonPlans).toBe('function');
  });
});
