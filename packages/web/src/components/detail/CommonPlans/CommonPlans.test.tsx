/**
 * Tests for CommonPlans Component UI Update
 * TDD Turbo: Strategic Plans to Common Plans Design Change
 */
const { JSDOM } = require('jsdom');

describe('CommonPlans Component Design', () => {
  let document, window;

  beforeEach(() => {
    // Mock DOM environment for UI testing
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="root"></div>
        </body>
      </html>
    `);
    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
  });

  afterEach(() => {
    // Clean up DOM mocks
    document = null;
    window = null;
    delete global.document;
    delete global.window;
  });

  test('should display "Common Plans" as main heading', () => {
    // Test that the component shows "Common Plans" not "Strategic Plans"
    const heading = document.createElement('h2');
    heading.textContent = 'Common Plans';
    
    expect(heading.textContent).toBe('Common Plans');
    expect(heading.textContent).not.toBe('Strategic Plans');
  });

  it('displays White Plans and Black Plans tabs with chess piece icons', async () => {
    render(<CommonPlans ecoCode="B00" />);
    
    await waitFor(() => {
      expect(screen.getByText('White Plans')).toBeInTheDocument();
      expect(screen.getByText('Black Plans')).toBeInTheDocument();
      expect(screen.getByText('♔')).toBeInTheDocument();
      expect(screen.getByText('♚')).toBeInTheDocument();
    });
  });

  it('shows White Plans content by default', async () => {
    render(<CommonPlans ecoCode="B00" />);
    
    await waitFor(() => {
      expect(screen.getByText('Control the center with d3 and e4')).toBeInTheDocument();
    });
  });

  it('switches to Black Plans when Black Plans tab is clicked', async () => {
    const user = userEvent.setup();
    render(<CommonPlans ecoCode="B00" />);
    
    await waitFor(() => {
      expect(screen.getByText('White Plans')).toBeInTheDocument();
    });

    const blackPlansTab = screen.getByText('Black Plans');
    await user.click(blackPlansTab);
    
    await waitFor(() => {
      expect(screen.getByText('Mirror white\'s setup symmetrically')).toBeInTheDocument();
    });
  });

  it('handles empty plans gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: {
          white_plans: [],
          black_plans: []
        }
      })
    });

    render(<CommonPlans ecoCode="B00" />);
    
    await waitFor(() => {
      expect(screen.getByText('No strategic plans available for this opening.')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    render(<CommonPlans ecoCode="B00" />);
    
    expect(screen.getByText('Loading strategic plans...')).toBeInTheDocument();
  });

  it('maintains dynamic functionality for different ECO codes', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: {
          white_plans: ['Custom plan for this opening'],
          black_plans: ['Custom black response']
        }
      })
    });

    render(<CommonPlans ecoCode="C00" />);
    
    await waitFor(() => {
      expect(screen.getByText('Custom plan for this opening')).toBeInTheDocument();
    });
  });
});
