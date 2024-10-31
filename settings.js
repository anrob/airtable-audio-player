document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings
    chrome.storage.local.get(['apiKey', 'baseId', 'tableName', 'audioField'], (result) => {
        document.getElementById('apiKey').value = result.apiKey || '';
        document.getElementById('baseId').value = result.baseId || '';
        document.getElementById('tableName').value = result.tableName || '';
        document.getElementById('audioField').value = result.audioField || '';
    });

    // Save settings
    document.getElementById('saveButton').addEventListener('click', () => {
        const settings = {
            apiKey: document.getElementById('apiKey').value,
            baseId: document.getElementById('baseId').value,
            tableName: document.getElementById('tableName').value,
            audioField: document.getElementById('audioField').value
        };

        // Validate all fields are filled
        if (!settings.apiKey || !settings.baseId || !settings.tableName || !settings.audioField) {
            showStatus('Please fill in all fields', false);
            return;
        }

        // Save to chrome.storage
        chrome.storage.local.set(settings, () => {
            showStatus('Settings saved successfully!', true);
        });
    });

    // Test connection
    document.getElementById('testConnection').addEventListener('click', async () => {
        const apiKey = document.getElementById('apiKey').value;
        const baseId = document.getElementById('baseId').value;
        const tableName = document.getElementById('tableName').value;
        const audioField = document.getElementById('audioField').value;

        if (!apiKey || !baseId || !tableName || !audioField) {
            showStatus('Please fill in all fields', false);
            return;
        }

        try {
            const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}?maxRecords=1`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error('Connection failed');
            }

            const data = await response.json();

            // Check if the audio field exists in the first record
            if (data.records.length > 0) {
                if (data.records[0].fields.hasOwnProperty(audioField)) {
                    showStatus('Connection successful and audio field found!', true);
                } else {
                    showStatus(`Field "${audioField}" not found in table`, false);
                }
            } else {
                showStatus('Connection successful but table is empty', true);
            }

        } catch (error) {
            showStatus('Connection failed. Please check your credentials.', false);
        }
    });
});

function showStatus(message, success) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.display = 'block';
    status.className = success ? 'success' : 'error';

    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}
