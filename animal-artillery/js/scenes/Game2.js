class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        
        // Turn-based game state
        this.gameState = {
            currentPlayer: 0,      // 0 = player1, 1 = player2
            currentCharacter: 0,   // Which character in team
            phase: 'waiting',      // waiting, moving, aiming, firing, resolving
            turnTime: 30,          // Seconds per turn
            timeRemaining: 30,
            players: [
                {
                    name: 'Player 1',
                    characters: [0, 1], // cat, dog
                    activeCharacter: 0
                },
                {
                    name: 'Player 2', 
                    characters: [2],    // duck
                    activeCharacter: 0
                }
            ]
        };
    }

    create() {
        console.log('Game scene started - Turn Based Mode');
        
        // Get game dimensions
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        
        // Set background
        this.cameras.main.setBackgroundColor('#87CEEB');
        
        // Setup physics world
        this.physics.world.setBounds(0, 0, this.gameWidth, this.gameHeight);
        
        // Create game elements
        this.createGround();
        this.createAnimals();
        this.setupInput();
        this.addUI();
        
        // Start the first turn
        this.startTurn();
        
        // Handle resize
        this.scale.on('resize', this.resize, this);
    }

    update(time, delta) {
        // Update turn timer if we're in moving/aiming phase
        if (this.gameState.phase === 'moving' || this.gameState.phase === 'aiming') {
            this.updateTimer(delta);
        }
    }

    // NEW TURN-BASED METHODS
    startTurn() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        
        console.log(`Start Turn: ${player.name} - Character ${characterIndex + 1}`);
        
        // Set game state
        this.gameState.phase = 'moving';
        this.gameState.timeRemaining = this.gameState.turnTime;
        
        // Highlight active character
        this.highlightActiveCharacter(characterIndex);
        
        // Update UI
        this.updateTurnUI();
        
        // Start turn timer
        this.turnTimer = this.time.addEvent({
            delay: 1000, // 1 second
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    endTurn() {
        console.log('Ending turn');
        
        // Stop timer
        if (this.turnTimer) {
            this.turnTimer.remove();
        }
        
        // Remove character highlight
        this.removeCharacterHighlight();
        
        // Switch to next player/character
        this.nextTurn();
    }

    nextTurn() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        
        // Move to next character in team, or next player
        currentPlayer.activeCharacter++;
        
        if (currentPlayer.activeCharacter >= currentPlayer.characters.length) {
            // Switch to next player
            currentPlayer.activeCharacter = 0;
            this.gameState.currentPlayer = (this.gameState.currentPlayer + 1) % this.gameState.players.length;
        }
        
        // Start next turn
        this.startTurn();
    }

    highlightActiveCharacter(characterIndex) {
        // Remove previous highlights
        this.removeCharacterHighlight();
        
        // Add highlight to active character
        const characters = [this.cat, this.dog, this.duck];
        const activeChar = characters[characterIndex];
        
        // Create highlight effect (glow or border)
        this.activeHighlight = this.add.circle(activeChar.x, activeChar.y, activeChar.radius + 5, 0xffff00, 0.3);
    }

    removeCharacterHighlight() {
        if (this.activeHighlight) {
            this.activeHighlight.destroy();
            this.activeHighlight = null;
        }
    }

    updateTimer() {
        if (this.gameState.phase === 'moving' || this.gameState.phase === 'aiming') {
            this.gameState.timeRemaining -= 1;
            
            if (this.gameState.timeRemaining <= 0) {
                // Time's up - end turn automatically
                this.endTurn();
            } else {
                // Update timer display
                this.updateTurnUI();
            }
        }
    }

    // UPDATED INPUT HANDLING
    setupInput() {
        // Only allow movement during 'moving' phase
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Movement keys - only work during moving phase
        this.cursors.left.on('down', () => {
            if (this.gameState.phase === 'moving') {
                this.moveActiveCharacter(-50, 0);
            }
        });
        
        this.cursors.right.on('down', () => {
            if (this.gameState.phase === 'moving') {
                this.moveActiveCharacter(50, 0);
            }
        });
        
        this.cursors.up.on('down', () => {
            if (this.gameState.phase === 'moving') {
                this.moveActiveCharacter(0, -200);
            }
        });
        
        // End turn manually
        this.spacebar.on('down', () => {
            if (this.gameState.phase === 'moving' || this.gameState.phase === 'aiming') {
                this.endTurn();
            }
        });
    }

    moveActiveCharacter(x, y) {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        const characters = [this.cat, this.dog, this.duck];
        const activeChar = characters[characterIndex];
        
        if (x !== 0) activeChar.body.setVelocityX(x);
        if (y !== 0) activeChar.body.setVelocityY(y);
    }

    // UPDATED UI
    addUI() {
        this.createTurnUI();
    }

    createTurnUI() {
        const padding = this.gameWidth * 0.02;
        const fontSize = Math.max(16, this.gameWidth * 0.015);
        
        // Turn information
        this.turnText = this.add.text(padding, padding, '', {
            font: `bold ${fontSize}px Arial`,
            fill: '#2c3e50'
        });
        
        // Timer display
        this.timerText = this.add.text(padding, padding + fontSize * 1.5, '', {
            font: `bold ${fontSize}px Arial`,
            fill: '#e74c3c'
        });
        
        // Instructions
        this.instructionText = this.add.text(padding, padding + fontSize * 3, '', {
            font: `${fontSize}px Arial`,
            fill: '#7f8c8d'
        });
        
        this.updateTurnUI();
    }

    updateTurnUI() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterNames = ['Cat', 'Dog', 'Duck'];
        const characterIndex = player.characters[player.activeCharacter];
        
        this.turnText.setText(`${player.name}'s Turn - ${characterNames[characterIndex]}`);
        this.timerText.setText(`Time: ${this.gameState.timeRemaining}s`);
        this.instructionText.setText('ARROWS: Move | SPACE: End Turn');
    }

    // KEEP EXISTING METHODS (updated slightly)
    createGround() {
        const groundHeight = 100;
        const groundY = this.gameHeight - (groundHeight / 2);
        
        this.ground = this.add.rectangle(this.gameWidth / 2, groundY, this.gameWidth, groundHeight, 0x228B22);
        this.physics.add.existing(this.ground, true);
    }

    createAnimals() {
        const animalSize = Math.min(this.gameWidth, this.gameHeight) * 0.04;
        const startY = this.gameHeight * 0.6;
        const spacing = this.gameWidth / 4;
        
        // Position animals for two teams
        this.cat = this.add.circle(spacing, startY, animalSize, 0xff6b6b);
        this.physics.add.existing(this.cat);
        this.cat.body.setCollideWorldBounds(true);
        this.cat.body.setBounce(0.3);

        this.dog = this.add.circle(spacing * 2, startY, animalSize, 0x4ecdc4);
        this.physics.add.existing(this.dog);
        this.dog.body.setCollideWorldBounds(true);
        this.dog.body.setBounce(0.3);

        this.duck = this.add.circle(spacing * 3, startY, animalSize, 0xffe66d);
        this.physics.add.existing(this.duck);
        this.duck.body.setCollideWorldBounds(true);
        this.duck.body.setBounce(0.3);

        this.physics.add.collider([this.cat, this.dog, this.duck], this.ground);
    }

    resize(gameSize) {
        this.gameWidth = gameSize.width;
        this.gameHeight = gameSize.height;
        this.cameras.main.setSize(this.gameWidth, this.gameHeight);
        
        // For now, just log resize - in future we'll handle UI repositioning
        console.log(`Resized to: ${this.gameWidth}x${this.gameHeight}`);
    }
}