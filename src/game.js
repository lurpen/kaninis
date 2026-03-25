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
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let platforms;
let cursors;
let carrots;
let eggs;
let mushrooms;
let score = 0;
let scoreText;
let gameOver = false;

function preload() {
    this.load.json('level1', 'levels/level1.json');
    this.load.image('fail', 'assets/fail.jpg');

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

    // Carrot - Orange triangle/cone
    graphics.clear();
    graphics.fillStyle(0xffa500, 1);
    graphics.fillTriangle(4, 4, 28, 4, 16, 28);
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRect(14, 0, 4, 6);
    graphics.generateTexture('carrot', 32, 32);

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

    // Easter Egg - Colorful ellipse
    graphics.clear();
    graphics.fillStyle(0xee82ee, 1);
    graphics.fillEllipse(16, 16, 24, 30);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillRect(8, 12, 16, 4);
    graphics.fillStyle(0x00ffff, 1);
    graphics.fillRect(8, 20, 16, 4);
    graphics.generateTexture('egg', 32, 32);

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

let exit;

function create() {
    const data = this.cache.json.get('level1');

    // Set world bounds
    this.physics.world.setBounds(0, 0, data.width, data.height);
    this.cameras.main.setBounds(0, 0, data.width, data.height);

    //  The platforms group
    platforms = this.physics.add.staticGroup();

    data.platforms.forEach(p => {
        platforms.create(p.x, p.y, 'platform').setScale(p.scaleX, p.scaleY).refreshBody();
    });

    // The player and its settings
    player = this.physics.add.sprite(100, 450, 'rabbit');
    player.setBounce(0.1);
    player.setCollideWorldBounds(true);

    // Camera follows player
    this.cameras.main.startFollow(player, true, 0.05, 0.05);

    //  Input Events
    cursors = this.input.keyboard.createCursorKeys();

    //  Collide the player with the platforms
    this.physics.add.collider(player, platforms);

    // Carrots to collect
    carrots = this.physics.add.group();
    data.carrots.forEach(c => {
        carrots.create(c.x, c.y || 0, 'carrot');
    });

    carrots.children.iterate(function (child) {
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    // Easter Eggs
    eggs = this.physics.add.group();
    data.eggs.forEach(e => {
        eggs.create(e.x, e.y, 'egg');
    });

    eggs.children.iterate(function (child) {
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });

    // Mushrooms - Hazards
    mushrooms = this.physics.add.staticGroup();
    data.mushrooms.forEach(m => {
        mushrooms.create(m.x, m.y, 'mushroom');
    });

    // Physics checks
    this.physics.add.collider(carrots, platforms);
    this.physics.add.collider(eggs, platforms);
    this.physics.add.collider(mushrooms, platforms);

    // Exit
    if (data.exit) {
        exit = this.physics.add.staticSprite(data.exit.x, data.exit.y, 'exit');
        this.physics.add.overlap(player, exit, reachExit, null, this);
    }

    // Overlaps and Collisions
    this.physics.add.overlap(player, carrots, collectCarrot, null, this);
    this.physics.add.overlap(player, eggs, collectEgg, null, this);
    this.physics.add.collider(player, mushrooms, hitMushroom, null, this);

    // Score Text - Fix it to the screen
    scoreText = this.add.text(16, 16, 'Poäng: 0', { fontSize: '32px', fill: '#fff', fontStyle: 'bold' });
    scoreText.setScrollFactor(0);
    const titleText = this.add.text(16, 50, 'Kaninis Påskjakt', { fontSize: '18px', fill: '#fff' }).setAlpha(0.7);
    titleText.setScrollFactor(0);
}

function collectCarrot(player, carrot) {
    carrot.disableBody(true, true);
    score += 10;
    scoreText.setText('Poäng: ' + score);

    if (carrots.countActive(true) === 0) {
        carrots.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true, true);
        });
    }
}

function collectEgg(player, egg) {
    egg.disableBody(true, true);
    score += 100;
    scoreText.setText('Poäng: ' + score);
}

function hitMushroom(player, mushroom) {
    this.physics.pause();
    player.setTint(0xff0000);
    gameOver = true;

    this.add.image(400, 300, 'fail').setDisplaySize(800, 600).setScrollFactor(0);
    this.add.text(400, 300, 'SPELET SLUT', { fontSize: '64px', fill: '#f00' }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(400, 380, 'Klicka för att starta om', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setScrollFactor(0);

    this.input.once('pointerdown', () => {
        score = 0;
        gameOver = false;
        this.scene.restart();
    });
}

function reachExit(player, exit) {
    this.physics.pause();
    player.setTint(0x00ff00);
    gameOver = true;

    this.add.text(400, 300, 'NIVÅ KLARAD!', { fontSize: '64px', fill: '#0f0' }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(400, 380, 'Klicka för att starta om', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setScrollFactor(0);

    this.input.once('pointerdown', () => {
        score = 0;
        gameOver = false;
        this.scene.restart();
    });
}

function update() {
    if (gameOver) {
        return;
    }

    // Horizontal movement
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
    } else {
        player.setVelocityX(0);
    }

    // Jumping
    if ((cursors.up.isDown || cursors.space.isDown) && player.body.touching.down) {
        player.setVelocityY(-400);
    }

    // Touch movement (Mobile support)
    const pointer = this.input.activePointer;
    if (pointer.isDown) {
        if (pointer.x < config.width / 3) {
            player.setVelocityX(-160);
        } else if (pointer.x > (config.width / 3) * 2) {
            player.setVelocityX(160);
        } else if (player.body.touching.down) {
            player.setVelocityY(-400);
        }
    }
}
