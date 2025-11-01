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
            selectedWeapon: 0,
            movementUsed: false,
            actionUsed: false
        };

        this.aimAngle = 0;
        this.aimPower = 50;
        this.trajectory = null;
        this.projectile = null;
        this.activeHighlight = null;
        this.turnTimer = null;
        
        this.terrainGraphics = null;
        this.terrainColliders = [];
        this.holes = [];
        
        // Track character ground states
        this.characterOnGround = {
            cat: false,
            dog: false,
            duck: false
        };
    }

    create() {
        console.log('Game scene started');
        
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        
        this.cameras.main.setBackgroundColor('#87CEEB');
        this.physics.world.setBounds(0, 0, this.gameWidth, this.gameHeight);
        
        this.createSimpleTerrain();
        this.createAnimals();
        this.setupInput();
        this.createUI();
        
        this.startTurn();
    }

    update(time, delta) {
        if (this.gameState.phase === 'aiming' && this.trajectory) {
            this.updateTrajectory();
        }
        
        this.checkCharacterFalling();
        this.applyFriction();
        this.updateGroundDetection();
    }

    // Ground detection using raycasting
    updateGroundDetection() {
        const characters = [
            { char: this.cat, name: 'cat' },
            { char: this.dog, name: 'dog' },
            { char: this.duck, name: 'duck' }
        ];

        characters.forEach(({ char, name }) => {
            if (!char || !char.body) {
                this.characterOnGround[name] = false;
                return;
            }

            // Use raycasting to detect ground below character
            const rayLength = 25;
            const startX = char.x;
            const startY = char.y + char.radius;
            const endY = startY + rayLength;

            let onGround = false;

            // Check against all terrain segments
            for (const segment of this.terrainColliders) {
                if (segment.destroyed || !segment.graphic) continue;

                // Simple AABB collision check for ground detection
                const charBottom = char.y + char.radius;
                const segmentTop = segment.y - segment.height / 2;
                
                // Check if character is within segment's horizontal bounds and close to the top
                if (Math.abs(charBottom - segmentTop) < 15 && 
                    char.x > segment.x - segment.width / 2 && 
                    char.x < segment.x + segment.width / 2) {
                    onGround = true;
                    break;
                }
            }

            this.characterOnGround[name] = onGround;
        });
    }

    // Check if specific character is on ground
    isCharacterOnGround(character) {
        if (character === this.cat) return this.characterOnGround.cat;
        if (character === this.dog) return this.characterOnGround.dog;
        if (character === this.duck) return this.characterOnGround.duck;
        return false;
    }

    applyFriction() {
        const characters = [this.cat, this.dog, this.duck];
        characters.forEach(character => {
            if (character && character.body) {
                // Apply friction only when on ground
                if (this.isCharacterOnGround(character)) {
                    // Gradually reduce horizontal velocity
                    character.body.velocity.x *= 0.92;
                    
                    // Stop completely if moving very slowly
                    if (Math.abs(character.body.velocity.x) < 5) {
                        character.body.velocity.x = 0;
                    }
                }
            }
        });
    }

    // TERRAIN METHODS
    createSimpleTerrain() {
        this.terrainGraphics = this.add.graphics();
        this.terrainColliders = [];
        
        const groundY = this.gameHeight - 100;
        const segmentWidth = 20;
        
        for (let x = 0; x < this.gameWidth; x += segmentWidth) {
            const segment = this.add.rectangle(
                x + segmentWidth / 2, 
                groundY + 50,
                segmentWidth, 
                100, 
                0x228B22, 
                0
            );
            
            this.physics.add.existing(segment, true);
            this.terrainColliders.push({
                graphic: segment,
                x: x + segmentWidth / 2,
                y: groundY + 50,
                width: segmentWidth,
                height: 100,
                destroyed: false
            });
        }
        
        this.addRealHills();
        this.drawTerrain();
    }

    addRealHills() {
        const groundY = this.gameHeight - 100;
        
        const hillData = [
            { x: 150, width: 120, height: 60 },
            { x: this.gameWidth / 2, width: 100, height: 40 },
            { x: this.gameWidth - 150, width: 120, height: 60 }
        ];
        
        hillData.forEach(hill => {
            const hillBody = this.add.rectangle(
                hill.x, 
                groundY - hill.height / 2, 
                hill.width, 
                hill.height, 
                0x1e7a1e, 
                0
            );
            
            this.physics.add.existing(hillBody, true);
            this.terrainColliders.push({
                graphic: hillBody,
                x: hill.x,
                y: groundY - hill.height / 2,
                width: hill.width,
                height: hill.height,
                destroyed: false,
                isHill: true
            });
        });
    }

    drawTerrain() {
        this.terrainGraphics.clear();
        
        this.terrainColliders.forEach(segment => {
            if (!segment.destroyed) {
                if (segment.isHill) {
                    this.terrainGraphics.fillStyle(0x1e7a1e, 1);
                    this.terrainGraphics.fillRect(
                        segment.x - segment.width / 2,
                        segment.y - segment.height / 2,
                        segment.width,
                        segment.height
                    );
                } else {
                    this.terrainGraphics.fillStyle(0x228B22, 1);
                    this.terrainGraphics.fillRect(
                        segment.x - segment.width / 2,
                        segment.y - segment.height / 2,
                        segment.width,
                        segment.height
                    );
                }
            }
        });
    }

    destroyTerrain(centerX, centerY, radius) {
        console.log(`Destroy terrain at (${Math.floor(centerX)}, ${Math.floor(centerY)}) radius ${radius}`);
        
        let destroyedAny = false;
        
        this.terrainColliders.forEach(segment => {
            if (segment.destroyed) return;
            
            const distance = Phaser.Math.Distance.Between(centerX, centerY, segment.x, segment.y);
            const maxDimension = Math.max(segment.width, segment.height);
            
            if (distance < radius + maxDimension / 2) {
                segment.destroyed = true;
                if (segment.graphic) {
                    segment.graphic.destroy();
                }
                destroyedAny = true;
            }
        });
        
        if (destroyedAny) {
            this.drawTerrain();
            this.setupTerrainCollisions();
        }
        
        return destroyedAny;
    }

    checkCharacterFalling() {
        const characters = [this.cat, this.dog, this.duck];
        const groundY = this.gameHeight - 100;
        
        characters.forEach(character => {
            if (!character.body) return;
            
            const isOnGround = this.isCharacterOnGround(character);
            
            if (!isOnGround) {
                character.body.setGravityY(400);
            } else {
                character.body.setGravityY(0);
                character.body.setVelocityY(0);
            }
            
            if (character.y > this.gameHeight + 100) {
                this.respawnCharacter(character);
            }
        });
    }

    respawnCharacter(character) {
        const groundY = this.gameHeight - 100;
        
        let safeX, safeY;
        let attempts = 0;
        
        do {
            safeX = Phaser.Math.Between(50, this.gameWidth - 50);
            safeY = groundY - 30;
            attempts++;
        } while (attempts < 20);
        
        character.x = safeX;
        character.y = safeY;
        character.body.setVelocity(0, 0);
        character.body.setGravityY(0);
        
        console.log(`Respawned character at (${safeX}, ${safeY})`);
    }

    // CHARACTER METHODS
    createAnimals() {
        const animalSize = 20;
        const groundY = this.gameHeight - 100;
        
        const positions = [
            { x: 150, y: groundY - 90 },
            { x: this.gameWidth / 2, y: groundY - 70 },
            { x: this.gameWidth - 150, y: groundY - 90 }
        ];
        
        // Cat
        this.cat = this.add.circle(positions[0].x, positions[0].y, animalSize, 0xff6b6b);
        this.physics.add.existing(this.cat);
        this.cat.body.setCollideWorldBounds(true);
        this.cat.body.setBounce(0.3);
        this.cat.body.setGravityY(400);

        // Dog
        this.dog = this.add.circle(positions[1].x, positions[1].y, animalSize, 0x4ecdc4);
        this.physics.add.existing(this.dog);
        this.dog.body.setCollideWorldBounds(true);
        this.dog.body.setBounce(0.3);
        this.dog.body.setGravityY(400);

        // Duck
        this.duck = this.add.circle(positions[2].x, positions[2].y, animalSize, 0xffe66d);
        this.physics.add.existing(this.duck);
        this.duck.body.setCollideWorldBounds(true);
        this.duck.body.setBounce(0.3);
        this.duck.body.setGravityY(400);

        this.setupTerrainCollisions();
    }

    setupTerrainCollisions() {
        const characters = [this.cat, this.dog, this.duck];
        
        characters.forEach(character => {
            this.terrainColliders.forEach(segment => {
                if (!segment.destroyed && segment.graphic) {
                    this.physics.add.collider(character, segment.graphic);
                }
            });
        });
    }

    // WEAPON & EXPLOSION METHODS - ADDED MISSING METHODS
    createExplosion(x, y, weapon) {
        console.log(`Creating explosion at (${x}, ${y}) with ${weapon.name}`);
        
        const terrainDestroyed = this.destroyTerrain(x, y, weapon.explosionRadius);
        
        // Bigger, more visible explosion
        const explosion = this.add.circle(x, y, 10, weapon.color);
        this.tweens.add({
            targets: explosion,
            radius: weapon.explosionRadius,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => explosion.destroy()
        });
        
        // Add explosion particles for better visibility
        this.createExplosionParticles(x, y, weapon.color);
        
        if (terrainDestroyed) {
            this.createDebris(x, y, weapon.explosionRadius);
        }
        
        this.applyAreaDamage(x, y, weapon.explosionRadius, weapon.damage);
        this.applyExplosionForce(x, y, weapon.explosionRadius);
    }

    createExplosionParticles(x, y, color) {
        const particleCount = 12;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = Phaser.Math.Between(10, 40);
            const particle = this.add.circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                3, color
            );
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance * 3,
                y: y + Math.sin(angle) * distance * 3,
                alpha: 0,
                duration: 600,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    createDebris(x, y, radius) {
        const debrisCount = Phaser.Math.Between(5, 10);
        
        for (let i = 0; i < debrisCount; i++) {
            const debris = this.add.rectangle(
                x + Phaser.Math.Between(-radius, radius),
                y + Phaser.Math.Between(-radius, radius),
                3, 3, 0x8B4513
            );
            
            this.physics.add.existing(debris);
            debris.body.setVelocity(
                Phaser.Math.Between(-200, 200),
                Phaser.Math.Between(-300, -100)
            );
            debris.body.setGravityY(400);
            
            this.time.delayedCall(Phaser.Math.Between(1000, 2000), () => {
                if (debris && debris.body) {
                    debris.destroy();
                }
            });
        }
    }

    applyExplosionForce(centerX, centerY, radius) {
        const characters = [this.cat, this.dog, this.duck];
        const forceMultiplier = 400;
        
        characters.forEach(character => {
            if (!character.body) return;
            
            const distance = Phaser.Math.Distance.Between(centerX, centerY, character.x, character.y);
            if (distance <= radius) {
                const force = (1 - (distance / radius)) * forceMultiplier;
                const angle = Phaser.Math.Angle.Between(centerX, centerY, character.x, character.y);
                
                character.body.setVelocity(
                    Math.cos(angle) * force,
                    Math.sin(angle) * force
                );
                
                character.body.setGravityY(300);
            }
        });
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
        this.checkGameOver();
    }

    // INPUT METHODS
    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        
        // MOVING PHASE
        this.cursors.left.on('down', () => {
            if (this.gameState.phase === 'moving') {
                const activeChar = this.getActiveCharacter();
                if (activeChar && activeChar.body) {
                    activeChar.body.setVelocityX(-300);
                }
            }
        });

        this.cursors.right.on('down', () => {
            if (this.gameState.phase === 'moving') {
                const activeChar = this.getActiveCharacter();
                if (activeChar && activeChar.body) {
                    activeChar.body.setVelocityX(300);
                }
            }
        });

        this.cursors.up.on('down', () => {
            if (this.gameState.phase === 'moving') {
                const activeChar = this.getActiveCharacter();
                if (activeChar && activeChar.body) {
                    // Always allow jump for testing
                    console.log('JUMP!');
                    activeChar.body.setVelocityY(-550);
                    
                    // Visual feedback for jump
                    this.tweens.add({
                        targets: activeChar,
                        scaleX: 1.2,
                        scaleY: 0.8,
                        duration: 100,
                        yoyo: true,
                        ease: 'Power2'
                    });
                }
            }
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
            if (this.gameState.phase === 'aiming') this.adjustAim(-5);
        });
        
        this.cursors.right.on('down', () => {
            if (this.gameState.phase === 'aiming') this.adjustAim(5);
        });
        
        this.cursors.up.on('down', () => {
            if (this.gameState.phase === 'aiming') this.adjustPower(10);
        });
        
        this.cursors.down.on('down', () => {
            if (this.gameState.phase === 'aiming') this.adjustPower(-10);
        });
    }

    // TURN & AIMING METHODS
    startTurn() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        
        console.log(`Start Turn: ${player.name} - Character ${characterIndex + 1}`);
        
        this.gameState.phase = 'moving';
        this.gameState.timeRemaining = this.gameState.turnTime;
        this.aimPower = 50;

        this.gameState.actionUsed = false;
        
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
            
            if (y > this.gameHeight || x < 0 || x > this.gameWidth) {
                break;
            }
        }
        
        return points;
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
        
        this.gameState.actionUsed = true;
        weapon.ammo--;
        
        this.gameState.phase = 'firing';
        this.clearTrajectory();
        this.createProjectile();
        
        this.updateUI();
        
        this.time.delayedCall(2000, this.endTurn, [], this);
    }

    createProjectile() {
        const activeChar = this.getActiveCharacter();
        const weapon = this.gameState.weapons[this.gameState.selectedWeapon];
        
        if (!activeChar) return;
        
        this.projectile = this.add.circle(activeChar.x, activeChar.y, 8, weapon.color);
        this.physics.add.existing(this.projectile);
        
        const angleRad = Phaser.Math.DegToRad(this.aimAngle);
        const velocity = this.aimPower * 8 * weapon.projectileSpeed;
        const velocityX = Math.cos(angleRad) * velocity;
        const velocityY = Math.sin(angleRad) * velocity;
        
        this.projectile.body.setVelocity(velocityX, velocityY);
        this.projectile.body.setBounce(0.3);
        this.projectile.body.setCollideWorldBounds(true);
        
        console.log(`Projectile created with velocity (${velocityX}, ${velocityY})`);
        
        // Terrain collision
        this.terrainColliders.forEach(segment => {
            if (!segment.destroyed && segment.graphic) {
                this.physics.add.collider(this.projectile, segment.graphic, () => {
                    this.handleProjectileImpact(weapon);
                });
            }
        });
        
        // Character collision
        const characters = [this.cat, this.dog, this.duck];
        characters.forEach(character => {
            this.physics.add.collider(this.projectile, character, () => {
                this.handleProjectileImpact(weapon, character);
            });
        });
        
        // Auto-destruct timer
        this.time.delayedCall(5000, () => {
            if (this.projectile) {
                this.handleProjectileImpact(weapon);
            }
        });
    }

    handleProjectileImpact(weapon, character = null) {
        if (!this.projectile) return;
        
        const impactX = this.projectile.x;
        const impactY = this.projectile.y;
        
        this.createExplosion(impactX, impactY, weapon);
        
        if (character) {
            this.applyDamageToCharacter(character, weapon.damage);
        }
        
        this.projectile.destroy();
        this.projectile = null;
    }

    // DAMAGE METHODS
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
            this.checkGameOver();
        }
    }

    getCharacterIndex(character) {
        const characters = [this.cat, this.dog, this.duck];
        return characters.indexOf(character);
    }

    // UI METHODS
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
                this.instructionText.setText(`ARROWS: Move Freely | SPACE: Start Aiming`);
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
        
        this.instructionText = this.add.text(padding, padding + 60, 'ARROWS: Move Freely | SPACE: Start Aiming', {
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

    // TURN MANAGEMENT
    endTurn() {
        console.log('Ending turn');
        
        if (this.turnTimer) {
            this.turnTimer.remove();
            this.turnTimer = null;
        }
        
        this.removeCharacterHighlight();
        this.clearTrajectory();
        
        if (this.projectile) {
            this.projectile.destroy();
            this.projectile = null;
        }
        
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

    getActiveCharacter() {
        const player = this.gameState.players[this.gameState.currentPlayer];
        const characterIndex = player.characters[player.activeCharacter];
        const characters = [this.cat, this.dog, this.duck];
        return characters[characterIndex];
    }

    clearTrajectory() {
        if (this.trajectory) {
            this.trajectory.destroy();
            this.trajectory = null;
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

    checkGameOver() {
        const alivePlayers = this.gameState.players.filter(player => {
            return player.characters.some(charIndex => this.gameState.characterHealth[charIndex] > 0);
        });
        
        if (alivePlayers.length <= 1) {
            const winner = alivePlayers[0];
            console.log(`Game Over! ${winner.name} wins!`);
            
            const gameOverText = this.add.text(this.gameWidth / 2, this.gameHeight / 2, `${winner.name} Wins!`, {
                font: 'bold 48px Arial',
                fill: '#ffffff'
            });
            gameOverText.setOrigin(0.5);
            gameOverText.setStroke('#000000', 6);
            
            this.gameState.phase = 'gameOver';
            if (this.turnTimer) {
                this.turnTimer.remove();
            }
        }
    }
}