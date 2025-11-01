class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        
        this.gameState = {
            currentPlayer: 0,
            currentCharacter: 0,
            phase: 'waiting',
            turnTime: 60,
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
            characterHealth: [100, 100, 100],
            weapons: [
                {
                    name: 'Bazooka',
                    damage: 40,
                    explosionRadius: 80,
                    projectileSpeed: 1.0,
                    ammo: 3,
                    color: 0xff4444,
                    description: 'High damage, large explosion'
                },
                {
                    name: 'Grenade', 
                    damage: 30,
                    explosionRadius: 60,
                    projectileSpeed: 0.8,
                    ammo: 2,
                    color: 0x44ff44,
                    description: 'Good damage, medium explosion'
                },
                {
                    name: 'Sniper',
                    damage: 60,
                    explosionRadius: 30,
                    projectileSpeed: 2.0,
                    ammo: 1,
                    color: 0x4444ff,
                    description: 'Very high damage, small explosion'
                }
            ],
            selectedWeapon: 0
        };

        this.aimAngle = 0;
        this.aimPower = 50;
        this.trajectory = null;
        
        // NEW: Terrain system
        this.terrain = null;
        this.terrainGraphics = null;
        this.terrainData = null;
    }

    create() {
        console.log('Game scene started');
        
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        
        this.cameras.main.setBackgroundColor('#87CEEB');
        this.physics.world.setBounds(0, 0, this.gameWidth, this.gameHeight);
        
        // NEW: Create destructible terrain instead of simple ground
        this.createTerrain();
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

    // NEW: TERRAIN SYSTEM
    createTerrain() {
        const terrainWidth = this.gameWidth;
        const terrainHeight = 200;
        const groundLevel = this.gameHeight - 100;
        
        // Create terrain data (2D array representing solid/empty)
        this.terrainData = [];
        for (let x = 0; x < terrainWidth; x++) {
            this.terrainData[x] = [];
            for (let y = 0; y < terrainHeight; y++) {
                // Create a hilly landscape
                const height = groundLevel + Math.sin(x * 0.02) * 30 + Math.random() * 10;
                this.terrainData[x][y] = (y + this.gameHeight - terrainHeight) > height;
            }
        }
        
        // Create terrain graphics
        this.terrainGraphics = this.add.graphics();
        this.drawTerrain();
        
        // Create terrain physics body
        this.terrain = this.add.rectangle(terrainWidth / 2, this.gameHeight - terrainHeight / 2, terrainWidth, terrainHeight, 0x228B22, 0);
        this.physics.add.existing(this.terrain, true);
    }

    drawTerrain() {
        this.terrainGraphics.clear();
        this.terrainGraphics.fillStyle(0x228B22, 1);
        
        const terrainHeight = 200;
        
        for (let x = 0; x < this.terrainData.length; x++) {
            for (let y = 0; y < this.terrainData[x].length; y++) {
                if (this.terrainData[x][y]) {
                    this.terrainGraphics.fillRect(x, y + (this.gameHeight - terrainHeight), 1, 1);
                }
            }
        }
    }

    // NEW: Destroy terrain in a circular area
    destroyTerrain(centerX, centerY, radius) {
        let destroyedAny = false;
        const terrainHeight = 200;
        const startY = this.gameHeight - terrainHeight;
        
        for (let x = Math.max(0, centerX - radius); x <= Math.min(this.terrainData.length - 1, centerX + radius); x++) {
            for (let y = Math.max(0, centerY - startY - radius); y <= Math.min(terrainHeight - 1, centerY - startY + radius); y++) {
                const distance = Phaser.Math.Distance.Between(centerX, centerY, x, startY + y);
                if (distance <= radius && this.terrainData[x][y]) {
                    this.terrainData[x][y] = false;
                    destroyedAny = true;
                }
            }
        }
        
        if (destroyedAny) {
            this.drawTerrain();
            console.log(`Destroyed terrain at (${centerX}, ${centerY}) with radius ${radius}`);
        }
        
        return destroyedAny;
    }

    // NEW: Check if a point is on solid ground
    isSolid(x, y) {
        const terrainHeight = 200;
        const terrainY = this.gameHeight - terrainHeight;
        
        if (x < 0 || x >= this.terrainData.length || y < terrainY || y >= this.gameHeight) {
            return false;
        }
        
        const dataX = Math.floor(x);
        const dataY = Math.floor(y - terrainY);
        
        return this.terrainData[dataX] && this.terrainData[dataX][dataY];
    }

    // UPDATED: Character creation with terrain positioning
    createAnimals() {
        const animalSize = 20; // Smaller for terrain
        
        // Find safe positions on terrain
        const positions = this.findSafePositions(3, animalSize);
        
        this.cat = this.add.circle(positions[0].x, positions[0].y, animalSize, 0xff6b6b);
        this.physics.add.existing(this.cat);
        this.cat.body.setCollideWorldBounds(true);
        this.cat.body.setBounce(0.2);

        this.dog = this.add.circle(positions[1].x, positions[1].y, animalSize, 0x4ecdc4);
        this.physics.add.existing(this.dog);
        this.dog.body.setCollideWorldBounds(true);
        this.dog.body.setBounce(0.2);

        this.duck = this.add.circle(positions[2].x, positions[2].y, animalSize, 0xffe66d);
        this.physics.add.existing(this.duck);
        this.duck.body.setCollideWorldBounds(true);
        this.duck.body.setBounce(0.2);

        // Characters collide with terrain
        this.setupTerrainCollision();
    }

    // NEW: Find safe positions on terrain
    findSafePositions(count, radius) {
        const positions = [];
        const terrainHeight = 200;
        const startY = this.gameHeight - terrainHeight;
        
        for (let i = 0; i < count; i++) {
            let x, y;
            let attempts = 0;
            let validPosition = false;
            
            while (!validPosition && attempts < 100) {
                x = 100 + (this.gameWidth - 200) * (i / (count - 1 || 1));
                y = startY;
                
                // Find the highest solid point at this x position
                for (let checkY = terrainHeight - 1; checkY >= 0; checkY--) {
                    if (this.terrainData[Math.floor(x)][checkY]) {
                        y = startY + checkY - radius - 2; // Position above terrain
                        validPosition = true;
                        break;
                    }
                }
                
                // Check if position is far enough from others
                if (validPosition) {
                    for (const pos of positions) {
                        if (Phaser.Math.Distance.Between(x, y, pos.x, pos.y) < radius * 4) {
                            validPosition = false;
                            break;
                        }
                    }
                }
                
                attempts++;
            }
            
            if (validPosition) {
                positions.push({ x, y });
            } else {
                // Fallback position
                positions.push({ x: 100 + i * 200, y: this.gameHeight - 150 });
            }
        }
        
        return positions;
    }

    // NEW: Setup terrain collision using overlap checking
    setupTerrainCollision() {
        this.physics.add.overlap([this.cat, this.dog, this.duck], this.terrain, (character, terrain) => {
            this.handleTerrainCollision(character);
        });
    }

    // NEW: Handle terrain collision
    handleTerrainCollision(character) {
        if (!character.body) return;
        
        const radius = character.radius || 20;
        const bottom = character.y + radius;
        const left = character.x - radius;
        const right = character.x + radius;
        
        // Check if character is standing on terrain
        if (this.isSolid(character.x, bottom + 1) || 
            this.isSolid(left, bottom + 1) || 
            this.isSolid(right, bottom + 1)) {
            
            // Stop falling
            character.body.setVelocityY(0);
            
            // Position character on top of terrain
            let surfaceY = bottom;
            for (let y = bottom; y >= character.y - radius; y--) {
                if (this.isSolid(character.x, y) || this.isSolid(left, y) || this.isSolid(right, y)) {
                    surfaceY = Math.min(surfaceY, y);
                }
            }
            character.y = surfaceY - radius - 1;
        }
        
        // Check side collisions
        if (this.isSolid(left - 1, character.y) || this.isSolid(right + 1, character.y)) {
            character.body.setVelocityX(0);
        }
    }

    // UPDATED: Enhanced explosion with terrain destruction
    createExplosion(x, y, weapon) {
        // Destroy terrain
        const terrainDestroyed = this.destroyTerrain(x, y, weapon.explosionRadius);
        
        // Explosion effect
        const explosion = this.add.circle(x, y, 5, weapon.color);
        this.tweens.add({
            targets: explosion,
            radius: weapon.explosionRadius,
            alpha: 0,
            duration: 400,
            onComplete: () => explosion.destroy()
        });
        
        // Particle effect for terrain destruction
        if (terrainDestroyed) {
            this.createDebris(x, y, weapon.explosionRadius);
        }
        
        // Apply area damage
        this.applyAreaDamage(x, y, weapon.explosionRadius, weapon.damage);
        
        // Apply explosion force to characters
        this.applyExplosionForce(x, y, weapon.explosionRadius);
    }

    // NEW: Create debris particles when terrain is destroyed
    createDebris(x, y, radius) {
        const debrisCount = Phaser.Math.Between(10, 20);
        
        for (let i = 0; i < debrisCount; i++) {
            const debris = this.add.rectangle(
                x + Phaser.Math.Between(-radius, radius),
                y + Phaser.Math.Between(-radius, radius),
                3, 3, 0x8B4513
            );
            
            this.physics.add.existing(debris);
            debris.body.setVelocity(
                Phaser.Math.Between(-100, 100),
                Phaser.Math.Between(-200, -50)
            );
            debris.body.setGravityY(300);
            
            // Remove debris after a while
            this.time.delayedCall(Phaser.Math.Between(1000, 3000), () => {
                debris.destroy();
            });
        }
    }

    // NEW: Apply explosion force to characters
    applyExplosionForce(centerX, centerY, radius) {
        const characters = [this.cat, this.dog, this.duck];
        
        characters.forEach(character => {
            if (!character.body) return;
            
            const distance = Phaser.Math.Distance.Between(centerX, centerY, character.x, character.y);
            if (distance <= radius) {
                const force = (1 - (distance / radius)) * 500;
                const angle = Phaser.Math.Angle.Between(centerX, centerY, character.x, character.y);
                
                character.body.setVelocity(
                    Math.cos(angle) * force,
                    Math.sin(angle) * force
                );
            }
        });
    }

    // UPDATED: Trajectory calculation considers terrain
    calculateTrajectory(startX, startY, angle, power, steps) {
        const points = [];
        const gravity = 300;
        const timeStep = 0.08;
        
        const weapon = this.gameState.weapons[this.gameState.selectedWeapon];
        const velocity = power * 6 * weapon.projectileSpeed;
        
        const angleRad = Phaser.Math.DegToRad(angle);
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
            
            // Stop if hits terrain or goes out of bounds
            if (this.isSolid(x, y) || y > this.gameHeight || x < 0 || x > this.gameWidth) {
                break;
            }
        }
        
        return points;
    }

    // KEEP ALL OTHER METHODS THE SAME (they should work with the new terrain)
    startTurn() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        const activeChar = this.getActiveCharacter();
        
        console.log(`Start Turn: ${player.name} - Character ${characterIndex + 1}`);
        
        this.gameState.phase = 'moving';
        this.gameState.timeRemaining = this.gameState.turnTime;
        this.aimPower = 50;
        
        if (activeChar) {
            this.aimAngle = (activeChar.x < this.gameWidth / 2) ? 45 : 135;
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
        
        const weapon = this.gameState.weapons[this.gameState.selectedWeapon];
        const trajectoryColor = weapon.color;
        
        this.trajectory.lineStyle(3, trajectoryColor, 0.8);
        
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
        
        const endPoint = points[points.length - 1];
        this.trajectory.fillStyle(0xff0000, 1);
        this.trajectory.fillCircle(endPoint.x, endPoint.y, 4);
    }

    switchWeapon() {
        this.gameState.selectedWeapon = (this.gameState.selectedWeapon + 1) % this.gameState.weapons.length;
        const weapon = this.gameState.weapons[this.gameState.selectedWeapon];
        
        if (this.gameState.phase === 'aiming') {
            this.updateTrajectory();
        }
        
        console.log(`Switched to: ${weapon.name}`);
        this.updateUI();
    }

    adjustAim(amount) {
        this.aimAngle = Phaser.Math.Clamp(this.aimAngle + amount, 0, 180);
        this.updateUI();
    }

    adjustPower(amount) {
        this.aimPower = Phaser.Math.Clamp(this.aimPower + amount, 10, 100);
        this.updateUI();
    }

    fireWeapon() {
        const weapon = this.gameState.weapons[this.gameState.selectedWeapon];
        
        if (weapon.ammo <= 0) {
            console.log('Out of ammo!');
            return;
        }
        
        weapon.ammo--;
        
        console.log(`Firing ${weapon.name}! Angle: ${this.aimAngle}°, Power: ${this.aimPower}%`);
        
        this.clearTrajectory();
        this.gameState.phase = 'firing';
        this.updateUI();
        
        this.createProjectile();
        this.time.delayedCall(3000, this.endTurn, [], this);
    }

    createProjectile() {
        const activeChar = this.getActiveCharacter();
        const weapon = this.gameState.weapons[this.gameState.selectedWeapon];
        
        if (!activeChar) return;
        
        this.projectile = this.add.circle(activeChar.x, activeChar.y, 6, weapon.color);
        this.physics.add.existing(this.projectile);
        
        const angleRad = Phaser.Math.DegToRad(this.aimAngle);
        const velocity = this.aimPower * 6 * weapon.projectileSpeed;
        const velocityX = Math.cos(angleRad) * velocity;
        const velocityY = Math.sin(angleRad) * velocity;
        
        this.projectile.body.setVelocity(velocityX, velocityY);
        this.projectile.body.setBounce(0.3);
        this.projectile.body.setCollideWorldBounds(true);
        
        // NEW: Projectile collision with terrain
        this.physics.add.overlap(this.projectile, this.terrain, (projectile, terrain) => {
            if (this.isSolid(projectile.x, projectile.y)) {
                this.createExplosion(projectile.x, projectile.y, weapon);
                projectile.destroy();
            }
        });
        
        // Character collision
        this.physics.add.collider(this.projectile, [this.cat, this.dog, this.duck], (projectile, character) => {
            this.createExplosion(projectile.x, projectile.y, weapon);
            this.applyDamageToCharacter(character, weapon.damage);
            projectile.destroy();
        });
    }

    applyDamageToCharacter(character, damage) {
        const characterIndex = this.getCharacterIndex(character);
        if (characterIndex !== -1) {
            this.gameState.characterHealth[characterIndex] = Math.max(0, this.gameState.characterHealth[characterIndex] - damage);
            console.log(`Character ${characterIndex} took ${damage} damage!`);
            
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

    // KEEP ALL REMAINING METHODS THE SAME (input, UI, turn management, etc.)
    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        
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
        
        // SPACE: Switch phases or fire
        this.spacebar.on('down', () => {
            if (this.gameState.phase === 'moving') {
                this.startAimingPhase();
            } else if (this.gameState.phase === 'aiming') {
                this.fireWeapon();
            }
        });

        // ENTER or W: Switch weapons
        this.enterKey.on('down', () => {
            if (this.gameState.phase === 'aiming') {
                this.switchWeapon();
            }
        });
        
        this.keyW.on('down', () => {
            if (this.gameState.phase === 'aiming') {
                this.switchWeapon();
            }
        });

        // AIMING PHASE
        this.cursors.left.on('down', () => {
            if (this.gameState.phase === 'aiming') this.adjustAim(-3);
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

    moveActiveCharacter(x, y) {
        const activeChar = this.getActiveCharacter();
        if (activeChar && activeChar.body) {
            if (x !== 0) activeChar.body.setVelocityX(x);
            if (y !== 0) activeChar.body.setVelocityY(y);
        }
    }

    // UI METHODS (keep the same)
    createUI() {
        this.createTurnDisplay();
        this.createHealthDisplay();
        this.createWeaponDisplay();
    }

    createWeaponDisplay() {
        const padding = 20;
        const fontSize = 16;
        const startX = this.gameWidth - 200;
        
        this.weaponText = this.add.text(startX, padding, '', {
            font: `bold ${fontSize}px Arial`,
            fill: '#2c3e50'
        });
        
        this.ammoText = this.add.text(startX, padding + 25, '', {
            font: `${fontSize}px Arial`,
            fill: '#e74c3c'
        });
        
        this.weaponDescText = this.add.text(startX, padding + 50, '', {
            font: `${fontSize * 0.8}px Arial`,
            fill: '#7f8c8d'
        });
        
        this.updateWeaponDisplay();
    }

    updateWeaponDisplay() {
        const weapon = this.gameState.weapons[this.gameState.selectedWeapon];
        
        if (this.weaponText) {
            this.weaponText.setText(`Weapon: ${weapon.name}`);
            this.weaponText.setColor(`#${weapon.color.toString(16).padStart(6, '0')}`);
        }
        
        if (this.ammoText) {
            this.ammoText.setText(`Ammo: ${weapon.ammo}`);
            if (weapon.ammo === 0) {
                this.ammoText.setColor('#e74c3c');
            } else if (weapon.ammo === 1) {
                this.ammoText.setColor('#f39c12');
            } else {
                this.ammoText.setColor('#2c3e50');
            }
        }
        
        if (this.weaponDescText) {
            this.weaponDescText.setText(weapon.description);
        }
    }

    updateUI() {
        this.updateTurnDisplay();
        this.updateHealthDisplay();
        this.updateWeaponDisplay();
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
                this.instructionText.setText(`ANGLE: ${this.aimAngle}° | POWER: ${this.aimPower}% | ARROWS: Adjust | SPACE: Fire | ENTER/W: Switch Weapon`);
            } else if (this.gameState.phase === 'firing') {
                this.instructionText.setText('Firing...');
            }
        }
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

    // TURN MANAGEMENT (keep the same)
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

    resize(gameSize) {
        this.gameWidth = gameSize.width;
        this.gameHeight = gameSize.height;
        this.cameras.main.setSize(this.gameWidth, this.gameHeight);
    }
}