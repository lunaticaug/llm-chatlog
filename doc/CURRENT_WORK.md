# Current Work - Artifact Download Feature (v4.1.1)

## Overview
The v4.1.1 development focuses on adding automatic artifact download functionality. When users save a conversation containing Claude artifacts (code files, documents), the extension should automatically trigger downloads for these artifacts.

## Current Status: ❌ Not Working

### What Works
- ✅ Artifact detection in DOM
- ✅ Artifact metadata extraction (title, subtitle)
- ✅ Artifact count in logs
- ✅ Indicator in markdown (`📎 [Artifact: filename]`)

### What Doesn't Work
- ❌ Opening artifact modal
- ❌ Finding menu button after opening
- ❌ Triggering download action
- ❌ Actual file download

## Technical Challenge

### The Problem
Claude's artifact UI uses a complex React-based structure with dynamic elements. The download functionality requires:
1. Clicking the artifact to open it
2. Finding the 3-dot menu button
3. Clicking the menu button
4. Finding and clicking the "Download" option

### Current Implementation (Broken)

```javascript
// content.js lines 1120-1250
async function downloadArtifacts(artifacts) {
  for (let artifact of artifacts) {
    // Step 1: Click artifact - WORKS
    artifact.clickableElement.click();
    await sleep(1500);
    
    // Step 2: Find menu button - FAILS
    let menuButton = null;
    const menuSelectors = [
      'button[aria-label*="menu"]',
      'button.absolute.right-2.top-2',
      // ... more selectors
    ];
    
    // Cannot find the button with any selector
    // The button might be in a shadow DOM or iframe
    
    // Step 3 & 4: Never reached
  }
}
```

### DOM Structure Issue

When artifact opens, the expected structure is:
```html
<div class="artifact-modal">
  <div class="header">
    <button class="copy-button">복사</button>
    <button aria-haspopup="menu">⋮</button> <!-- Can't find this -->
  </div>
  <iframe title="Claude 콘텐츠">
    <!-- Artifact content -->
  </iframe>
</div>
```

The menu button appears visually but cannot be selected programmatically.

## Investigation Notes (from 2025-07-29 log)

### Console Testing Results
```javascript
// These work when artifact is open:
document.querySelector('button span.whitespace-nowrap')
// Returns: <span>복사</span>

// These return null:
document.querySelector('button[aria-haspopup="menu"]')
document.querySelector('button.absolute.right-2.top-2')
```

### Hypotheses
1. **Shadow DOM**: Menu button might be in shadow DOM
2. **Iframe isolation**: Button could be inside the iframe
3. **Dynamic rendering**: Button might be added after a delay
4. **React portal**: Button rendered outside normal DOM tree
5. **Event delegation**: Click handlers might be on parent elements

## Alternative Approaches to Try

### Option 1: Direct API Interception
```javascript
// Intercept fetch/XHR requests
// Find artifact download endpoint
// Trigger download directly
```

### Option 2: Keyboard Simulation
```javascript
// After opening artifact:
// Simulate Tab key to focus menu
// Simulate Enter to open menu
// Simulate arrow keys to select Download
```

### Option 3: Browser Extension API
```javascript
// Use chrome.debugger API
// Inspect React component tree
// Find and trigger download method
```

### Option 4: Copy Content Approach
```javascript
// Click copy button (which works)
// Get clipboard content
// Create file from clipboard
// Trigger download manually
```

## Files Modified in v4.1.1

### content.js
- Added `CONTENT_TYPES.ARTIFACT` (line 23)
- Modified `extractAssistantContentTopDown()` to detect artifacts (lines 491-560)
- Added `extractArtifactInfo()` function (lines 615-650)
- Added `downloadArtifacts()` function (lines 1120-1250)
- Modified `saveConversation()` to call downloadArtifacts (line 1314)

### sites.js
- Expanded artifacts configuration (lines 37-44):
  ```javascript
  artifacts: {
    enabled: true,
    containerSelector: '.artifact-block-cell',
    titleSelector: '.leading-tight.text-sm',
    subtitleSelector: '.text-sm.text-text-300',
    iframeSelector: 'iframe[title="Claude 콘텐츠"]',
    indicatorFormat: '📎 [Artifact: {title}]'
  }
  ```

### manifest.json
- Updated version to 4.1.1
- Updated description to include "Artifact 자동 다운로드"

## Next Steps for Developer

### Immediate Priority
1. **Debug DOM Selection**
   - Use Chrome DevTools with artifact open
   - Try `$0` in console after selecting menu button
   - Check computed styles and event listeners
   - Look for React DevTools clues

2. **Test Alternative Selectors**
   ```javascript
   // Try these in console:
   document.querySelector('[role="button"]:not(.copy-button)')
   document.querySelectorAll('button')[1] // If copy is [0]
   document.querySelector('.header button:last-child')
   ```

3. **Investigate Event System**
   - Check if clicks need to be dispatched differently
   - Try MouseEvent with bubbles: true
   - Test with native click vs synthetic

### Fallback Plan
If direct download cannot work:
1. Add manual instructions in toast
2. Highlight artifacts in markdown
3. Create artifact summary file
4. Consider clipboard approach

## Testing Instructions

### Setup
1. Load extension from `llm-chat-logger` folder
2. Navigate to Claude.ai
3. Open conversation with artifacts

### Test Steps
1. Press Cmd/Ctrl+S to save
2. Check console for artifact detection logs
3. Observe artifact click attempt
4. Note where process fails
5. Check if markdown has artifact indicators

### Expected Logs
```
[LLM Logger] Assistant div 내 artifact 수: 1
[LLM Logger] Artifact 발견: filename.py (Python code)
[LLM Logger] 1개 artifacts 다운로드 시작
[LLM Logger] 1. Artifact 열기 클릭 완료
[LLM Logger] 메뉴 버튼을 찾을 수 없음  // Current failure point
```

## Resources

### Related Files
- `/Users/user/GitHub/_archived/llm-chatlog/_log/2025-07-29-artifact자동저장기능-추가중.txt`
- `/Users/user/GitHub/_archived/llm-chatlog/_sessions/2025-01-21_nextsession_v4.1.1_artifact_download.md`

### Similar Projects
None found that successfully download Claude artifacts programmatically.

### Claude UI Updates
Claude frequently updates their UI. Last known working selectors:
- Container: `.artifact-block-cell` (Still works)
- Title: `.leading-tight.text-sm` (Still works)
- Modal: Unknown (Never successfully selected)

## Questions for Code Review

1. **DOM Access**: Is there a better way to access dynamically rendered React components?
2. **Event Simulation**: Should we use native events vs synthetic events?
3. **Timing**: Are the sleep delays sufficient for React rendering?
4. **Architecture**: Should artifact download be a separate content script?
5. **Permissions**: Do we need additional Chrome permissions?

## Risk Assessment

### Current Impact
- No data loss (artifacts still accessible manually)
- Main functionality (conversation save) still works
- User inconvenience (manual download required)

### Potential Issues
- Repeated clicking might trigger rate limiting
- Failed attempts could break the UI
- Memory leaks from uncleaned references

### Mitigation
- Add try-catch blocks
- Implement retry limits
- Clean up event listeners
- Add user toggle for feature