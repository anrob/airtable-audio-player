let playerWindow = null;

document.addEventListener('DOMContentLoaded', () => {
    const openPlayerButton = document.getElementById('openPlayer');

    openPlayerButton.addEventListener('click', () => {
        // Check if window exists and is not closed
        if (playerWindow && !playerWindow.closed) {
            // Window exists, just focus it
            playerWindow.focus();
        } else {
            // Create new window with specific position (centered)
            const width = 500;
            const height = 600;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;

            playerWindow = window.open(
                'player.html',
                'AirtablePlayer',
                `width=${width},` +
                `height=${height},` +
                `left=${left},` +
                `top=${top},` +
                'resizable=yes,' +
                'scrollbars=no,' +
                'status=no,' +
                'location=no,' +
                'toolbar=no,' +
                'menubar=no'
            );

            // Optional: Check if popup was blocked
            if (!playerWindow || playerWindow.closed || typeof playerWindow.closed === 'undefined') {
                alert('Please enable popups for this extension to work.');
            }
        }
    });
});

// Optional: Handle window close to reset the reference
setInterval(() => {
    if (playerWindow && playerWindow.closed) {
        playerWindow = null;
    }
}, 1000);
