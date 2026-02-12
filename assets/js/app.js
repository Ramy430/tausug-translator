// ===== TAUSUG TRANSLATOR v2.0 =====
// Preserving the Tausug language, one word at a time
// ========================================

// ===== GLOBAL VARIABLES =====
let dictionary = JSON.parse(localStorage.getItem('tausugDictionary')) || {
    // Default dictionary (fallback if GitHub fails)
    "bay": "house",
    "kaun": "eat",
    "inum": "drink",
    "tāu": "person",
    "iskul": "school",
    "tug": "sleep",
    "bassa'": "read",
    "dakula'": "big",
    "asibi'": "small",
    "maisug": "brave"
};

let recentTranslations = JSON.parse(localStorage.getItem('recentTranslations')) || [];

// ===== SENTENCES DATABASE - LOADED FROM JSON =====
let sentenceDatabase = {};

// ===== SENTENCES LOADING FUNCTION =====
async function loadSentencesFromGitHub() {
    try {
        const response = await fetch('json/sentences.json');
        
        if (!response.ok) {
            throw new Error(`Failed to load sentences: ${response.status}`);
        }
        
        const data = await response.json();
        sentenceDatabase = data.sentences || {};
        console.log(`✅ Loaded example sentences for ${Object.keys(sentenceDatabase).length} words`);
    } catch (error) {
        console.log('⚠️ Could not load sentences. Using empty database.', error.message);
        sentenceDatabase = {};
    }
}

// ===== DICTIONARY FUNCTIONS =====
function saveDictionary() {
    localStorage.setItem('tausugDictionary', JSON.stringify(dictionary));
    updateStats();
}

function saveRecentTranslations() {
    localStorage.setItem('recentTranslations', JSON.stringify(recentTranslations));
}

function updateStats() {
    const statsDiv = document.getElementById('dictionaryStats');
    const wordCount = Object.keys(dictionary).length;
    
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${wordCount}</span>
                <span class="stat-label">Total Words</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${new Date().toLocaleDateString()}</span>
                <span class="stat-label">Last Updated</span>
            </div>
        `;
    }
}

function addWordToDictionary(tausug, english) {
    dictionary[tausug.toLowerCase()] = english;
    saveDictionary();
    return true;
}

// ===== GITHUB LOADING FUNCTION =====
async function loadDictionaryFromGitHub() {
    try {
        const response = await fetch('json/dictionary.json');
        
        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Combine all categories
        let combinedDict = {};
        
        if (data.nouns) combinedDict = { ...combinedDict, ...data.nouns };
        if (data.verbs) combinedDict = { ...combinedDict, ...data.verbs };
        if (data.adjectives) combinedDict = { ...combinedDict, ...data.adjectives };
        if (data.pronouns) combinedDict = { ...combinedDict, ...data.pronouns };
        if (data.numbers) combinedDict = { ...combinedDict, ...data.numbers };
        if (data.phrases) combinedDict = { ...combinedDict, ...data.phrases };
        
        // Add other categories if they exist
        for (const key in data) {
            if (!['metadata', 'nouns', 'verbs', 'adjectives', 'pronouns', 'numbers', 'phrases'].includes(key) && 
                typeof data[key] === 'object') {
                combinedDict = { ...combinedDict, ...data[key] };
            }
        }
        
        // Merge with existing dictionary
        if (Object.keys(combinedDict).length > 0) {
            dictionary = { ...combinedDict, ...dictionary };
            saveDictionary();
            console.log(`✅ Loaded ${Object.keys(combinedDict).length} words from community dictionary`);
            
            // Show success message
            updateStatus(`Loaded ${Object.keys(combinedDict).length} words from community!`, 'success');
        } else {
            console.log('⚠️ No words found in community dictionary');
        }
        
    } catch (error) {
        console.log('⚠️ Using local dictionary only. Error:', error.message);
        updateStatus('Using your personal dictionary', 'info');
    }
}

// ===== GITHUB SUBMISSION FUNCTION =====
function submitWordToGitHub(tausug, english) {
    const category = document.getElementById('posSelect').value;
    const categoryName = document.getElementById('posSelect').selectedOptions[0].text;
    
    const issueData = {
        title: `New Word: ${tausug} = ${english}`,
        body: `## 🏝️ Tausug Word Submission
        
**Tausug:** ${tausug}
**English:** ${english}
**Category:** ${categoryName}
**Submitted:** ${new Date().toLocaleDateString()}
**Time:** ${new Date().toLocaleTimeString()}

---
*Submitted via [Tausug Translator](https://ramy430.github.io/tausug-translator/)*`,
        labels: ["word-submission", category]
    };
    
    const githubUrl = `https://github.com/ramy430/tausug-translator/issues/new?title=${encodeURIComponent(issueData.title)}&body=${encodeURIComponent(issueData.body)}`;
    window.open(githubUrl, '_blank');
    return githubUrl;
}

// ===== EXPORT FOR GITHUB FUNCTION =====
function exportForGitHub() {
    const data = {
        metadata: {
            submitted: new Date().toISOString(),
            totalWords: Object.keys(dictionary).length,
            version: "2.0",
            source: "Tausug Translator User Dictionary"
        },
        dictionary: dictionary
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `tausug-dictionary-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    
    updateStatus(`Dictionary exported (${Object.keys(dictionary).length} words)`, 'success');
}

// ===== TRANSLATION FUNCTIONS =====
function translateWord(word, fromLang, toLang) {
    if (!word.trim()) return "";
    
    // Store original for return if needed
    const originalWord = word;
    word = word.toLowerCase().trim();
    
    // PRESERVE apostrophes - only remove ending punctuation for lookup
    // This keeps the apostrophe in the word but also tries without trailing punctuation
    const cleanWord = word.replace(/[.,!?;:]$/, ''); // REMOVED apostrophe from this regex!
    
    let actualFromLang = fromLang;
    
    // Auto-detect language
    if (fromLang === 'auto') {
        // Check dictionary with original word (preserves apostrophe)
        if (dictionary[word]) {
            actualFromLang = 'tsg';
        } else {
            const isEnglish = Object.values(dictionary).some(value => 
                value.toLowerCase() === word
            );
            actualFromLang = isEnglish ? 'en' : 'tsg';
        }
    }
    
    // Translate Tausug → English
    if (actualFromLang === 'tsg' && toLang === 'en') {
        // Priority: 
        // 1. Exact match (with apostrophe)
        // 2. Match without trailing punctuation (but still with apostrophe)
        return dictionary[word] || dictionary[cleanWord] || "Word not found in dictionary";
    }
    
    // Translate English → Tausug
    else if (actualFromLang === 'en' && toLang === 'tsg') {
        for (let [tausug, english] of Object.entries(dictionary)) {
            if (english.toLowerCase() === word) {
                return tausug;
            }
        }
        return "Word not found in dictionary";
    }
    
    return originalWord;
}

// ✅ HELPER FUNCTION - Place this AFTER translateWord, not inside it
function testWord(word) {
    console.log(`🔍 Testing: "${word}"`);
    const result = translateWord(word, 'tsg', 'en');
    console.log(`✅ Result: "${result}"`);
    return result;
}

function speakText(text, language) {
    if (!text || text === "Word not found in dictionary") return;
    
    if ('speechSynthesis' in window) {
        // Stop any current speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'tsg' ? 'fil-PH' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Sorry, your browser does not support text-to-speech.');
    }
}

// ===== RECENT TRANSLATIONS FUNCTIONS =====
function saveRecentTranslation(original, translated, fromLang, toLang) {
    if (!original.trim() || translated === "Word not found in dictionary") return;
    
    const translation = {
        original: original.substring(0, 50),
        translation: translated.substring(0, 50),
        sourceLang: fromLang === 'tsg' ? 'Tausug' : fromLang === 'en' ? 'English' : 'Auto',
        targetLang: toLang === 'tsg' ? 'Tausug' : 'English',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    recentTranslations.unshift(translation);
    
    // Keep only last 5 items
    if (recentTranslations.length > 5) {
        recentTranslations = recentTranslations.slice(0, 5);
    }
    
    saveRecentTranslations();
    updateRecentTranslationsUI();
}

function updateRecentTranslationsUI() {
    const container = document.getElementById('recentTranslations');
    if (!container) return;
    
    if (recentTranslations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="far fa-comment-alt"></i>
                <p>No recent translations yet</p>
            </div>
        `;
        return;
    }
    
    let translationsHTML = '';
    recentTranslations.forEach((item) => {
        translationsHTML += `
            <div class="translation-item">
                <div class="translation-text">
                    <strong>${item.original}</strong> → ${item.translation}
                </div>
                <div class="translation-meta">
                    ${item.sourceLang} → ${item.targetLang}
                    <span class="translation-time">${item.timestamp}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = translationsHTML;
}

// ===== SENTENCES FUNCTIONS =====
function showExampleSentences(word) {
    const popup = document.getElementById('sentencesPopup');
    const overlay = document.getElementById('sentencesOverlay');
    const content = document.getElementById('sentencesContent');
    
    word = word.toLowerCase().trim();
    content.innerHTML = '';
    
    if (sentenceDatabase[word] && sentenceDatabase[word].length > 0) {
        const sentencesList = document.createElement('div');
        sentencesList.className = 'sentences-list';
        
        sentenceDatabase[word].forEach((sentence, index) => {
            const sentenceItem = document.createElement('div');
            sentenceItem.className = 'sentence-item';
            sentenceItem.innerHTML = `
                <div class="sentence-tausug">
                    <strong>${index + 1}.</strong> ${sentence.tausug}
                </div>
                <div class="sentence-english">
                    <strong>English:</strong> ${sentence.english}
                </div>
                <div class="sentence-pronunciation">
                    <strong>Pronunciation:</strong> ${sentence.pronunciation}
                </div>
            `;
            sentencesList.appendChild(sentenceItem);
        });
        
        content.appendChild(sentencesList);
    } else {
        content.innerHTML = `
            <div class="empty-sentences">
                <i class="fas fa-comments"></i>
                <h4>No example sentences found</h4>
                <p>We don't have sentences for "<strong>${word}</strong>" yet.</p>
                <p style="margin-top: 15px;">Try these: bay, kaun, inum, iskul, tāu, bassa', magsukul</p>
            </div>
        `;
    }
    
    popup.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSentencesPopup() {
    const popup = document.getElementById('sentencesPopup');
    const overlay = document.getElementById('sentencesOverlay');
    
    popup.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== EXPORT/IMPORT FUNCTIONS =====
function exportDictionary() {
    const dataStr = JSON.stringify(dictionary, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `tausug-dictionary-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    
    updateStatus(`Dictionary exported (${Object.keys(dictionary).length} words)`, 'success');
}

function importDictionary(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let importedDict = JSON.parse(e.target.result);
            
            // Handle different JSON structures
            if (importedDict.dictionary) {
                importedDict = importedDict.dictionary;
            }
            
            if (typeof importedDict === 'object') {
                const wordCount = Object.keys(importedDict).length;
                dictionary = { ...dictionary, ...importedDict };
                saveDictionary();
                updateStatus(`Imported ${wordCount} new words!`, 'success');
            }
        } catch (error) {
            updateStatus('Error: Invalid JSON format', 'error');
        }
    };
    reader.readAsText(file);
}

// ===== UTILITY FUNCTIONS =====
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    
    statusElement.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    statusElement.className = `status-message ${type}`;
}

// ===== RESET TO DEFAULT DICTIONARY =====
function resetToDefaultDictionary() {
    dictionary = {
        "bay": "house",
        "kaun": "eat",
        "inum": "drink",
        "tāu": "person",
        "iskul": "school",
        "tug": "sleep",
        "bassa'": "read",
        "dakula'": "big",
        "asibi'": "small",
        "maisug": "brave"
    };
    
    saveDictionary();
    updateStatus('Reset to default dictionary', 'success');
}

// ===== MAIN INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🌍 Tausug Translator v2.0 starting...');
    
    // Load community dictionary from GitHub
    await loadDictionaryFromGitHub();
    console.log(`✅ Dictionary ready: ${Object.keys(dictionary).length} words`);
    
    // Load sentences from GitHub
    await loadSentencesFromGitHub();
    
    // Initialize UI
    updateStats();
    updateRecentTranslationsUI();
    
    // ===== EVENT LISTENERS =====
    const elements = {
        translateBtn: document.getElementById('translateBtn'),
        addWordBtn: document.getElementById('addWordBtn'),
        clearBtn: document.getElementById('clearBtn'),
        copyBtn: document.getElementById('copyBtn'),
        speakBtn: document.getElementById('speakBtn'),
        sentencesBtn: document.getElementById('sentencesBtn'),
        swapBtn: document.getElementById('swapBtn'),
        viewSourceBtn: document.getElementById('viewSourceBtn'),
        exportBtn: document.getElementById('exportBtn'),
        exportForGitHubBtn: document.getElementById('exportForGitHubBtn'),
        importBtn: document.getElementById('importBtn'),
        updateSourceBtn: document.getElementById('updateSourceBtn'),
        suggestWordBtn: document.getElementById('suggestWordBtn'),
        loadDictionaryBtn: document.getElementById('loadDictionaryBtn'),
        downloadJSONBtn: document.getElementById('downloadJSONBtn'),
        dictionaryExportBtn: document.getElementById('dictionaryExportBtn'),
        dictionaryImportBtn: document.getElementById('dictionaryImportBtn'),
        closeSentencesBtn: document.getElementById('closeSentencesBtn'),
        sentencesOverlay: document.getElementById('sentencesOverlay'),
        inputText: document.getElementById('inputText'),
        outputText: document.getElementById('outputText'),
        sourceLang: document.getElementById('sourceLang'),
        targetLang: document.getElementById('targetLang'),
        inputCharCount: document.getElementById('inputCharCount'),
        newWord: document.getElementById('newWord'),
        newMeaning: document.getElementById('newMeaning')
    };
    
    // Check if critical elements exist
    if (!elements.translateBtn) {
        console.error('❌ Critical: Translate button not found!');
        return;
    }
    
    // A. Translate Button
    elements.translateBtn.addEventListener('click', function() {
        const input = elements.inputText.value;
        const fromLang = elements.sourceLang.value;
        const toLang = elements.targetLang.value;
        
        if (!input.trim()) {
            alert('Please enter text to translate');
            return;
        }
        
        const result = translateWord(input, fromLang, toLang);
        elements.outputText.value = result;
        
        updateStatus(`Translated: ${input.substring(0, 30)}${input.length > 30 ? '...' : ''} → ${result.substring(0, 30)}${result.length > 30 ? '...' : ''}`);
        
        const actualFromLang = fromLang === 'auto' ? 
            (dictionary[input.toLowerCase()] ? 'tsg' : 'en') : fromLang;
        saveRecentTranslation(input, result, actualFromLang, toLang);
    });
    
    // B. Add Word Button
    if (elements.addWordBtn) {
        elements.addWordBtn.addEventListener('click', function() {
            const tausug = elements.newWord?.value;
            const english = elements.newMeaning?.value;
            
            if (tausug && english) {
                if (dictionary[tausug.toLowerCase()]) {
                    if (!confirm(`"${tausug}" already exists. Overwrite?`)) {
                        return;
                    }
                }
                
                if (addWordToDictionary(tausug, english)) {
                    updateStatus(`Added: ${tausug} = ${english}`, 'success');
                    if (elements.newWord) elements.newWord.value = '';
                    if (elements.newMeaning) elements.newMeaning.value = '';
                    if (elements.inputText) elements.inputText.focus();
                }
            } else {
                alert('Please enter both Tausug and English words');
            }
        });
    }
    
    // C. Clear Button
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', function() {
            if (elements.inputText) elements.inputText.value = '';
            if (elements.outputText) elements.outputText.value = '';
            if (elements.inputCharCount) elements.inputCharCount.textContent = '0';
            updateStatus('Cleared all text');
        });
    }
    
    // D. Copy Button
    if (elements.copyBtn) {
        elements.copyBtn.addEventListener('click', async function() {
            const output = elements.outputText;
            if (!output?.value.trim() || output.value === "Word not found in dictionary") {
                alert('No text to copy');
                return;
            }
            
            try {
                await navigator.clipboard.writeText(output.value);
                alert('✅ Copied to clipboard!');
            } catch (err) {
                // Fallback
                output.select();
                document.execCommand('copy');
                alert('✅ Copied to clipboard!');
            }
        });
    }
    
    // E. Speak Button
    if (elements.speakBtn) {
        elements.speakBtn.addEventListener('click', function() {
            const output = elements.outputText;
            const toLang = elements.targetLang?.value || 'en';
            
            if (!output?.value.trim() || output.value === "Word not found in dictionary") {
                alert('No text to speak');
                return;
            }
            
            speakText(output.value, toLang);
        });
    }
    
    // F. Sentences Button
    if (elements.sentencesBtn) {
        elements.sentencesBtn.addEventListener('click', function() {
            const input = elements.inputText?.value.trim() || '';
            const output = elements.outputText?.value.trim() || '';
            
            let wordToShow = '';
            
            if (input && output !== "Word not found in dictionary") {
                if (elements.sourceLang?.value === 'tsg' || elements.sourceLang?.value === 'auto') {
                    wordToShow = input.toLowerCase();
                } else {
                    wordToShow = output.toLowerCase();
                }
            }
            
            if (!wordToShow) {
                alert('Please translate a word first to see example sentences.');
                return;
            }
            
            showExampleSentences(wordToShow);
        });
    }
    
    // G. Character Counter
    if (elements.inputText) {
        elements.inputText.addEventListener('input', function() {
            if (elements.inputCharCount) {
                elements.inputCharCount.textContent = this.value.length;
            }
        });
    }
    
    // H. Swap Languages Button
    if (elements.swapBtn) {
        elements.swapBtn.addEventListener('click', function() {
            if (elements.sourceLang?.value === 'auto') {
                alert('Cannot swap when "Auto Detect" is selected');
                return;
            }
            
            // Swap language values
            const temp = elements.sourceLang.value;
            elements.sourceLang.value = elements.targetLang.value;
            elements.targetLang.value = temp;
            
            // Swap text
            const tempText = elements.inputText.value;
            elements.inputText.value = elements.outputText.value;
            elements.outputText.value = tempText;
            
            // Update character count
            if (elements.inputCharCount) {
                elements.inputCharCount.textContent = elements.inputText.value.length;
            }
        });
    }
    
    // I. View Source Button
    if (elements.viewSourceBtn) {
        elements.viewSourceBtn.addEventListener('click', function() {
            window.open('https://github.com/ramy430/tausug-translator', '_blank');
        });
    }
    
    // J. Export Button
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportDictionary);
    }
    
    // K. Export for GitHub Button
    if (elements.exportForGitHubBtn) {
        elements.exportForGitHubBtn.addEventListener('click', exportForGitHub);
    }
    
    // L. Import Button
    if (elements.importBtn) {
        elements.importBtn.addEventListener('click', function() {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', importDictionary);
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        });
    }
    
    // M. Update Source Button (Generate dictionary.js)
    if (elements.updateSourceBtn) {
        elements.updateSourceBtn.addEventListener('click', function() {
            const dataStr = JSON.stringify(dictionary, null, 2);
            const jsContent = `// Tausug Dictionary - Auto-generated\n// Total words: ${Object.keys(dictionary).length}\n// Generated: ${new Date().toLocaleString()}\n\nconst dictionary = ${dataStr};\n\nexport default dictionary;`;
            
            const dataUri = 'data:application/javascript;charset=utf-8,'+ encodeURIComponent(jsContent);
            const link = document.createElement('a');
            link.setAttribute('href', dataUri);
            link.setAttribute('download', 'dictionary.js');
            link.click();
            
            updateStatus('dictionary.js file generated', 'success');
        });
    }
    
    // N. Submit to GitHub Button
    if (elements.suggestWordBtn) {
        elements.suggestWordBtn.addEventListener('click', function() {
            const tausug = elements.newWord?.value;
            const english = elements.newMeaning?.value;
            
            if (tausug && english) {
                submitWordToGitHub(tausug, english);
                updateStatus('Submitted to GitHub!', 'success');
                if (elements.newWord) elements.newWord.value = '';
                if (elements.newMeaning) elements.newMeaning.value = '';
            } else {
                alert('Please enter both Tausug and English words');
            }
        });
    }
    
    // O. Load Dictionary Button
    if (elements.loadDictionaryBtn) {
        elements.loadDictionaryBtn.addEventListener('click', async function() {
            updateStatus('Loading community dictionary...', 'info');
            await loadDictionaryFromGitHub();
        });
    }
    
    // P. Download JSON Button
    if (elements.downloadJSONBtn) {
        elements.downloadJSONBtn.addEventListener('click', exportDictionary);
    }
    
    // Q. Dictionary Export Button
    if (elements.dictionaryExportBtn) {
        elements.dictionaryExportBtn.addEventListener('click', exportDictionary);
    }
    
    // R. Dictionary Import Button
    if (elements.dictionaryImportBtn) {
        elements.dictionaryImportBtn.addEventListener('click', function() {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', importDictionary);
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        });
    }
    
    // S. Close Sentences Button
    if (elements.closeSentencesBtn) {
        elements.closeSentencesBtn.addEventListener('click', closeSentencesPopup);
    }
    
    // T. Close Sentences Overlay
    if (elements.sentencesOverlay) {
        elements.sentencesOverlay.addEventListener('click', closeSentencesPopup);
    }
    
    // U. Escape Key to close popup
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSentencesPopup();
        }
    });
    
    // V. Ctrl+Enter to translate
    if (elements.inputText) {
        elements.inputText.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (elements.translateBtn) elements.translateBtn.click();
            }
        });
    }
    
    console.log('✅ Tausug Translator v2.0 ready!');
    console.log(`📚 Dictionary: ${Object.keys(dictionary).length} words`);
    console.log(`📖 Sentences: ${Object.keys(sentenceDatabase).length} words have examples`);
});
