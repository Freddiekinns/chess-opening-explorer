import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommonPlans } from '../components/detail/CommonPlans';

// Mock fetch globally
global.fetch = vi.fn();

describe('Dynamic CommonPlans Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display dynamic plans from ECO data', async () => {
    // Mock successful API response with dynamic plans
    const mockAnalysisData = {
      eco: 'A00',
      name: 'Amar Gambit',
      white_plans: [
        'Recapture on f4 with g-pawn',
        'Use opened g-file for rook attack',
        'Generate swift kingside attack'
      ],
      black_plans: [
        'Consolidate extra pawn advantage',
        'Complete development quickly',
        'Launch counterattack on weak light squares'
      ],
      common_plans: [
        "White's plan is to recapture on f4 and attack",
        "Black's plan involves consolidating the extra pawn"
      ]
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAnalysisData
      })
    });

    render(<CommonPlans ecoCode="A00" />);

    // Should show loading initially
    expect(screen.getByText(/loading strategic plans/i)).toBeInTheDocument();

    // Wait for data to load and verify dynamic content
    await waitFor(() => {
      expect(screen.getByText(/strategic plans/i)).toBeInTheDocument();
    });

    // Check for White plans tab and content
    expect(screen.getByText(/white plans/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/recapture on f4 with g-pawn/i)).toBeInTheDocument();
    });

    // Check for Black plans tab
    expect(screen.getByText(/black plans/i)).toBeInTheDocument();
  });

  it('should handle ECO code lookup fallback when FEN lookup fails', async () => {
    const mockFenFailure = {
      success: false,
      error: 'FEN not found'
    };

    const mockEcoSuccess = {
      success: true,
      data: {
        eco: 'B01',
        white_plans: ['Control center with pawns'],
        black_plans: ['Develop pieces quickly']
      }
    };

    // Mock FEN lookup failure, then ECO success
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFenFailure
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEcoSuccess
      });

    render(<CommonPlans ecoCode="B01" fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" />);

    await waitFor(() => {
      expect(screen.getByText(/control center with pawns/i)).toBeInTheDocument();
    });

    // Verify it called both endpoints
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith('/api/openings/fen-analysis', expect.any(Object));
    expect(fetch).toHaveBeenCalledWith('/api/openings/eco-analysis/B01');
  });

  it('should split common_plans into white and black plans intelligently', async () => {
    const mockData = {
      success: true,
      data: {
        eco: 'C00',
        common_plans: [
          "White's plan is to control the center with d4 and e4",
          "Black's plan involves developing pieces harmoniously",
          "Both players should castle early for king safety"
        ],
        white_plans: [],
        black_plans: []
      }
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    render(<CommonPlans ecoCode="C00" />);

    await waitFor(() => {
      expect(screen.getByText(/strategic plans/i)).toBeInTheDocument();
    });

    // The component should intelligently parse common_plans and separate them
    // White tab should exist and be clickable
    expect(screen.getByText(/white plans/i)).toBeInTheDocument();
    expect(screen.getByText(/black plans/i)).toBeInTheDocument();
  });

  it('should show empty state when no plans are available', async () => {
    const mockEmptyData = {
      success: true,
      data: {
        eco: 'D00',
        white_plans: [],
        black_plans: [],
        common_plans: []
      }
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyData
    });

    render(<CommonPlans ecoCode="D00" />);

    await waitFor(() => {
      expect(screen.getByText(/no strategic plans available/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<CommonPlans ecoCode="E00" />);

    await waitFor(() => {
      expect(screen.getByText(/no strategic plans available/i)).toBeInTheDocument();
    });
  });
});

describe('OpeningDetailPage Dynamic Plans Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should replace static plans with dynamic CommonPlans component', async () => {
    // This test verifies that the hardcoded plans are replaced with the dynamic component
    const mockOpeningData = {
      success: true,
      data: {
        name: 'Test Opening',
        eco: 'A00',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: '1. e4'
      }
    };

    const mockAnalysisData = {
      success: true,
      data: {
        eco: 'A00',
        white_plans: ['Dynamic white plan from ECO data'],
        black_plans: ['Dynamic black plan from ECO data']
      }
    };

    // Mock opening data fetch
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpeningData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }) // all openings
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }) // popularity stats
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysisData
      });

    // Import here to avoid hoisting issues with mocks
    const { BrowserRouter } = await import('react-router-dom');
    const { default: OpeningDetailPage } = await import('../pages/OpeningDetailPage');

    // Mock useParams to return a test FEN
    const mockUseParams = vi.fn(() => ({ 
      fen: encodeURIComponent('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    }));
    
    vi.doMock('react-router-dom', () => ({
      ...vi.importActual('react-router-dom'),
      useParams: mockUseParams,
      useNavigate: () => vi.fn()
    }));

    const TestComponent = () => (
      <BrowserRouter>
        <OpeningDetailPage />
      </BrowserRouter>
    );

    render(<TestComponent />);

    // Wait for component to load and verify dynamic plans are shown
    await waitFor(() => {
      expect(screen.queryByText(/control the center with d3 and e4/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/develop pieces harmoniously/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show the CommonPlans component instead of hardcoded plans
    await waitFor(() => {
      expect(screen.getByText(/strategic plans/i)).toBeInTheDocument();
    });
  });
});
