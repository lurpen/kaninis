class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.load.json('level1', 'levels/level1.json');
        this.load.image('fail', 'assets/fail.jpg');
        this.load.image('title', 'assets/title.jpg');
        this.load.image('grass-left', 'assets/grass-left.png');
        this.load.image('grass-middle', 'assets/grass-middle.png');
        this.load.image('grass-right', 'assets/grass-right.png');
        this.load.image('carrot', 'assets/carrot.png');
        this.load.image('egg', 'assets/egg.png');

        let graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Rabbit (Kaninis) - White circle with ears
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(16, 16, 14); // Body
        graphics.fillEllipse(10, 6, 8, 16); // Left ear
        graphics.fillEllipse(22, 6, 8, 16); // Right ear
        graphics.fillStyle(0xffc0cb, 1); // Pink nose/inner ears
        graphics.fillCircle(16, 18, 3);
        graphics.generateTexture('rabbit', 32, 32);

        // Mushroom - Red cap with white dots
        graphics.clear();
        graphics.fillStyle(0xdddddd, 1);
        graphics.fillRect(12, 16, 8, 16); // Stem
        graphics.fillStyle(0xff0000, 1);
        graphics.fillCircle(16, 14, 14); // Cap
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(10, 10, 3);
        graphics.fillCircle(22, 10, 3);
        graphics.fillCircle(16, 6, 3);
        graphics.generateTexture('mushroom', 32, 32);

        // Platform - Green rectangle
        graphics.clear();
        graphics.fillStyle(0x228b22, 1);
        graphics.fillRect(0, 0, 32, 32);
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillRect(0, 24, 32, 8);
        graphics.generateTexture('platform', 32, 32);

        // Exit - Brown door
        graphics.clear();
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillRect(4, 0, 24, 32);
        graphics.fillStyle(0xffff00, 1);
        graphics.fillCircle(22, 16, 2);
        graphics.generateTexture('exit', 32, 32);
    }

    create() {
        this.scene.start('TitleScene');
    }
}

class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        this.add.image(400, 300, 'title').setDisplaySize(800, 600);

        this.add.text(400, 500, 'Tryck för att starta', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    getPlatformTexture(width) {
        const key = `platform_${width}`;
        if (this.textures.exists(key)) return key;

        const height = 77;
        const rt = this.make.renderTexture({ width: width, height: height }, false);

        const middle = this.add.tileSprite(0, 0, width, height, 'grass-middle').setOrigin(0, 0).setVisible(false);
        rt.draw(middle, 0, 0);
        middle.destroy();

        rt.saveTexture(key);
        rt.destroy();
        return key;
    }

    create() {
        const data = this.cache.json.get('level1');
        this.score = 0;
        this.gameOver = false;

        // Set world bounds
        this.physics.world.setBounds(0, 0, data.width, data.height);
        this.cameras.main.setBounds(0, 0, data.width, data.height);

        //  The platforms group
        this.platforms = this.physics.add.staticGroup();

        data.platforms.forEach(p => {
            const width = 32 * p.scaleX;
            const height = 32 * p.scaleY;
            const textureKey = this.getPlatformTexture(width);

            // The visual surface is 17px from the top.
            // Original platform top was at p.y - height/2.
            // New grass top should be at p.y - height/2 - 17.
            // Center of grass image (77px high) should be at (p.y - height/2 - 17) + 38.5.
            const grassY = (p.y - height / 2 - 17) + 38.5;

            const platform = this.platforms.create(p.x, grassY, textureKey);
            platform.setSize(width, height);
            platform.setOffset(0, 17);
            platform.refreshBody();
        });

        // The player and its settings
        this.player = this.physics.add.sprite(100, 450, 'rabbit');
        this.player.setOffset(0, 17);
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        // Camera follows player
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();

        //  Collide the player with the platforms
        this.physics.add.collider(this.player, this.platforms);

        // Carrots to collect
        this.carrots = this.physics.add.group();
        data.carrots.forEach(c => {
            const carrot = this.carrots.create(c.x, c.y || 0, 'carrot');
            carrot.setScale(0.3);
            carrot.refreshBody();
        });

        this.carrots.children.iterate(function (child) {
            child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        });

        // Easter Eggs
        this.eggs = this.physics.add.group();
        data.eggs.forEach(e => {
            const egg = this.eggs.create(e.x, e.y, 'egg');
            egg.setScale(0.3);
            egg.refreshBody();
        });

        this.eggs.children.iterate(function (child) {
            child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        });

        // Mushrooms - Hazards
        this.mushrooms = this.physics.add.staticGroup();
        data.mushrooms.forEach(m => {
            this.mushrooms.create(m.x, m.y, 'mushroom');
        });

        // Physics checks
        this.physics.add.collider(this.carrots, this.platforms);
        this.physics.add.collider(this.eggs, this.platforms);
        this.physics.add.collider(this.mushrooms, this.platforms);

        // Exit
        if (data.exit) {
            this.exit = this.physics.add.staticSprite(data.exit.x, data.exit.y, 'exit');
            this.physics.add.overlap(this.player, this.exit, this.reachExit, null, this);
        }

        // Overlaps and Collisions
        this.physics.add.overlap(this.player, this.carrots, this.collectCarrot, null, this);
        this.physics.add.overlap(this.player, this.eggs, this.collectEgg, null, this);
        this.physics.add.collider(this.player, this.mushrooms, this.hitMushroom, null, this);

        // Score Text - Fix it to the screen
        this.scoreText = this.add.text(16, 16, 'Poäng: 0', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' });
        this.scoreText.setScrollFactor(0);
        const titleText = this.add.text(16, 50, 'Kaninis Påskjakt', { fontSize: '18px', fill: '#fff' }).setAlpha(0.7);
        titleText.setScrollFactor(0);
    }

    collectCarrot(player, carrot) {
        carrot.disableBody(true, true);
        this.score += 10;
        this.scoreText.setText('Poäng: ' + this.score);

        if (this.carrots.countActive(true) === 0) {
            this.carrots.children.iterate(function (child) {
                child.enableBody(true, child.x, 0, true, true);
            });
        }
    }

    collectEgg(player, egg) {
        egg.disableBody(true, true);
        this.score += 100;
        this.scoreText.setText('Poäng: ' + this.score);
    }

    hitMushroom(player, mushroom) {
        this.physics.pause();
        player.setTint(0xff0000);
        this.gameOver = true;

        this.add.image(400, 300, 'fail').setDisplaySize(800, 600).setScrollFactor(0);
        this.add.text(400, 100, 'SPELET SLUT', { fontSize: '64px', fill: '#f00' }).setOrigin(0.5).setScrollFactor(0);
        this.add.text(400, 500, 'Tryck för att starta om', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setScrollFactor(0);

        this.input.once('pointerdown', () => {
            this.scene.restart();
        });
    }

    reachExit(player, exit) {
        this.physics.pause();
        player.setTint(0x00ff00);
        this.gameOver = true;

        this.add.text(400, 100, 'NIVÅ KLARAD!', { fontSize: '64px', fill: '#0f0' }).setOrigin(0.5).setScrollFactor(0);
        this.add.text(400, 500, 'Tryck för att starta om', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setScrollFactor(0);

        this.input.once('pointerdown', () => {
            this.scene.restart();
        });
    }

    update() {
        if (this.gameOver) {
            return;
        }

        // Horizontal movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
        } else {
            this.player.setVelocityX(0);
        }

        // Jumping
        if ((this.cursors.up.isDown || this.cursors.space.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(-400);
        }

        // Touch movement (Mobile support)
        const pointer = this.input.activePointer;
        if (pointer.isDown) {
            const width = this.sys.game.config.width;
            if (pointer.x < width / 3) {
                this.player.setVelocityX(-160);
            } else if (pointer.x > (width / 3) * 2) {
                this.player.setVelocityX(160);
            } else if (this.player.body.touching.down) {
                this.player.setVelocityY(-400);
            }
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: true
        }
    },
    scene: [PreloadScene, TitleScene, GameScene]
};

const game = new Phaser.Game(config);
window.game = game;
