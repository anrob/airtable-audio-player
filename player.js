// player.js
document.addEventListener('DOMContentLoaded', () => {
    const loadButton = document.getElementById('loadButton');
    const playlistDiv = document.getElementById('playlist');
    const statusDiv = document.getElementById('status');
    const controlsDiv = document.getElementById('controls');
    const themeSwitch = document.getElementById('themeSwitch');
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');
    const searchInput = document.getElementById('searchInput');
    
    let currentTrack = 0;
    let tracks = [];
    let isMinimized = false;
    let audioContext;
    let analyser;
    let dataArray;
    let animationId;
    let audioSources = new Map();

    themeSwitch.addEventListener('click', () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeSwitch.textContent = newTheme.toUpperCase();
    });

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSwitch.textContent = savedTheme.toUpperCase();

    function setupSearch() {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const audioItems = document.querySelectorAll('.audio-item');
            
            audioItems.forEach(item => {
                const trackName = item.querySelector('.track-name').textContent.toLowerCase();
                if (trackName.includes(searchTerm)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    }

    function updateStatus(message = '', isError = false) {
        if (!statusDiv) return;
        
        if (tracks.length > 0 && currentTrack >= 0) {
            const track = tracks[currentTrack];
            const trackElement = track.closest('.audio-item');
            const trackName = trackElement.querySelector('.track-name').textContent;
            statusDiv.textContent = `Now Playing: ${trackName}`;
        } else {
            statusDiv.textContent = message;
        }
        
        statusDiv.style.display = 'block';
        statusDiv.className = 'status' + (isError ? ' error' : '');
    }

    function shuffleArray(array) {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function updateControls() {
        try {
            const prevButton = document.getElementById('prevButton');
            const nextButton = document.getElementById('nextButton');
            const playAllButton = document.getElementById('playAllButton');
            const minimizeAllButton = document.getElementById('minimizeAllButton');
            
            if (tracks.length === 0) {
                if (prevButton) prevButton.disabled = true;
                if (nextButton) nextButton.disabled = true;
                if (playAllButton) playAllButton.disabled = true;
                if (minimizeAllButton) minimizeAllButton.disabled = true;
                return;
            }

            if (prevButton) prevButton.disabled = currentTrack <= 0;
            if (nextButton) nextButton.disabled = currentTrack >= tracks.length - 1;
            if (playAllButton) playAllButton.disabled = false;
            if (minimizeAllButton) minimizeAllButton.disabled = false;
        } catch (error) {
            console.error('Error updating controls:', error);
        }
    }

    function cleanupAudio() {
        try {
            tracks.forEach(track => {
                track.pause();
                track.currentTime = 0;
                if (audioSources.has(track)) {
                    audioSources.get(track).disconnect();
                }
            });
            audioSources.clear();

            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }

            if (audioContext) {
                audioContext.close().catch(console.error);
                audioContext = null;
                analyser = null;
            }

            if (searchInput) {
                searchInput.value = '';
            }
            document.querySelectorAll('.audio-item').forEach(item => {
                item.classList.remove('hidden');
            });
        } catch (error) {
            console.error('Error cleaning up audio:', error);
        }
    }

    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        } else if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    function drawVisualizer() {
        if (!analyser) return;

        const width = canvas.width;
        const height = canvas.height;
        const bufferLength = analyser.frequencyBinCount;
        const barWidth = (width / bufferLength) * 2;
        
        canvasCtx.clearRect(0, 0, width, height);
        analyser.getByteFrequencyData(dataArray);

        const centerX = width / 2;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height;
            const hue = (i / bufferLength * 360) + (performance.now() / 50);
            
            const gradient = canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.8)`);
            gradient.addColorStop(0.5, `hsla(${hue}, 90%, 60%, 0.9)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 1)`);

            canvasCtx.fillStyle = gradient;
            
            canvasCtx.shadowColor = `hsla(${hue}, 80%, 50%, 0.5)`;
            canvasCtx.shadowBlur = 6;
            canvasCtx.shadowOffsetX = 0;
            canvasCtx.shadowOffsetY = 0;

            canvasCtx.beginPath();
            canvasCtx.roundRect(
                centerX - (i * barWidth) - barWidth,
                height - barHeight,
                barWidth - 1,
                barHeight,
                [2, 2, 0, 0]
            );
            canvasCtx.fill();

            canvasCtx.beginPath();
            canvasCtx.roundRect(
                centerX + (i * barWidth),
                height - barHeight,
                barWidth - 1,
                barHeight,
                [2, 2, 0, 0]
            );
            canvasCtx.fill();
        }

        animationId = requestAnimationFrame(drawVisualizer);
    }

    function stopVisualization() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (canvasCtx) {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
        document.querySelector('.no-audio-text').style.display = 'block';
    }

    function playTrack(index) {
        if (index >= 0 && index < tracks.length) {
            try {
                initAudioContext();

                tracks.forEach((track, i) => {
                    track.pause();
                    track.currentTime = 0;
                    track.closest('.audio-item').classList.remove('playing');
                    
                    if (audioSources.has(track)) {
                        audioSources.get(track).disconnect();
                        audioSources.delete(track);
                    }
                });

                const selectedTrack = tracks[index];
                
                const source = audioContext.createMediaElementSource(selectedTrack);
                audioSources.set(selectedTrack, source);
                source.connect(analyser);
                analyser.connect(audioContext.destination);

                selectedTrack.play()
                    .then(() => {
                        selectedTrack.closest('.audio-item').classList.add('playing');
                        document.querySelector('.no-audio-text').style.display = 'none';
                        drawVisualizer();
                        updateStatus();
                    })
                    .catch(e => {
                        console.error('Playback error:', e);
                        updateStatus('Error playing track: ' + e.message, true);
                    });

                currentTrack = index;
                updateControls();

            } catch (error) {
                console.error('Error in playTrack:', error);
                updateStatus('Error setting up audio: ' + error.message, true);
            }
        }
    }

    function playNext() {
        if (currentTrack < tracks.length - 1) {
            playTrack(currentTrack + 1);
        } else {
            stopVisualization();
        }
    }

    function playPrevious() {
        if (currentTrack > 0) {
            playTrack(currentTrack - 1);
        }
    }

    function createTrackElement(record, audioUrl, index) {
        const div = document.createElement('div');
        div.className = 'audio-item';

        const trackName = record.fields.Name || `Track ${index + 1}`;
        const imageUrl = record.fields.Image && Array.isArray(record.fields.Image) && record.fields.Image[0] 
            ? record.fields.Image[0].url 
            : null;

        const header = document.createElement('div');
        header.className = 'track-header';
        header.innerHTML = `
            ${imageUrl ? `<img src="${imageUrl}" class="album-art" alt="Album Art">` : ''}
            <div class="track-info">
                <div class="track-name">${trackName}</div>
            </div>
        `;

        // Add click handler to track header
        header.style.cursor = 'pointer';
        header.addEventListener('click', (e) => {
            // Don't trigger if clicking the audio controls
            if (!e.target.closest('audio')) {
                const trackIndex = tracks.indexOf(audio);
                if (trackIndex !== -1) {
                    if (trackIndex === currentTrack && !audio.paused) {
                        audio.pause();
                    } else {
                        playTrack(trackIndex);
                    }
                }
            }
        });

        const details = document.createElement('div');
        details.className = 'details';

        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = 'metadata';
        audio.src = audioUrl;

        audio.addEventListener('play', async () => {
            try {
                if (audioContext?.state === 'suspended') {
                    await audioContext.resume();
                }
                
                const trackIndex = tracks.indexOf(audio);
                if (trackIndex !== -1 && trackIndex !== currentTrack) {
                    playTrack(trackIndex);
                }
            } catch (error) {
                console.error('Error in play event:', error);
            }
        });

        audio.addEventListener('ended', () => {
            if (currentTrack >= tracks.length - 1) {
                stopVisualization();
            }
            playNext();
        });

        details.appendChild(audio);
        div.appendChild(header);
        div.appendChild(details);

        return { div, audio };
    }

    loadButton.addEventListener('click', async () => {
        try {
            cleanupAudio();
            tracks = [];
            playlistDiv.innerHTML = '';
            currentTrack = 0;

            const settings = await new Promise((resolve) => {
                chrome.storage.local.get(['apiKey', 'baseId', 'tableName', 'audioField'], resolve);
            });

            if (!settings.apiKey || !settings.baseId || !settings.tableName || !settings.audioField) {
                updateStatus('Please configure settings first', true);
                return;
            }

            updateStatus('Loading tracks...');

            const response = await fetch(`https://api.airtable.com/v0/${settings.baseId}/${settings.tableName}`, {
                headers: {
                    'Authorization': `Bearer ${settings.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Airtable API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.records || data.records.length === 0) {
                updateStatus('No tracks found', true);
                return;
            }

            controlsDiv.style.display = 'flex';

            const records = [...data.records];
            const shuffledRecords = shuffleArray(records);

            shuffledRecords.forEach((record, index) => {
                const audioField = record.fields[settings.audioField];
                
                if (Array.isArray(audioField) && audioField.length > 0) {
                    const audioUrl = audioField[0].url;
                    const { div, audio } = createTrackElement(record, audioUrl, index + 1);
                    tracks.push(audio);
                    playlistDiv.appendChild(div);
                }
            });

            const minimizeAllButton = document.getElementById('minimizeAllButton');
            minimizeAllButton?.addEventListener('click', () => {
                isMinimized = !isMinimized;
                document.querySelectorAll('.audio-item').forEach(item => {
                    item.classList.toggle('minimized', isMinimized);
                });
                minimizeAllButton.textContent = isMinimized ? 'Expand All' : 'Minimize All';
            });

            document.getElementById('playAllButton')?.addEventListener('click', () => {
                if (tracks.length > 0) playTrack(0);
            });

            document.getElementById('prevButton')?.addEventListener('click', playPrevious);
            document.getElementById('nextButton')?.addEventListener('click', playNext);

            setupSearch();
            updateControls();
            updateStatus(`Loaded ${tracks.length} tracks`);

        } catch (error) {
            console.error('Error:', error);
            updateStatus('Error: ' + error.message, true);
        }
    });

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    document.addEventListener('keydown', (e) => {
        if (tracks.length === 0) return;

        if (e.code === 'Space' && e.target !== searchInput) {
            e.preventDefault();
            const currentAudio = tracks[currentTrack];
            if (currentAudio.paused) {
                currentAudio.play().catch(e => console.error('Playback error:', e));
            } else {
                currentAudio.pause();
            }
        } else if (e.code === 'ArrowRight' && e.target !== searchInput) {
            playNext();
        } else if (e.code === 'ArrowLeft' && e.target !== searchInput) {
            playPrevious();
        }
    });
});