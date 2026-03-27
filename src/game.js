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
        graphics.fillCircle(16, 18, 14); // Body (bottom at 32)
        graphics.fillEllipse(10, 8, 8, 16); // Left ear
        graphics.fillEllipse(22, 8, 8, 16); // Right ear
        graphics.fillStyle(0xffc0cb, 1); // Pink nose/inner ears
        graphics.fillCircle(16, 20, 3);
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

        // Touch Control Pad
        // Pad Base
        graphics.clear();
        graphics.fillStyle(0x000000, 0.4);
        graphics.fillCircle(60, 60, 60);
        graphics.lineStyle(2, 0xffffff, 0.6);
        graphics.strokeCircle(60, 60, 60);
        graphics.generateTexture('pad-base', 120, 120);

        // Pad Knob
        graphics.clear();
        graphics.fillStyle(0xffffff, 0.7);
        graphics.fillCircle(30, 30, 30);
        graphics.generateTexture('pad-knob', 60, 60);
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
        const width = this.scale.width;
        const height = this.scale.height;

        this.add.image(width / 2, height / 2, 'title').setDisplaySize(width, height);

        this.add.text(width / 2, height * 0.8, 'Tryck för att starta', {
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

        // Draw left edge
        const left = this.add.image(0, 0, 'grass-left').setOrigin(0, 0).setVisible(false);
        rt.draw(left, 0, 0);

        // Draw right edge
        const right = this.add.image(width, 0, 'grass-right').setOrigin(1, 0).setVisible(false);
        rt.draw(right, width, 0);

        // Tile middle
        const middleWidth = width - 14;
        if (middleWidth > 0) {
            const middle = this.add.tileSprite(7, 0, middleWidth, height, 'grass-middle').setOrigin(0, 0).setVisible(false);
            rt.draw(middle, 7, 0);
            middle.destroy();
        }

        left.destroy();
        right.destroy();

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
            const textureKey = this.getPlatformTexture(width);

            // The grass texture is 77px high. The baseline is 17px from the top.
            // We want the physics body to be 32px high starting at that baseline.
            // grassY = p.y + 5.5 * p.scaleY (from previous calculation)
            const grassY = p.y + 5.5 * p.scaleY;

            const platform = this.platforms.create(p.x, grassY, textureKey);
            platform.setScale(1, p.scaleY);
            platform.refreshBody(); // This sets the body size to the sprite size (77 * scaleY)

            // Now adjust the hitbox to be 32px high (scaled), starting 17px (scaled) from the top
            platform.body.setSize(width, 32 * p.scaleY);
            platform.body.setOffset(0, 17 * p.scaleY);
        });

        // The player and its settings
        this.player = this.physics.add.sprite(100, 450, 'rabbit');
        this.player.setSize(24, 32);
        this.player.setOffset(4, 0);
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

        // Touch Control Pad
        this.touchButtons = { left: false, right: false, jump: false };
        this.jumpPointers = new Set();
        this.movePointer = null;

        if (!this.sys.game.device.os.desktop) {
            this.input.addPointer(2);

            const width = this.scale.width;
            const height = this.scale.height;
            const padX = width - 100;
            const padY = height - 100;

            const padBase = this.add.image(padX, padY, 'pad-base').setInteractive(new Phaser.Geom.Circle(60, 60, 60), Phaser.Geom.Circle.Contains).setScrollFactor(0).setDepth(100);
            const padKnob = this.add.image(padX, padY, 'pad-knob').setScrollFactor(0).setDepth(101);

            const updateMovement = (pointer) => {
                const dist = pointer.x - padX;
                const maxDist = 40;
                const clampedDist = Phaser.Math.Clamp(dist, -maxDist, maxDist);
                padKnob.x = padX + clampedDist;

                const deadZone = 10;
                this.touchButtons.left = clampedDist < -deadZone;
                this.touchButtons.right = clampedDist > deadZone;
            };

            padBase.on('pointerdown', (pointer) => {
                this.movePointer = pointer;
                updateMovement(pointer);
            });

            this.input.on('pointermove', (pointer) => {
                if (pointer === this.movePointer) {
                    updateMovement(pointer);
                }
            });

            this.input.on('pointerdown', (pointer) => {
                // If this pointer is already handled by the padBase pointerdown, ignore it here
                if (pointer === this.movePointer) return;

                const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, padX, padY);
                if (dist > 100) { // Pad radius (60) + margin
                    this.touchButtons.jump = true;
                    this.jumpPointers.add(pointer.id);
                }
            });

            this.input.on('pointerup', (pointer) => {
                if (pointer === this.movePointer) {
                    this.movePointer = null;
                    padKnob.x = padX;
                    this.touchButtons.left = false;
                    this.touchButtons.right = false;
                }

                if (this.jumpPointers.has(pointer.id)) {
                    this.jumpPointers.delete(pointer.id);
                    if (this.jumpPointers.size === 0) {
                        this.touchButtons.jump = false;
                    }
                }
            });
        }
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
        if (this.gameOver) return;
        this.gameOver = true;
        this.physics.pause();

        // Highlight the mushroom that killed the rabbit
        mushroom.setTint(0xffff00);
        mushroom.setDepth(100);
        player.setTint(0xff0000);

        const width = this.scale.width;
        const height = this.scale.height;

        const failImage = this.add.image(width / 2, height / 2, 'fail')
            .setDisplaySize(width, height)
            .setScrollFactor(0)
            .setAlpha(0)
            .setDepth(1000);

        const failText = this.add.text(width / 2, height * 0.17, 'SPELET SLUT', { fontSize: '64px', fill: '#f00', fontStyle: 'bold' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setAlpha(0)
            .setDepth(1001);

        const restartText = this.add.text(width / 2, height * 0.83, 'Tryck för att starta om', { fontSize: '32px', fill: '#fff' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setAlpha(0)
            .setDepth(1001);

        // Fade over to the fail image during 2.5 seconds
        this.tweens.add({
            targets: [failImage, failText, restartText],
            alpha: 1,
            duration: 2500,
            ease: 'Linear'
        });

        this.input.once('pointerdown', () => {
            this.scene.restart();
        });
    }

    reachExit(player, exit) {
        this.physics.pause();
        player.setTint(0x00ff00);
        this.gameOver = true;

        const width = this.scale.width;
        const height = this.scale.height;

        this.add.text(width / 2, height * 0.17, 'NIVÅ KLARAD!', { fontSize: '64px', fill: '#0f0' }).setOrigin(0.5).setScrollFactor(0);
        this.add.text(width / 2, height * 0.83, 'Tryck för att starta om', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setScrollFactor(0);

        this.input.once('pointerdown', () => {
            this.scene.restart();
        });
    }

    update() {
        if (this.gameOver) {
            return;
        }

        // Horizontal movement
        if (this.cursors.left.isDown || this.touchButtons.left) {
            this.player.setVelocityX(-160);
        } else if (this.cursors.right.isDown || this.touchButtons.right) {
            this.player.setVelocityX(160);
        } else {
            this.player.setVelocityX(0);
        }

        // Jumping
        if ((this.cursors.up.isDown || this.cursors.space.isDown || this.touchButtons.jump) && this.player.body.touching.down) {
            this.player.setVelocityY(-400);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1075,
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
            debug: false
        }
    },
    scene: [PreloadScene, TitleScene, GameScene]
};

const game = new Phaser.Game(config);
window.game = game;
