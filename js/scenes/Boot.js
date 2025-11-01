class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    create() {
        console.log('Boot scene started');
        // Immediately start the game scene
        this.scene.start('Game');
    }
}