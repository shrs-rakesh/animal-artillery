class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        console.log('Game scene started');
        
        // Get the actual game dimensions
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        
        console.log(`Game size: ${this.gameWidth}x${this.gameHeight}`);
        
        // Set background
        this.cameras.main.setBackgroundColor('#87CEEB');
        
        // Setup physics world to match game size
        this.physics.world.setBounds(0, 0, this.gameWidth, this.gameHeight);
        
        // Create game elements
        this.createGround();
        this.createAnimals();
        this.setupInput();
        this.addInstructions();
        
        // Handle resize
        this.scale.on('resize', this.resize, this);
    }

    update() {
        // Game loop
    }

    createGround() {
        // Create ground at bottom of screen
        const groundHeight = 100;
        const groundY = this.gameHeight - (groundHeight / 2);
        
        this.ground = this.add.rectangle(this.gameWidth / 2, groundY, this.gameWidth, groundHeight, 0x228B22);
        this.physics.add.existing(this.ground, true);
    }

    createAnimals() {
        // Calculate animal size based on screen size
        const animalSize = Math.min(this.gameWidth, this.gameHeight) * 0.04;
        const startY = this.gameHeight * 0.6;
        
        // Space animals evenly across the screen
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

        // Collide with ground
        this.physics.add.collider([this.cat, this.dog, this.duck], this.ground);
    }

    setupInput() {
        // Keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        
        // Jump force proportional to screen size
        const jumpForce = -this.gameHeight * 0.5;
        
        this.spacebar.on('down', () => {
            this.cat.body.setVelocityY(jumpForce);
        });
        
        this.cursors.up.on('down', () => {
            this.dog.body.setVelocityY(jumpForce);
        });
        
        this.enterKey.on('down', () => {
            this.duck.body.setVelocityY(jumpForce);
        });
    }

    addInstructions() {
        const fontSize = Math.max(16, this.gameWidth * 0.015);
        const padding = this.gameWidth * 0.02;
        
        this.add.text(padding, padding, 'Animal Artillery - Test Controls', {
            font: `bold ${fontSize}px Arial`,
            fill: '#2c3e50'
        });
        
        this.add.text(padding, padding + fontSize * 2, 'SPACE: Cat jumps', {
            font: `${fontSize}px Arial`,
            fill: '#ff6b6b'
        });
        
        this.add.text(padding, padding + fontSize * 3.5, 'UP ARROW: Dog jumps', {
            font: `${fontSize}px Arial`, 
            fill: '#4ecdc4'
        });
        
        this.add.text(padding, padding + fontSize * 5, 'ENTER: Duck jumps', {
            font: `${fontSize}px Arial`,
            fill: '#ffe66d'
        });
        
        this.add.text(padding, padding + fontSize * 7, `Screen: ${this.gameWidth}x${this.gameHeight}`, {
            font: `${fontSize * 0.8}px Arial`,
            fill: '#7f8c8d'
        });
    }

    resize(gameSize) {
        // Update our dimensions
        this.gameWidth = gameSize.width;
        this.gameHeight = gameSize.height;
        
        console.log(`Resized to: ${this.gameWidth}x${this.gameHeight}`);
        
        // Update camera
        this.cameras.main.setSize(this.gameWidth, this.gameHeight);
        
        // Clear and recreate everything on resize
        this.children.removeAll();
        this.create();
    }
}