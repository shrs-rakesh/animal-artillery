class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        
        this.gameState = {
            currentPlayer: 0,
            currentCharacter: 0,
            phase: 'waiting',
            turnTime: 30,
            timeRemaining: 30,
            players: [
                {
                    name: 'Player 1',
                    characters: [0, 1],
                    activeCharacter: 0
                },
                {
                    name: 'Player 2', 
                    characters: [2],
                    activeCharacter: 0
                }
            ],
            characterHealth: [100, 100, 100]
        };
    }

    create() {
        console.log('Game scene started');
        
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        
        console.log(`Game size: ${this.gameWidth}x${this.gameHeight}`);
        
        this.cameras.main.setBackgroundColor('#87CEEB');
        this.physics.world.setBounds(0, 0, this.gameWidth, this.gameHeight);
        
        this.createGround();
        this.createAnimals();
        this.setupInput();
        this.createUI(); // FIXED: Changed from addUI to createUI
        
        this.startTurn();
        
        console.log('Game setup complete');
    }

    update(time, delta) {
        // Game loop
    }

    // TURN SYSTEM
    startTurn() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        
        console.log(`Start Turn: ${player.name} - Character ${characterIndex + 1}`);
        
        this.gameState.phase = 'moving';
        this.gameState.timeRemaining = this.gameState.turnTime;
        
        this.highlightActiveCharacter(characterIndex);
        this.updateUI(); // FIXED: Changed from updateTurnUI to updateUI
        
        this.turnTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    endTurn() {
        console.log('Ending turn');
        
        if (this.turnTimer) {
            this.turnTimer.remove();
        }
        
        this.removeCharacterHighlight();
        this.nextTurn();
    }

    nextTurn() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        
        currentPlayer.activeCharacter++;
        
        if (currentPlayer.activeCharacter >= currentPlayer.characters.length) {
            currentPlayer.activeCharacter = 0;
            this.gameState.currentPlayer = (this.gameState.currentPlayer + 1) % this.gameState.players.length;
        }
        
        this.startTurn();
    }

    highlightActiveCharacter(characterIndex) {
        this.removeCharacterHighlight();
        
        const characters = [this.cat, this.dog, this.duck];
        const activeChar = characters[characterIndex];
        
        if (activeChar) {
            this.activeHighlight = this.add.circle(activeChar.x, activeChar.y, activeChar.radius + 5, 0xffff00, 0.3);
        }
    }

    removeCharacterHighlight() {
        if (this.activeHighlight) {
            this.activeHighlight.destroy();
            this.activeHighlight = null;
        }
    }

    updateTimer() {
        if (this.gameState.phase === 'moving') {
            this.gameState.timeRemaining -= 1;
            
            if (this.gameState.timeRemaining <= 0) {
                this.endTurn();
            } else {
                this.updateUI(); // FIXED: Consistent method name
            }
        }
    }

    // INPUT HANDLING
    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
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
        
        this.spacebar.on('down', () => {
            if (this.gameState.phase === 'moving') {
                this.endTurn();
            }
        });
    }

    moveActiveCharacter(x, y) {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        const characters = [this.cat, this.dog, this.duck];
        const activeChar = characters[characterIndex];
        
        if (activeChar && activeChar.body) {
            if (x !== 0) activeChar.body.setVelocityX(x);
            if (y !== 0) activeChar.body.setVelocityY(y);
        }
    }

    // UI SYSTEM - FIXED METHOD NAMES
    createUI() {
        this.createTurnDisplay();
        this.createHealthDisplay();
    }

    createTurnDisplay() {
        const padding = 20;
        const fontSize = 18;
        
        // Turn information
        this.turnText = this.add.text(padding, padding, 'Loading...', {
            font: `bold ${fontSize}px Arial`,
            fill: '#2c3e50'
        });
        
        // Timer display
        this.timerText = this.add.text(padding, padding + 30, 'Time: 30s', {
            font: `bold ${fontSize}px Arial`,
            fill: '#e74c3c'
        });
        
        // Instructions
        this.instructionText = this.add.text(padding, padding + 60, 'ARROWS: Move | SPACE: End Turn', {
            font: `${fontSize}px Arial`,
            fill: '#7f8c8d'
        });
    }

    createHealthDisplay() {
        const padding = 20;
        const fontSize = 16;
        const startY = this.gameHeight - 100;
        
        this.healthTexts = [];
        const characterNames = ['Cat', 'Dog', 'Duck'];
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
        
        characterNames.forEach((name, index) => {
            const text = this.add.text(padding, startY + (index * 25), `${name}: 100 HP`, {
                font: `${fontSize}px Arial`,
                fill: colors[index]
            });
            this.healthTexts.push(text);
        });
    }

    updateUI() {
        this.updateTurnDisplay();
        this.updateHealthDisplay();
    }

    updateTurnDisplay() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterNames = ['Cat', 'Dog', 'Duck'];
        const characterIndex = player.characters[player.activeCharacter];
        
        if (this.turnText) {
            this.turnText.setText(`${player.name}'s Turn - ${characterNames[characterIndex]}`);
        }
        if (this.timerText) {
            this.timerText.setText(`Time: ${this.gameState.timeRemaining}s`);
        }
        if (this.instructionText) {
            this.instructionText.setText('ARROWS: Move | SPACE: End Turn');
        }
    }

    updateHealthDisplay() {
        const characterNames = ['Cat', 'Dog', 'Duck'];
        
        if (this.healthTexts) {
            this.healthTexts.forEach((text, index) => {
                const health = this.gameState.characterHealth[index];
                text.setText(`${characterNames[index]}: ${health} HP`);
                
                // Update color based on health
                if (health < 25) {
                    text.setColor('#e74c3c');
                } else if (health < 50) {
                    text.setColor('#f39c12');
                }
            });
        }
    }

    // GAME WORLD
    createGround() {
        const groundHeight = 100;
        const groundY = this.gameHeight - (groundHeight / 2);
        
        this.ground = this.add.rectangle(this.gameWidth / 2, groundY, this.gameWidth, groundHeight, 0x228B22);
        this.physics.add.existing(this.ground, true);
    }

    createAnimals() {
        const animalSize = 30;
        const startY = this.gameHeight * 0.6;
        const spacing = this.gameWidth / 4;
        
        // Create animal placeholders
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

        // Collide with ground
        this.physics.add.collider([this.cat, this.dog, this.duck], this.ground);
    }

    resize(gameSize) {
        this.gameWidth = gameSize.width;
        this.gameHeight = gameSize.height;
        this.cameras.main.setSize(this.gameWidth, this.gameHeight);
        console.log(`Resized to: ${this.gameWidth}x${this.gameHeight}`);
    }
}