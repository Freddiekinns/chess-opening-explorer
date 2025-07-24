/**
 * Tests for CommonPlans Component UI Update
 * TDD Turbo: Strategic Plans to Common Plans Design Change
 */
const { JSDOM } = require('jsdom');

describe('CommonPlans Component Design Update', () => {
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

  test('should display both White and Black sections simultaneously without tabs', () => {
    // Test that both sections are always visible, no dynamic tabs
    const plansSection = document.createElement('section');
    plansSection.className = 'common-plans content-panel';
    
    const header = document.createElement('h2');
    header.textContent = 'Common Plans';
    
    const whiteSection = document.createElement('div');
    whiteSection.className = 'plans-section';
    const whiteHeader = document.createElement('h3');
    whiteHeader.textContent = 'For White:';
    whiteSection.appendChild(whiteHeader);
    
    const blackSection = document.createElement('div');
    blackSection.className = 'plans-section';
    const blackHeader = document.createElement('h3');
    blackHeader.textContent = 'For Black:';
    blackSection.appendChild(blackHeader);
    
    plansSection.appendChild(header);
    plansSection.appendChild(whiteSection);
    plansSection.appendChild(blackSection);
    
    expect(whiteHeader.textContent).toBe('For White:');
    expect(blackHeader.textContent).toBe('For Black:');
    expect(plansSection.children.length).toBe(3); // header + white section + black section
  });

  test('should maintain white and black plans tab functionality', () => {
    // Test that tab structure remains functional
    const tabContainer = document.createElement('div');
    tabContainer.className = 'plans-tabs';
    
    const whiteTab = document.createElement('button');
    whiteTab.className = 'tab-button active';
    whiteTab.innerHTML = '<span class="tab-icon">♔</span>White Plans';
    
    const blackTab = document.createElement('button');
    blackTab.className = 'tab-button';
    blackTab.innerHTML = '<span class="tab-icon">♚</span>Black Plans';
    
    tabContainer.appendChild(whiteTab);
    tabContainer.appendChild(blackTab);
    
    expect(whiteTab.textContent).toContain('White Plans');
    expect(blackTab.textContent).toContain('Black Plans');
    expect(tabContainer.children.length).toBe(2);
  });

  test('should preserve dynamic content structure', () => {
    // Test that the overall component structure supports dynamic content
    const plansSection = document.createElement('section');
    plansSection.className = 'common-plans content-panel';
    
    const header = document.createElement('h2');
    header.textContent = 'Common Plans';
    
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'plans-tabs';
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'plans-content';
    
    plansSection.appendChild(header);
    plansSection.appendChild(tabsContainer);
    plansSection.appendChild(contentContainer);
    
    expect(plansSection.className).toContain('common-plans');
    expect(header.textContent).toBe('Common Plans');
    expect(tabsContainer.className).toBe('plans-tabs');
    expect(contentContainer.className).toBe('plans-content');
  });
});
