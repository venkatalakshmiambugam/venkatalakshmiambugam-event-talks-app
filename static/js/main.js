// Application State
let appState = {
    entries: [],
    selectedUpdate: null, // { date, type, contentText, link }
    filters: {
        type: 'all',
        searchQuery: ''
    },
    tweetLogs: []
};

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdatedText = document.getElementById('last-updated-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const typeFiltersContainer = document.getElementById('type-filters');
const feedContainer = document.getElementById('feed-container');
const feedList = document.getElementById('feed-list');
const feedLoading = document.getElementById('feed-loading');
const feedError = document.getElementById('feed-error');
const feedEmpty = document.getElementById('feed-empty');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');

// Composer DOM Elements
const selectedNoteDisplay = document.getElementById('selected-note-display');
const noSelectionMsg = document.getElementById('no-selection-msg');
const selectionDetails = document.getElementById('selection-details');
const selectedDate = document.getElementById('selected-date');
const selectedType = document.getElementById('selected-type');
const selectedPreview = document.getElementById('selected-preview');

const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const charProgressBar = document.getElementById('char-progress-bar');
const stylePresetSelect = document.getElementById('style-preset-select');
const tweetIntentBtn = document.getElementById('tweet-intent-btn');
const logTweetBtn = document.getElementById('log-tweet-btn');

// History Log DOM Elements
const logEmptyMsg = document.getElementById('log-empty-msg');
const logList = document.getElementById('log-list');
const logCount = document.getElementById('log-count');

// Helper to strip HTML tags
function stripHtml(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

// Format Date string
function formatDisplayDate(dateStr) {
    // If standard ISO or date string, format beautifully
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

// Parse Raw HTML Content of a feed entry into distinct updates
function parseUpdatesFromEntry(entry) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(entry.content, 'text/html');
    const updates = [];
    
    let currentType = 'Feature'; // Default
    let currentHtml = '';
    
    // Check if there are no H3 elements (unusual but possible fallback)
    const hasH3 = doc.querySelector('h3') !== null;
    
    if (!hasH3) {
        // Fallback: treat the entire body as a single feature update
        updates.push({
            id: entry.id + '_0',
            date: entry.title,
            type: 'Feature',
            contentHtml: entry.content,
            contentText: stripHtml(entry.content).trim(),
            link: entry.link
        });
        return updates;
    }
    
    let index = 0;
    for (let i = 0; i < doc.body.children.length; i++) {
        const child = doc.body.children[i];
        
        if (child.tagName === 'H3') {
            // If we have accumulated text for a previous type, push it
            if (currentHtml) {
                updates.push({
                    id: `${entry.id}_${index++}`,
                    date: entry.title,
                    type: currentType,
                    contentHtml: currentHtml,
                    contentText: stripHtml(currentHtml).trim(),
                    link: entry.link
                });
            }
            currentType = child.textContent.trim();
            currentHtml = '';
        } else {
            currentHtml += child.outerHTML;
        }
    }
    
    // Push the final update block
    if (currentHtml) {
        updates.push({
            id: `${entry.id}_${index++}`,
            date: entry.title,
            type: currentType,
            contentHtml: currentHtml,
            contentText: stripHtml(currentHtml).trim(),
            link: entry.link
        });
    }
    
    return updates;
}

// Fetch Notes from API
async function fetchReleaseNotes(forceRefresh = false) {
    // Show loading spinner
    refreshBtn.querySelector('.spinner-icon').classList.add('spinning');
    refreshBtn.disabled = true;
    
    if (forceRefresh) {
        feedLoading.style.display = 'flex';
        feedList.style.display = 'none';
        feedError.style.display = 'none';
        feedEmpty.style.display = 'none';
    }
    
    try {
        const response = await fetch(`/api/notes?refresh=${forceRefresh}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || "Failed to load feed");
        }
        
        // Save entries and parse each entry
        let parsedUpdates = [];
        data.entries.forEach(entry => {
            const entryUpdates = parseUpdatesFromEntry(entry);
            parsedUpdates = parsedUpdates.concat(entryUpdates);
        });
        
        appState.entries = parsedUpdates;
        
        // Update last updated timestamp
        lastUpdatedText.textContent = `Last updated: ${data.last_fetched}`;
        
        renderFeed();
        
    } catch (error) {
        console.error("Fetch error:", error);
        errorMessage.textContent = error.message || "Could not reach the backend server.";
        feedLoading.style.display = 'none';
        feedList.style.display = 'none';
        feedError.style.display = 'flex';
    } finally {
        refreshBtn.querySelector('.spinner-icon').classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Render Feed List based on Filters
function renderFeed() {
    feedLoading.style.display = 'none';
    
    const query = appState.filters.searchQuery.toLowerCase();
    const activeType = appState.filters.type;
    
    // Filter updates
    const filteredUpdates = appState.entries.filter(update => {
        // Filter by type
        if (activeType !== 'all') {
            if (update.type.toLowerCase() !== activeType) return false;
        }
        
        // Filter by search query
        if (query) {
            const textMatch = update.contentText.toLowerCase().includes(query);
            const typeMatch = update.type.toLowerCase().includes(query);
            const dateMatch = update.date.toLowerCase().includes(query);
            return textMatch || typeMatch || dateMatch;
        }
        
        return true;
    });
    
    if (filteredUpdates.length === 0) {
        feedList.style.display = 'none';
        feedEmpty.style.display = 'flex';
        return;
    }
    
    feedEmpty.style.display = 'none';
    feedList.innerHTML = '';
    
    // Group updates by date for presentation
    const grouped = {};
    filteredUpdates.forEach(update => {
        if (!grouped[update.date]) {
            grouped[update.date] = [];
        }
        grouped[update.date].push(update);
    });
    
    // Create DOM structure
    Object.keys(grouped).forEach(date => {
        const updatesForDate = grouped[date];
        const linkToFullNotes = updatesForDate[0].link; // Use link of first update
        
        const dateGroupCard = document.createElement('div');
        dateGroupCard.className = 'date-group-card';
        
        const header = document.createElement('div');
        header.className = 'date-group-header';
        header.innerHTML = `
            <h3 class="date-title">${formatDisplayDate(date)}</h3>
            <a href="${linkToFullNotes}" target="_blank" class="date-link" rel="noopener noreferrer">
                <span>Official Notes</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        `;
        dateGroupCard.appendChild(header);
        
        updatesForDate.forEach(update => {
            const updateBlock = document.createElement('div');
            updateBlock.className = 'update-block';
            if (appState.selectedUpdate && appState.selectedUpdate.id === update.id) {
                updateBlock.classList.add('selected');
            }
            
            // Map types to badges
            const typeLower = update.type.toLowerCase();
            let badgeClass = 'type-unknown';
            if (typeLower.includes('feature')) badgeClass = 'type-feature';
            else if (typeLower.includes('issue') || typeLower.includes('bug') || typeLower.includes('fix')) badgeClass = 'type-issue';
            else if (typeLower.includes('change') || typeLower.includes('updat')) badgeClass = 'type-changed';
            else if (typeLower.includes('deprecat')) badgeClass = 'type-deprecated';
            
            updateBlock.innerHTML = `
                <div class="update-header">
                    <span class="type-badge ${badgeClass}">${update.type}</span>
                </div>
                <div class="update-body">
                    ${update.contentHtml}
                </div>
                <div class="select-action-overlay">
                    <button class="btn btn-secondary btn-select-note" data-id="${update.id}">
                        <i class="fa-brands fa-x-twitter"></i> <span>Draft Tweet</span>
                    </button>
                </div>
            `;
            
            // Add click listeners to selecting the note
            const selectBtn = updateBlock.querySelector('.btn-select-note');
            
            // Allow clicking the card itself to select
            updateBlock.addEventListener('click', (e) => {
                // If user clicks a link inside the content, let them navigate normally
                if (e.target.tagName === 'A') return;
                
                selectUpdateForTweet(update);
                
                // Highlight active card visual state
                document.querySelectorAll('.update-block').forEach(b => b.classList.remove('selected'));
                updateBlock.classList.add('selected');
            });
            
            dateGroupCard.appendChild(updateBlock);
        });
        
        feedList.appendChild(dateGroupCard);
    });
    
    feedList.style.display = 'block';
}

// Select an update to Tweet
function selectUpdateForTweet(update) {
    appState.selectedUpdate = update;
    
    // Update active visual panel
    noSelectionMsg.style.display = 'none';
    selectionDetails.style.display = 'block';
    
    selectedDate.textContent = formatDisplayDate(update.date);
    selectedType.textContent = update.type;
    
    // Set Badge Color in Details Panel
    const typeLower = update.type.toLowerCase();
    selectedType.className = 'selection-type-badge';
    if (typeLower.includes('feature')) selectedType.classList.add('type-feature');
    else if (typeLower.includes('issue')) selectedType.classList.add('type-issue');
    else if (typeLower.includes('change')) selectedType.classList.add('type-changed');
    else if (typeLower.includes('deprecat')) selectedType.classList.add('type-deprecated');
    else selectedType.classList.add('type-unknown');
    
    // Slice description to keep details neat
    const cleanText = update.contentText;
    selectedPreview.textContent = cleanText.length > 120 ? cleanText.substring(0, 120) + '...' : cleanText;
    
    // Enable Form Fields
    tweetTextarea.disabled = false;
    stylePresetSelect.disabled = false;
    tweetIntentBtn.disabled = false;
    logTweetBtn.disabled = false;
    
    // Generate Tweet content with current style selection
    generateTweetContent();
}

// Format / Generate Tweet Text based on style
function generateTweetContent() {
    if (!appState.selectedUpdate) return;
    
    const update = appState.selectedUpdate;
    const style = stylePresetSelect.value;
    const dateFormatted = formatDisplayDate(update.date);
    const rawText = update.contentText;
    const link = update.link;
    
    // Pre-calculate URL length (Twitter translates links to 23 chars, but we can assume 23 chars overhead)
    // We should truncate rawText to fit within the character budget.
    // 280 max - URL length (23) - Style template characters
    const xLinkOverhead = 23;
    let templateOverhead = 0;
    let templateFn = null;
    
    switch (style) {
        case 'excited':
            // Template: "⚡ New BigQuery [Type]! ([Date])\n\n📢 [Content]\n\nDetails: [Link] #BigQuery #GoogleCloud #DataEngineering"
            templateOverhead = `⚡ New BigQuery ${update.type}! (${dateFormatted})\n\n📢 \n\nDetails:  #BigQuery #GoogleCloud #DataEngineering`.length + xLinkOverhead;
            templateFn = (content) => `⚡ New BigQuery ${update.type}! (${dateFormatted})\n\n📢 ${content}\n\nDetails: ${link} #BigQuery #GoogleCloud #DataEngineering`;
            break;
            
        case 'techie':
            // Template: "🚀 #BigQuery Update | [Date]\n\n🛠️ [Type]: [Content]\n\n🔗 [Link] #DataEngineering #Cloud #GCP"
            templateOverhead = `🚀 #BigQuery Update | ${dateFormatted}\n\n🛠️ ${update.type}: \n\n🔗  #DataEngineering #Cloud #GCP`.length + xLinkOverhead;
            templateFn = (content) => `🚀 #BigQuery Update | ${dateFormatted}\n\n🛠️ ${update.type}: ${content}\n\n🔗 ${link} #DataEngineering #Cloud #GCP`;
            break;
            
        case 'brief':
            // Template: "BigQuery [Type] ([Date]): [Content] [Link]"
            templateOverhead = `BigQuery ${update.type} (${dateFormatted}):  `.length + xLinkOverhead;
            templateFn = (content) => `BigQuery ${update.type} (${dateFormatted}): ${content} ${link}`;
            break;
            
        case 'professional':
        default:
            // Template: "Google Cloud BigQuery Update - [Date]:\n\n[Content]\n\nLink: [Link] #GCP #BigQuery"
            templateOverhead = `Google Cloud BigQuery Update - ${dateFormatted}:\n\n\n\nLink:  #GCP #BigQuery`.length + xLinkOverhead;
            templateFn = (content) => `Google Cloud BigQuery Update - ${dateFormatted}:\n\n${content}\n\nLink: ${link} #GCP #BigQuery`;
            break;
    }
    
    // Truncate the rawText if it exceeds the remaining budget
    const maxContentLength = 280 - templateOverhead;
    let truncatedContent = rawText;
    
    if (rawText.length > maxContentLength) {
        truncatedContent = rawText.substring(0, maxContentLength - 3).trim() + "...";
    }
    
    const tweetText = templateFn(truncatedContent);
    tweetTextarea.value = tweetText;
    
    // Update char counter
    updateCharacterCount();
}

// Update character count and progress bar
function updateCharacterCount() {
    const text = tweetTextarea.value;
    
    // Standard Twitter character count rule: URLs count as 23 characters
    // Simple regex to detect URLs in the tweet text and adjust character calculations
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let length = text.length;
    urls.forEach(url => {
        // Subtract URL length and add standard 23 chars
        length = length - url.length + 23;
    });
    
    charCount.textContent = length;
    
    // Percentage for progress bar
    const percent = Math.min((length / 280) * 100, 100);
    charProgressBar.style.width = `${percent}%`;
    
    // Color thresholds
    if (length > 280) {
        charProgressBar.style.backgroundColor = 'var(--color-issue)'; // Red
        charCount.style.color = 'var(--color-issue)';
        tweetIntentBtn.disabled = true;
    } else if (length > 250) {
        charProgressBar.style.backgroundColor = 'var(--color-changed)'; // Orange
        charCount.style.color = 'var(--color-changed)';
        tweetIntentBtn.disabled = false;
    } else {
        charProgressBar.style.backgroundColor = 'var(--color-feature)'; // Green
        charCount.style.color = 'var(--text-secondary)';
        tweetIntentBtn.disabled = false;
    }
    
    if (length === 0) {
        tweetIntentBtn.disabled = true;
        logTweetBtn.disabled = true;
    } else {
        logTweetBtn.disabled = false;
    }
}

// Action: Share on Twitter/X Web Intent
function openTwitterIntent() {
    const text = tweetTextarea.value;
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    
    // Automatically log this tweet as sent
    saveTweetToLog(text, "Posted");
}

// Action: Log Tweet Draft or Sent log
function saveTweetToLog(text, status = "Draft") {
    const logItem = {
        id: 'tweet_' + Date.now(),
        text: text,
        date: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: status
    };
    
    appState.tweetLogs.unshift(logItem); // Add to beginning
    
    // Save to localStorage
    localStorage.setItem('bq_tweet_logs', JSON.stringify(appState.tweetLogs));
    
    renderTweetLogs();
}

// Render Saved Tweets List
function renderTweetLogs() {
    const logs = appState.tweetLogs;
    logCount.textContent = logs.length;
    
    if (logs.length === 0) {
        logEmptyMsg.style.display = 'flex';
        logList.style.display = 'none';
        return;
    }
    
    logEmptyMsg.style.display = 'none';
    logList.innerHTML = '';
    
    logs.forEach(log => {
        const logItemDiv = document.createElement('div');
        logItemDiv.className = 'log-item';
        
        logItemDiv.innerHTML = `
            <div class="log-item-header">
                <span class="log-item-date">${log.date} (${log.status})</span>
                <div class="log-item-actions">
                    <button class="log-action-btn copy-btn" title="Copy to clipboard" data-text="${encodeURIComponent(log.text)}">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button class="log-action-btn delete-btn" title="Delete from logs" data-id="${log.id}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            <div class="log-item-body">${escapeHTML(log.text)}</div>
        `;
        
        // Copy event listener
        logItemDiv.querySelector('.copy-btn').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const textToCopy = decodeURIComponent(btn.getAttribute('data-text'));
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                
                // Temporary visual tooltip feedback
                const origHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--color-feature);"></i>';
                setTimeout(() => {
                    btn.innerHTML = origHtml;
                }, 1500);
            } catch (err) {
                console.error("Clipboard copy failed:", err);
            }
        });
        
        // Delete event listener
        logItemDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteTweetLog(id);
        });
        
        logList.appendChild(logItemDiv);
    });
    
    logList.style.display = 'flex';
}

// Delete Log item
function deleteTweetLog(id) {
    appState.tweetLogs = appState.tweetLogs.filter(log => log.id !== id);
    localStorage.setItem('bq_tweet_logs', JSON.stringify(appState.tweetLogs));
    renderTweetLogs();
}

// Escape HTML content for safe logging
function escapeHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Search input events
function handleSearchInput(e) {
    appState.filters.searchQuery = e.target.value;
    clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
    renderFeed();
}

// Type pills click events
function handleTypeFilter(e) {
    if (!e.target.classList.contains('filter-pill')) {
        // If they click on the child dot span, bubble up
        if (e.target.parentElement.classList.contains('filter-pill')) {
            e.target.parentElement.click();
        }
        return;
    }
    
    // Remove active class from all pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.remove('active');
    });
    
    // Add to active
    e.target.classList.add('active');
    appState.filters.type = e.target.getAttribute('data-type');
    
    renderFeed();
}

// Event Listeners Registration
function registerEventListeners() {
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search
    searchInput.addEventListener('input', handleSearchInput);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        appState.filters.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
    });
    
    // Filters
    typeFiltersContainer.addEventListener('click', handleTypeFilter);
    
    // Composer Textarea change
    tweetTextarea.addEventListener('input', updateCharacterCount);
    
    // Preset Selector change
    stylePresetSelect.addEventListener('change', generateTweetContent);
    
    // Action Buttons
    tweetIntentBtn.addEventListener('click', openTwitterIntent);
    logTweetBtn.addEventListener('click', () => {
        if (tweetTextarea.value) {
            saveTweetToLog(tweetTextarea.value, "Draft");
            
            // Show a visual success indication in the Composer Header status badge
            const statusBadge = document.getElementById('composer-status');
            statusBadge.textContent = 'Draft Saved!';
            statusBadge.style.color = '#fff';
            statusBadge.style.backgroundColor = 'var(--color-feature)';
            
            setTimeout(() => {
                statusBadge.textContent = 'Draft';
                statusBadge.style.color = 'var(--color-primary-light)';
                statusBadge.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
            }, 2000);
        }
    });
}

// Initialize Application
function init() {
    // Load Tweet Logs from localStorage
    const savedLogs = localStorage.getItem('bq_tweet_logs');
    if (savedLogs) {
        try {
            appState.tweetLogs = JSON.parse(savedLogs);
        } catch (e) {
            appState.tweetLogs = [];
        }
    }
    
    registerEventListeners();
    renderTweetLogs();
    
    // Initial fetch of data (defaults to cached if fresh, else fetches network)
    fetchReleaseNotes(false);
}

// Run init when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
