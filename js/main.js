// Main game configuration
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,  // Use full window width
    height: window.innerHeight, // Use full window height
    parent: 'game-container',
    backgroundColor: '#2c3e50',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,  // This will handle everything
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Boot, Game]
};

// Create the game instance
let game;

// Start game when page loads
window.addEventListener('load', () => {
    game = new Phaser.Game(config);
    
    game.events.on('ready', () => {
        console.log('Game is ready!');
        console.log('Initial size:', game.scale.width, 'x', game.scale.height);
    });
});