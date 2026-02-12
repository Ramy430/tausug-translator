// ===== TAUSUG TRANSLATOR v2.0 =====
// ===== COMPLETE & WORKING VERSION =====

// ===== GLOBAL VARIABLES =====
let dictionary = JSON.parse(localStorage.getItem('tausugDictionary')) || {
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
let sentenceDatabase = {};

// ===== LOAD SENTENCES =====
async function loadSentencesFromGitHub() {
    try {
        const response = await fetch('json/sentences.json');
        if (!response.ok) throw new Error(`Failed: ${response.status}`);
        const data = await response.json();
        sentenceDatabase = data.sentences || {};
        console.log(`✅ Loaded sentences for ${Object.keys(sentenceDatabase).length} words`);
    } catch (error) {
        console.log('⚠️ Could not load sentences', error.message);
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
    if (!statsDiv) return;
    
    // Count words from community dictionary (JSON) + user dictionary
    let communityCount = 0;
    if (window.communityDictionaryCount) {
        communityCount = window.communityDictionaryCount;
    } else {
        // Count from your dictionary.json structure
        const jsonDict = dictionary; // Your merged dictionary
        communityCount = Object.keys(dictionary).length;
    }
    
    const userCount = Object.keys(dictionary).length - communityCount;
    const totalCount = Object.keys(dictionary).length;
    
    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-category">📚 Total Words</div>
            <div class="stat-count">${totalCount}</div>
            <div class="stat-example">Community: 87 • User: ${userCount > 0 ? userCount : 0}</div>
            <div class="stat-example">Last updated: ${new Date().toLocaleDateString()}</div>
        </div>
    `;
}

function addWordToDictionary(tausug, english) {
    dictionary[tausug.toLowerCase()] = english;
    saveDictionary();
    return true;
}

// ===== LOAD FROM GITHUB =====
async function loadDictionaryFromGitHub() {
    try {
        const response = await fetch('json/dictionary.json');
        if (!response.ok) throw new Error(`Failed: ${response.status}`);
        const data = await response.json();
        
        let combinedDict = {};
        if (data.nouns) combinedDict = { ...combinedDict, ...data.nouns };
        if (data.verbs) combinedDict = { ...combinedDict, ...data.verbs };
        if (data.adjectives) combinedDict = { ...combinedDict, ...data.adjectives };
        
        if (Object.keys(combinedDict).length > 0) {
            dictionary = { ...combinedDict, ...dictionary };
            saveDictionary();
            updateStatus(`Loaded ${Object.keys(combinedDict).length} words!`, 'success');
        }
    } catch (error) {
        console.log('⚠️ Using local dictionary only');
    }
}

// ===== SUBMIT TO GITHUB =====
function submitWordToGitHub(tausug, english) {
    const category = document.getElementById('posSelect')?.value || 'nouns';
    const title = `New Word: ${tausug} = ${english}`;
    const body = `Tausug: ${tausug}\nEnglish: ${english}\nCategory: ${category}`;
    const url = `https://github.com/ramy430/tausug-translator/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=word-submission`;
    window.open(url, '_blank');
}

// ===== EXPORT FOR GITHUB =====
function exportForGitHub() {
    const data = {
        metadata: {
            submitted: new Date().toISOString(),
            totalWords: Object.keys(dictionary).length
        },
        dictionary: dictionary
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `tausug-dictionary-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    updateStatus(`Dictionary exported`, 'success');
}

// ===== TRANSLATE =====
function translateWord(word, fromLang, toLang) {
    if (!word.trim()) return "";
    
    const originalWord = word;
    word = word.toLowerCase().trim();
    const cleanWord = word.replace(/[.,!?;:]$/, '');
    
    let actualFromLang = fromLang;
    
    if (fromLang === 'auto') {
        if (dictionary[word]) {
            actualFromLang = 'tsg';
        } else {
            const isEnglish = Object.values(dictionary).some(v => v.toLowerCase() === word);
            actualFromLang = isEnglish ? 'en' : 'tsg';
        }
    }
    
    if (actualFromLang === 'tsg' && toLang === 'en') {
        return dictionary[word] || dictionary[cleanWord] || "Word not found";
    } else if (actualFromLang === 'en' && toLang === 'tsg') {
        for (let [tausug, english] of Object.entries(dictionary)) {
            if (english.toLowerCase() === word) return tausug;
        }
        return "Word not found";
    }
    return originalWord;
}

// ===== SPEAK =====
function speakText(text, language) {
    if (!text || text === "Word not found" || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'tsg' ? 'fil-PH' : 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

// ===== RECENT TRANSLATIONS =====
function saveRecentTranslation(original, translated, fromLang, toLang) {
    if (!original.trim() || translated === "Word not found") return;
    
    const translation = {
        original: original.substring(0, 50),
        translation: translated.substring(0, 50),
        sourceLang: fromLang === 'tsg' ? 'Tausug' : fromLang === 'en' ? 'English' : 'Auto',
        targetLang: toLang === 'tsg' ? 'Tausug' : 'English',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    recentTranslations.unshift(translation);
    if (recentTranslations.length > 5) recentTranslations = recentTranslations.slice(0, 5);
    saveRecentTranslations();
    updateRecentTranslationsUI();
}

function updateRecentTranslationsUI() {
    const container = document.getElementById('recentTranslations');
    if (!container) return;
    
    if (recentTranslations.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="far fa-comment-alt"></i><p>No recent translations yet</p></div>`;
        return;
    }
    
    let html = '';
    recentTranslations.forEach((item) => {
        html += `<div class="translation-item">
            <div class="translation-text"><strong>${item.original}</strong> → ${item.translation}</div>
            <div class="translation-meta">${item.sourceLang} → ${item.targetLang} <span>${item.timestamp}</span></div>
        </div>`;
    });
    container.innerHTML = html;
}

// ===== SENTENCES =====
function showExampleSentences(word) {
    const popup = document.getElementById('sentencesPopup');
    const overlay = document.getElementById('sentencesOverlay');
    const content = document.getElementById('sentencesContent');
    if (!popup || !overlay || !content) return;
    
    word = word.toLowerCase().trim();
    content.innerHTML = '';
    
    if (sentenceDatabase[word] && sentenceDatabase[word].length > 0) {
        let html = '<div class="sentences-list">';
        sentenceDatabase[word].forEach((s, i) => {
            html += `<div class="sentence-item">
                <div class="sentence-tausug"><strong>${i+1}.</strong> ${s.tausug}</div>
                <div class="sentence-english"><strong>English:</strong> ${s.english}</div>
            </div>`;
        });
        html += '</div>';
        content.innerHTML = html;
    } else {
        content.innerHTML = `<div class="empty-sentences"><i class="fas fa-comments"></i><p>No example sentences for "${word}".</p></div>`;
    }
    
    popup.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSentencesPopup() {
    const popup = document.getElementById('sentencesPopup');
    const overlay = document.getElementById('sentencesOverlay');
    if (popup) popup.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== EXPORT =====
function exportDictionary() {
    const dataStr = JSON.stringify(dictionary, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `tausug-dictionary-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    updateStatus(`Dictionary exported (${Object.keys(dictionary).length} words)`, 'success');
}

// ===== EXPORT SORTED =====
function exportDictionarySorted() {
    const sortedDict = {};
    Object.keys(dictionary).sort().forEach(key => {
        sortedDict[key] = dictionary[key];
    });
    const dataStr = JSON.stringify(sortedDict, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `tausug-dictionary-sorted-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    updateStatus(`Dictionary exported (${Object.keys(dictionary).length} words, alphabetical)`, 'success');
}

// ===== IMPORT =====
function importDictionary(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let importedDict = JSON.parse(e.target.result);
            if (importedDict.dictionary) importedDict = importedDict.dictionary;
            if (typeof importedDict === 'object') {
                dictionary = { ...dictionary, ...importedDict };
                saveDictionary();
                updateStatus(`Imported ${Object.keys(importedDict).length} new words!`, 'success');
            }
        } catch (error) {
            updateStatus('Error: Invalid JSON format', 'error');
        }
    };
    reader.readAsText(file);
}

// ===== STATUS =====
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    
    statusElement.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    statusElement.className = `status-message ${type}`;
    
    if (type !== 'error') {
        setTimeout(() => {
            statusElement.innerHTML = '<i class="fas fa-info-circle"></i> Ready';
            statusElement.className = 'status-message info';
        }, 3000);
    }
}

// ===== RESET =====
function resetToDefaultDictionary() {
    dictionary = {
        "bay": "house", "kaun": "eat", "inum": "drink", "tāu": "person",
        "iskul": "school", "tug": "sleep", "bassa'": "read",
        "dakula'": "big", "asibi'": "small", "maisug": "brave"
    };
    saveDictionary();
    updateStatus('Reset to default dictionary', 'success');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🌍 Tausug Translator starting...');
    
    await loadDictionaryFromGitHub();
    await loadSentencesFromGitHub();
    
    updateStats();
    updateRecentTranslationsUI();
    
    // ===== GET ALL ELEMENTS =====
    const translateBtn = document.getElementById('translateBtn');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const swapBtn = document.getElementById('swapBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const speakBtn = document.getElementById('speakBtn');
    const sentencesBtn = document.getElementById('sentencesBtn');
    const addWordBtn = document.getElementById('addWordBtn');
    const suggestWordBtn = document.getElementById('suggestWordBtn');
    const exportBtn = document.getElementById('exportBtn');
    const exportSortedBtn = document.getElementById('exportSortedBtn');
    const exportForGitHubBtn = document.getElementById('exportForGitHubBtn');
    const importBtn = document.getElementById('importBtn');
    const loadDictionaryBtn = document.getElementById('loadDictionaryBtn');
    const downloadJSONBtn = document.getElementById('downloadJSONBtn');
    const viewSourceBtn = document.getElementById('viewSourceBtn');
    const updateSourceBtn = document.getElementById('updateSourceBtn');
    const dictionaryExportBtn = document.getElementById('dictionaryExportBtn');
    const dictionaryImportBtn = document.getElementById('dictionaryImportBtn');
    const closeSentencesBtn = document.getElementById('closeSentencesBtn');
    const sentencesOverlay = document.getElementById('sentencesOverlay');
    const inputCharCount = document.getElementById('inputCharCount');
    const newWord = document.getElementById('newWord');
    const newMeaning = document.getElementById('newMeaning');
    
    if (!translateBtn) {
        console.error('❌ Translate button not found!');
        return;
    }
    
    // ===== EVENT LISTENERS =====
    
    // Translate
    translateBtn.addEventListener('click', function() {
        const text = inputText.value.trim();
        if (!text) { alert('Enter text'); return; }
        const from = sourceLang.value;
        const to = targetLang.value;
        const result = translateWord(text, from, to);
        outputText.value = result;
        if (outputText) {
            const count = document.getElementById('outputCharCount');
            if (count) count.textContent = result.length;
        }
        updateStatus(`Translated`);
        const actualFrom = from === 'auto' ? (dictionary[text.toLowerCase()] ? 'tsg' : 'en') : from;
        saveRecentTranslation(text, result, actualFrom, to);
    });
    
    // Character counter
    if (inputText && inputCharCount) {
        inputText.addEventListener('input', function() {
            inputCharCount.textContent = this.value.length;
        });
    }
    
    // Swap languages
    if (swapBtn) {
        swapBtn.addEventListener('click', function() {
            if (sourceLang.value === 'auto') {
                alert('Cannot swap with Auto Detect'); return;
            }
            const tempLang = sourceLang.value;
            sourceLang.value = targetLang.value;
            targetLang.value = tempLang;
            const tempText = inputText.value;
            inputText.value = outputText.value;
            outputText.value = tempText;
            if (inputCharCount) inputCharCount.textContent = inputText.value.length;
            if (outputText) {
                const count = document.getElementById('outputCharCount');
                if (count) count.textContent = outputText.value.length;
            }
        });
    }
    
    // Clear
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            inputText.value = '';
            outputText.value = '';
            if (inputCharCount) inputCharCount.textContent = '0';
            if (outputText) {
                const count = document.getElementById('outputCharCount');
                if (count) count.textContent = '0';
            }
            updateStatus('Cleared');
        });
    }
    
    // Copy
    if (copyBtn) {
        copyBtn.addEventListener('click', async function() {
            if (!outputText.value.trim() || outputText.value === "Word not found") {
                alert('Nothing to copy'); return;
            }
            try {
                await navigator.clipboard.writeText(outputText.value);
                alert('Copied!');
            } catch {
                outputText.select();
                document.execCommand('copy');
                alert('Copied!');
            }
        });
    }
    
    // Speak
    if (speakBtn) {
        speakBtn.addEventListener('click', function() {
            if (!outputText.value.trim() || outputText.value === "Word not found") {
                alert('Nothing to speak'); return;
            }
            speakText(outputText.value, targetLang.value);
        });
    }
    
    // Sentences
    if (sentencesBtn) {
        sentencesBtn.addEventListener('click', function() {
            const word = inputText.value.trim();
            if (!word) { alert('Enter a word first'); return; }
            showExampleSentences(word);
        });
    }
    
    // Add Word
    if (addWordBtn && newWord && newMeaning) {
        addWordBtn.addEventListener('click', function() {
            const tausug = newWord.value.trim();
            const english = newMeaning.value.trim();
            if (!tausug || !english) { alert('Both fields required'); return; }
            if (dictionary[tausug.toLowerCase()] && !confirm(`Overwrite "${tausug}"?`)) return;
            if (addWordToDictionary(tausug, english)) {
                updateStatus(`Added: ${tausug} = ${english}`, 'success');
                newWord.value = '';
                newMeaning.value = '';
                if (inputText) inputText.focus();
            }
        });
    }
    
    // Suggest to GitHub
    if (suggestWordBtn && newWord && newMeaning) {
        suggestWordBtn.addEventListener('click', function() {
            const tausug = newWord.value.trim();
            const english = newMeaning.value.trim();
            if (!tausug || !english) { alert('Enter both words'); return; }
            submitWordToGitHub(tausug, english);
            updateStatus('Submitted to GitHub!', 'success');
        });
    }
    
    // Export
    if (exportBtn) exportBtn.addEventListener('click', exportDictionary);
    if (exportSortedBtn) exportSortedBtn.addEventListener('click', exportDictionarySorted);
    if (exportForGitHubBtn) exportForGitHubBtn.addEventListener('click', exportForGitHub);
    
    // Import
    if (importBtn) {
        importBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.addEventListener('change', importDictionary);
            input.click();
        });
    }
    
    // Load from GitHub
    if (loadDictionaryBtn) {
        loadDictionaryBtn.addEventListener('click', async function() {
            updateStatus('Loading...', 'info');
            await loadDictionaryFromGitHub();
            updateStatus('Dictionary updated!', 'success');
        });
    }
    
    // Download JSON (same as export)
    if (downloadJSONBtn) downloadJSONBtn.addEventListener('click', exportDictionary);
    if (dictionaryExportBtn) dictionaryExportBtn.addEventListener('click', exportDictionary);
    
    // Dictionary Import
    if (dictionaryImportBtn) {
        dictionaryImportBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.addEventListener('change', importDictionary);
            input.click();
        });
    }
    
    // View Source
    if (viewSourceBtn) {
        viewSourceBtn.addEventListener('click', function() {
            window.open('https://github.com/ramy430/tausug-translator', '_blank');
        });
    }
    
    // Update Source (Generate dictionary.js)
    if (updateSourceBtn) {
        updateSourceBtn.addEventListener('click', function() {
            const jsContent = `// Tausug Dictionary\nconst dictionary = ${JSON.stringify(dictionary, null, 2)};`;
            const blob = new Blob([jsContent], {type: 'application/javascript'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dictionary.js';
            a.click();
            URL.revokeObjectURL(url);
            updateStatus('dictionary.js generated', 'success');
        });
    }
    
    // Close Sentences
    if (closeSentencesBtn) closeSentencesBtn.addEventListener('click', closeSentencesPopup);
    if (sentencesOverlay) sentencesOverlay.addEventListener('click', closeSentencesPopup);
    
    // Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeSentencesPopup();
    });
    
    // Ctrl+Enter
    if (inputText && translateBtn) {
        inputText.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                translateBtn.click();
            }
        });
    }
    
    console.log('✅ Tausug Translator ready!');
    console.log(`📚 Dictionary: ${Object.keys(dictionary).length} words`);
});
