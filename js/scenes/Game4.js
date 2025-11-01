class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        
        this.gameState = {
            currentPlayer: 0,
            currentCharacter: 0,
            phase: 'waiting',
            turnTime: 60, // More time for aiming
            timeRemaining: 60,
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

        // Better aiming variables
        this.aimAngle = 0; // -90 to +90 degrees (left to right)
        this.aimPower = 50;
        this.trajectory = null;
        this.aimDirection = 1; // 1 for right, -1 for left
    }

    create() {
        console.log('Game scene started');
        
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        
        this.cameras.main.setBackgroundColor('#87CEEB');
        this.physics.world.setBounds(0, 0, this.gameWidth, this.gameHeight);
        
        this.createGround();
        this.createAnimals();
        this.setupInput();
        this.createUI();
        
        this.startTurn();
    }

    update(time, delta) {
        if (this.gameState.phase === 'aiming' && this.trajectory) {
            this.updateTrajectory();
        }
    }

    startTurn() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        const activeChar = this.getActiveCharacter();
        
        console.log(`Start Turn: ${player.name} - Character ${characterIndex + 1}`);
        
        this.gameState.phase = 'moving';
        this.gameState.timeRemaining = this.gameState.turnTime;
        this.aimPower = 50;
        
        // Set initial aim direction based on character position
        if (activeChar) {
            this.aimDirection = (activeChar.x < this.gameWidth / 2) ? 1 : -1;
            this.aimAngle = (this.aimDirection === 1) ? 45 : 135; // Aim towards center
        }
        
        this.clearTrajectory();
        this.highlightActiveCharacter(characterIndex);
        this.updateUI();
        
        this.turnTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    // FIXED: Better aiming system
    startAimingPhase() {
        console.log('Starting aiming phase');
        this.gameState.phase = 'aiming';
        this.createTrajectory();
        this.updateUI();
    }

    createTrajectory() {
        this.clearTrajectory();
        this.trajectory = this.add.graphics();
        this.updateTrajectory();
    }

    updateTrajectory() {
        if (!this.trajectory) return;
        
        const activeChar = this.getActiveCharacter();
        if (!activeChar) return;
        
        this.trajectory.clear();
        
        // Draw trajectory line
        this.trajectory.lineStyle(3, 0x00ff00, 0.8); // Green line for better visibility
        
        const points = this.calculateTrajectory(
            activeChar.x, 
            activeChar.y, 
            this.aimAngle, 
            this.aimPower,
            25
        );
        
        this.trajectory.beginPath();
        this.trajectory.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.trajectory.lineTo(points[i].x, points[i].y);
        }
        
        this.trajectory.strokePath();
        
        // Draw aiming dot at the end
        const endPoint = points[points.length - 1];
        this.trajectory.fillStyle(0xff0000, 1);
        this.trajectory.fillCircle(endPoint.x, endPoint.y, 4);
    }

    // FIXED: Better trajectory calculation
    calculateTrajectory(startX, startY, angle, power, steps) {
        const points = [];
        const gravity = 300;
        const timeStep = 0.08; // Smaller steps for smoother curve
        
        // Convert angle to radians
        const angleRad = Phaser.Math.DegToRad(angle);
        
        // Calculate velocity components
        const velocity = power * 4; // Scale power for better range
        const velocityX = Math.cos(angleRad) * velocity;
        const velocityY = Math.sin(angleRad) * velocity;
        
        let x = startX;
        let y = startY;
        let t = 0;
        
        for (let i = 0; i < steps; i++) {
            points.push({ x: x, y: y });
            
            t += timeStep;
            x = startX + velocityX * t;
            y = startY + velocityY * t + 0.5 * gravity * t * t;
            
            // Stop if hits ground or goes out of bounds
            if (y > this.gameHeight - 50 || x < 0 || x > this.gameWidth) {
                break;
            }
        }
        
        return points;
    }

    // FIXED: Better aiming controls
    adjustAim(amount) {
        // Allow aiming in both directions (-90 to +90 from horizontal)
        this.aimAngle = Phaser.Math.Clamp(this.aimAngle + amount, 0, 180);
        this.updateUI();
    }

    adjustPower(amount) {
        this.aimPower = Phaser.Math.Clamp(this.aimPower + amount, 10, 100);
        this.updateUI();
    }

    // FIXED: Better projectile physics
    fireWeapon() {
        console.log(`Firing! Angle: ${this.aimAngle}°, Power: ${this.aimPower}%`);
        
        this.clearTrajectory();
        this.gameState.phase = 'firing';
        this.updateUI();
        
        this.createProjectile();
        this.time.delayedCall(3000, this.endTurn, [], this);
    }

    createProjectile() {
        const activeChar = this.getActiveCharacter();
        if (!activeChar) return;
        
        // Create projectile
        this.projectile = this.add.circle(activeChar.x, activeChar.y, 8, 0x000000);
        this.physics.add.existing(this.projectile);
        
        // Calculate velocity with better scaling
        const angleRad = Phaser.Math.DegToRad(this.aimAngle);
        const velocity = this.aimPower * 6; // Better velocity scaling
        const velocityX = Math.cos(angleRad) * velocity;
        const velocityY = Math.sin(angleRad) * velocity;
        
        this.projectile.body.setVelocity(velocityX, velocityY);
        this.projectile.body.setBounce(0.3);
        this.projectile.body.setCollideWorldBounds(true);
        
        // Create explosion when hitting ground
        this.physics.add.collider(this.projectile, this.ground, (projectile, ground) => {
            this.createExplosion(projectile.x, projectile.y);
            projectile.destroy();
        });
        
        // Create explosion when hitting characters
        this.physics.add.collider(this.projectile, [this.cat, this.dog, this.duck], (projectile, character) => {
            this.createExplosion(projectile.x, projectile.y);
            this.applyDamageToCharacter(character);
            projectile.destroy();
        });
    }

    // NEW: Explosion effect
    createExplosion(x, y) {
        // Explosion circle
        const explosion = this.add.circle(x, y, 5, 0xff0000);
        this.tweens.add({
            targets: explosion,
            radius: 60,
            alpha: 0,
            duration: 400,
            onComplete: () => explosion.destroy()
        });
        
        // Apply damage to nearby characters
        this.applyAreaDamage(x, y, 60, 30);
    }

    // NEW: Apply damage to character
    applyDamageToCharacter(character) {
        const characterIndex = this.getCharacterIndex(character);
        if (characterIndex !== -1) {
            this.gameState.characterHealth[characterIndex] = Math.max(0, this.gameState.characterHealth[characterIndex] - 30);
            console.log(`Character ${characterIndex} took 30 damage!`);
            
            // Visual feedback
            this.tweens.add({
                targets: character,
                fillColor: 0xff0000,
                duration: 200,
                yoyo: true,
                repeat: 1
            });
            
            this.updateHealthDisplay();
        }
    }

    // NEW: Area damage
    applyAreaDamage(centerX, centerY, radius, damage) {
        const characters = [this.cat, this.dog, this.duck];
        
        characters.forEach((char, index) => {
            const distance = Phaser.Math.Distance.Between(centerX, centerY, char.x, char.y);
            if (distance <= radius) {
                const distanceFactor = 1 - (distance / radius);
                const actualDamage = Math.floor(damage * distanceFactor);
                this.gameState.characterHealth[index] = Math.max(0, this.gameState.characterHealth[index] - actualDamage);
                console.log(`Character ${index} took ${actualDamage} area damage!`);
            }
        });
        
        this.updateHealthDisplay();
    }

    getCharacterIndex(character) {
        const characters = [this.cat, this.dog, this.duck];
        return characters.indexOf(character);
    }

    clearTrajectory() {
        if (this.trajectory) {
            this.trajectory.destroy();
            this.trajectory = null;
        }
    }

    // INPUT - Same as before but with better instructions
    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // MOVING PHASE
        this.cursors.left.on('down', () => {
            if (this.gameState.phase === 'moving') this.moveActiveCharacter(-50, 0);
        });
        
        this.cursors.right.on('down', () => {
            if (this.gameState.phase === 'moving') this.moveActiveCharacter(50, 0);
        });
        
        this.cursors.up.on('down', () => {
            if (this.gameState.phase === 'moving') this.moveActiveCharacter(0, -200);
        });
        
        // SPACE: Switch phases
        this.spacebar.on('down', () => {
            if (this.gameState.phase === 'moving') {
                this.startAimingPhase();
            } else if (this.gameState.phase === 'aiming') {
                this.fireWeapon();
            }
        });

        // AIMING PHASE
        this.cursors.left.on('down', () => {
            if (this.gameState.phase === 'aiming') this.adjustAim(-3); // Slower adjustment
        });
        
        this.cursors.right.on('down', () => {
            if (this.gameState.phase === 'aiming') this.adjustAim(3);
        });
        
        this.cursors.up.on('down', () => {
            if (this.gameState.phase === 'aiming') this.adjustPower(5);
        });
        
        this.cursors.down.on('down', () => {
            if (this.gameState.phase === 'aiming') this.adjustPower(-5);
        });
    }

    getActiveCharacter() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        const characters = [this.cat, this.dog, this.duck];
        return characters[characterIndex];
    }

    // ENHANCED UI with better aiming info
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
            if (this.gameState.phase === 'moving') {
                this.instructionText.setText('ARROWS: Move | SPACE: Start Aiming');
            } else if (this.gameState.phase === 'aiming') {
                this.instructionText.setText(`ANGLE: ${this.aimAngle}° | POWER: ${this.aimPower}% | ARROWS: Adjust | SPACE: Fire`);
            } else if (this.gameState.phase === 'firing') {
                this.instructionText.setText('Firing...');
            }
        }
    }

    // KEEP ALL OTHER METHODS THE SAME
    endTurn() {
        console.log('Ending turn');
        if (this.turnTimer) this.turnTimer.remove();
        this.removeCharacterHighlight();
        this.clearTrajectory();
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

    moveActiveCharacter(x, y) {
        const activeChar = this.getActiveCharacter();
        if (activeChar && activeChar.body) {
            if (x !== 0) activeChar.body.setVelocityX(x);
            if (y !== 0) activeChar.body.setVelocityY(y);
        }
    }

    updateTimer() {
        if (this.gameState.phase === 'moving' || this.gameState.phase === 'aiming') {
            this.gameState.timeRemaining -= 1;
            if (this.gameState.timeRemaining <= 0) {
                this.endTurn();
            } else {
                this.updateUI();
            }
        }
    }

    createUI() {
        this.createTurnDisplay();
        this.createHealthDisplay();
    }

    createTurnDisplay() {
        const padding = 20;
        const fontSize = 18;
        
        this.turnText = this.add.text(padding, padding, 'Loading...', {
            font: `bold ${fontSize}px Arial`,
            fill: '#2c3e50'
        });
        
        this.timerText = this.add.text(padding, padding + 30, 'Time: 60s', {
            font: `bold ${fontSize}px Arial`,
            fill: '#e74c3c'
        });
        
        this.instructionText = this.add.text(padding, padding + 60, 'ARROWS: Move | SPACE: Start Aiming', {
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

    updateHealthDisplay() {
        const characterNames = ['Cat', 'Dog', 'Duck'];
        if (this.healthTexts) {
            this.healthTexts.forEach((text, index) => {
                const health = this.gameState.characterHealth[index];
                text.setText(`${characterNames[index]}: ${health} HP`);
                if (health < 25) text.setColor('#e74c3c');
                else if (health < 50) text.setColor('#f39c12');
            });
        }
    }

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
    }
}