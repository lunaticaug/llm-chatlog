# LLM Chat Logger - Architecture Documentation

## File Structure Detail

### 1. content.js (Main Logic)
The core file containing all extraction and processing logic.

#### Structure Overview
```javascript
// Version info (lines 2-8)
const VERSION = 'v4.1.1';
const VERSION_DESC = 'Claude + ChatGPT 통합 지원 + Artifact 자동 다운로드';

// Global variables (lines 10-28)
- DEBUG flag
- currentSite reference
- OS detection
- Content type definitions

// Main sections:
1. Utility Functions (lines 30-108)
2. Extraction Functions (lines 110-489)
3. Content Processing (lines 490-650)
4. Markdown Generation (lines 650-1120)
5. Artifact Handling (lines 1120-1250)
6. File Saving (lines 1250-1350)
7. Event Handlers (lines 1350-1400)
```

#### Key Data Structures

**Q&A Pair Object**:
```javascript
{
  index: 1,                    // Question number
  human: "User's question",    // User input
  contents: [                  // Assistant response parts
    {
      type: 'thinking',        // Content type
      content: '...'           // Actual content
    },
    {
      type: 'answer',
      content: '...'
    }
  ],
  artifacts: [                 // Attached artifacts (v4.1.1)
    {
      id: 'artifact_123',
      title: 'Code.py',
      subtitle: 'Python code',
      element: DOMElement
    }
  ]
}
```

**Content Types**:
```javascript
CONTENT_TYPES = {
  THINKING: 'thinking',   // Claude thinking blocks
  ANSWER: 'answer',       // Main response
  ARTIFACT: 'artifact',   // Code/document artifacts
  CANVAS: 'canvas',       // ChatGPT canvas (planned)
  RESEARCH: 'research',   // Deep research (planned)
  SEARCH: 'search',       // Web search results
  TOOL: 'tool'           // Tool usage
}
```

### 2. sites.js (Platform Configuration)

#### Configuration Structure
```javascript
SITES = {
  claude: {
    name: 'Claude',
    domain: 'claude.ai',
    
    // DOM selectors (priority order)
    selectors: [
      { type: 'xpath', value: '...', description: '...' },
      { type: 'css', value: '...', description: '...' }
    ],
    
    // Message extraction pattern
    pattern: {
      type: 'sequential-pairs',  // Extraction method
      userCheck: 'button',       // User message identifier
      increment: 2               // Skip pattern
    },
    
    // Special elements handling
    special: {
      thinking: { /* config */ },
      artifacts: { /* config */ },
      citations: 'selector'
    },
    
    // UI text patterns to remove
    uiPatterns: [ /* regex patterns */ ],
    
    // Content extraction settings
    extraction: { /* detailed settings */ }
  },
  
  chatgpt: { /* similar structure */ }
}
```

#### Platform Detection
- Automatic based on `window.location.hostname`
- Returns site configuration object
- Falls back to null for unsupported sites

### 3. keywords.js (Language Processing)

#### Korean Language Processing
```javascript
KOREAN_FILTERS = {
  // Stopwords to exclude
  stopWords: ['있다', '없다', ...],
  
  // Baseline frequency thresholds
  baselineFrequency: {
    '사용자': 3,  // Expected 3 times per Q&A
    '클로드': 3,
    // ...
  },
  
  // Korean particles to remove
  particles: ['에서는', '에서도', ...],
  
  // Verb/adjective endings
  verbEndings: ['하고', '하는', ...]
}
```

## Extraction Flow Detail

### Phase 1: Platform Detection
```
1. detectCurrentSite() checks hostname
2. Loads platform-specific configuration
3. Sets global currentSite reference
```

### Phase 2: Container Location
```
1. Try XPath selectors first (faster, more precise)
2. Fall back to CSS selectors
3. Return first matching container
```

### Phase 3: Message Extraction

#### Claude Pattern (sequential-pairs)
```
1. Get all direct child DIVs
2. Process pairs (div[0]=user, div[1]=assistant)
3. Skip system messages (no edit button)
4. Extract thinking blocks separately
5. Process answer content
6. Detect artifacts
```

#### ChatGPT Pattern (data-testid)
```
1. Find all [data-testid^="conversation-turn-"]
2. Check .sr-only for role identification
3. Extract nested div content
4. Handle tables and code blocks
5. Process formatting
```

### Phase 4: Content Processing

#### Two-Phase Processing (v3.1.9 approach)
```
Phase 1: Collect nodes without DOM modification
- Traverse DOM tree
- Identify node types
- Preserve original order
- Store references

Phase 2: Process collected nodes
- Apply transformations
- Convert to markdown
- Handle special elements
- Maintain structure
```

#### Thinking Block Handling
```
1. Detect by class: .transition-all.duration-400
2. Check if expanded or collapsed
3. Extract summary text
4. Extract full content if available
5. Format with indentation
```

### Phase 5: Markdown Generation

#### Full Conversation Format
```markdown
# {title}

## Metadata
- Date: {date}
- Q&A Count: {count}
- Version: {version}

## Q1: {question}

### 💭 Thinking
{thinking content}

### 💬 Answer
{answer content}

## Q2: ...
```

#### Questions-Only Format
```markdown
# Questions from {title}

## Q1
{question}

## Q2
{question}
```

## Error Handling

### Error Codes
- **001**: Container not found
- **002**: Unknown pattern type
- **003**: Extraction exception
- **004**: No Q&A pairs extracted
- **005**: Save operation error

### Recovery Strategies
1. Multiple selector fallbacks
2. Graceful degradation (partial extraction)
3. User notification via toast
4. Console logging for debugging

## Performance Optimizations

### DOM Operations
- Minimize reflows by cloning nodes
- Batch DOM queries
- Use XPath when possible (faster)
- Cache selector results

### Memory Management
- Process one Q&A at a time
- Clear references after use
- Avoid storing full DOM trees
- Use text content when possible

### String Operations
- Use native methods over regex when possible
- Compile regex patterns once
- Avoid repeated string concatenation
- Use template literals for formatting

## Extension Lifecycle

### Initialization
```
1. Script injection via manifest
2. Platform detection
3. Event listener registration
4. Debug mode check
```

### User Interaction
```
1. Keyboard shortcut (Cmd/Ctrl+S)
2. Extract conversation
3. Generate markdown
4. Create download links
5. Auto-click for download
6. Show success toast
```

### Cleanup
```
1. Revoke object URLs
2. Remove temporary elements
3. Clear references
4. Reset state
```

## Chrome Extension APIs Used

### Manifest V3 Features
- `content_scripts`: Auto-injection
- `permissions`: downloads, storage
- `host_permissions`: Platform access

### Runtime APIs
- `document.evaluate()`: XPath queries
- `document.querySelector()`: CSS selection
- `Blob`: File creation
- `URL.createObjectURL()`: Download links
- `chrome.downloads`: File saving (indirect)