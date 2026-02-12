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
