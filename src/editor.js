const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#333',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function getPlatformTexture(scene, width) {
    const key = `platform_${width}`;
    if (scene.textures.exists(key)) return key;

    const height = 77;
    const rt = scene.make.renderTexture({ width: width, height: height }, false);

    // Draw left edge (7px wide)
    const left = scene.add.image(0, 0, 'grass-left').setOrigin(0, 0).setVisible(false);
    rt.draw(left, 0, 0);

    // Draw right edge (7px wide)
    const right = scene.add.image(width, 0, 'grass-right').setOrigin(1, 0).setVisible(false);
    rt.draw(right, width, 0);

    // Tile middle (grass-middle is already without edges and tileable)
    const middleWidth = width - 14;
    if (middleWidth > 0) {
        const middle = scene.add.tileSprite(7, 0, middleWidth, height, 'grass-middle').setOrigin(0, 0).setVisible(false);
        rt.draw(middle, 7, 0);
        middle.destroy();
    }

    left.destroy();
    right.destroy();

    rt.saveTexture(key);
    rt.destroy();
    return key;
}

let currentTool = 'select';
let selectedObject = null;
let levelData = {
    width: 2400,
    height: 600,
    platforms: [],
    carrots: [],
    eggs: [],
    mushrooms: [],
    exit: null
};

// Groups
let platforms;
let carrots;
let eggs;
let mushrooms;
let exitObj;
let cursors;

function preload() {
    this.load.image('grass-left', 'assets/grass-left.png');
    this.load.image('grass-middle', 'assets/grass-middle.png');
    this.load.image('grass-right', 'assets/grass-right.png');
    this.load.image('carrot', 'assets/carrot.png');
    this.load.image('egg', 'assets/egg.png');
    this.load.image('mushroom', 'assets/mushroom.png');

    let graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Platform
    graphics.clear();
    graphics.fillStyle(0x228b22, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(0, 24, 32, 8);
    graphics.generateTexture('platform', 32, 32);

    // Exit
    graphics.clear();
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillRect(4, 0, 24, 32);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(22, 16, 2);
    graphics.generateTexture('exit', 32, 32);
}

function create() {
    this.physics.world.setBounds(0, 0, levelData.width, levelData.height);
    this.cameras.main.setBounds(0, 0, levelData.width, levelData.height);

    platforms = this.physics.add.group();
    cursors = this.input.keyboard.createCursorKeys();
    carrots = this.physics.add.group();
    eggs = this.physics.add.group();
    mushrooms = this.physics.add.group();

    // Mouse wheel panning
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        this.cameras.main.scrollX += deltaY;
    });

    // Initial setup
    setupUI(this);

    // Click to select or add
    this.input.on('pointerdown', (pointer) => {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        if (currentTool === 'select') {
            const hit = this.physics.overlapRect(worldPoint.x - 1, worldPoint.y - 1, 2, 2);
            if (hit.length > 0) {
                selectObject(hit[0].gameObject);
            } else {
                deselectObject();
            }
        } else {
            addObject(this, worldPoint.x, worldPoint.y, currentTool);
        }
    });

    // Drag to move
    this.input.on('pointermove', (pointer) => {
        if (currentTool === 'select' && selectedObject && pointer.isDown) {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            selectedObject.x = worldPoint.x;
            selectedObject.y = worldPoint.y;

            if (selectedObject.body) {
                selectedObject.body.updateFromGameObject();
            }
        }
    });
}

function selectObject(obj) {
    deselectObject();
    selectedObject = obj;
    selectedObject.setTint(0xffff00);

    document.getElementById('delete-btn').style.display = 'block';
    if (selectedObject.data.type === 'platform') {
        document.getElementById('platform-scale-label').style.display = 'block';
        document.getElementById('platform-scale-x').value = selectedObject.data.scaleX;
    }
}

function deselectObject() {
    if (selectedObject) {
        selectedObject.clearTint();
    }
    selectedObject = null;
    document.getElementById('delete-btn').style.display = 'none';
    document.getElementById('platform-scale-label').style.display = 'none';
}

function addObject(scene, x, y, type) {
    let obj;
    if (type === 'platform') {
        const scaleX = 1;
        const scaleY = 1;
        const width = 32 * scaleX;
        const height = 32 * scaleY;
        const textureKey = getPlatformTexture(scene, width);
        const grassY = (y - height / 2 - 17) + 38.5;
        obj = platforms.create(x, grassY, textureKey).setInteractive();
        obj.setSize(width, height);
        obj.setOffset(0, 17);
        obj.data = { type: type, scaleX: scaleX, scaleY: scaleY };
    } else if (type === 'carrot') {
        obj = carrots.create(x, y, 'carrot').setInteractive();
        obj.setScale(0.3);
        if (obj.body) obj.body.updateFromGameObject();
    } else if (type === 'egg') {
        obj = eggs.create(x, y, 'egg').setInteractive();
        obj.setScale(0.3);
        if (obj.body) obj.body.updateFromGameObject();
    } else if (type === 'mushroom') {
        obj = mushrooms.create(x, y, 'mushroom').setInteractive();
        obj.setScale(0.25);
        if (obj.body) obj.body.updateFromGameObject();
    } else if (type === 'exit') {
        if (exitObj) exitObj.destroy();
        exitObj = scene.physics.add.staticSprite(x, y, 'exit').setInteractive();
        obj = exitObj;
    }

    if (obj) {
        if (!obj.data) obj.data = {};
        obj.data.type = type;
        selectObject(obj);
    }
}

function clearLevel() {
    platforms.clear(true, true);
    carrots.clear(true, true);
    eggs.clear(true, true);
    mushrooms.clear(true, true);
    if (exitObj) {
        exitObj.destroy();
        exitObj = null;
    }
}

function loadLevelData(scene, data) {
    clearLevel();
    levelData = data;

    document.getElementById('level-width').value = data.width;
    scene.physics.world.setBounds(0, 0, data.width, data.height);
    scene.cameras.main.setBounds(0, 0, data.width, data.height);

    if (data.platforms) {
        data.platforms.forEach(p => {
            const width = 32 * p.scaleX;
            const height = 32 * p.scaleY;
            const textureKey = getPlatformTexture(scene, width);
            const grassY = (p.y - height / 2 - 17) + 38.5;
            const obj = platforms.create(p.x, grassY, textureKey).setInteractive();
            obj.setSize(width, height);
            obj.setOffset(0, 17);
            obj.data = { type: 'platform', scaleX: p.scaleX, scaleY: p.scaleY };
        });
    }

    if (data.carrots) {
        data.carrots.forEach(c => {
            const obj = carrots.create(c.x, c.y || 0, 'carrot').setInteractive();
            obj.setScale(0.3);
            if (obj.body) obj.body.updateFromGameObject();
            obj.data = { type: 'carrot' };
        });
    }

    if (data.eggs) {
        data.eggs.forEach(e => {
            const obj = eggs.create(e.x, e.y, 'egg').setInteractive();
            obj.setScale(0.3);
            if (obj.body) obj.body.updateFromGameObject();
            obj.data = { type: 'egg' };
        });
    }

    if (data.mushrooms) {
        data.mushrooms.forEach(m => {
            const obj = mushrooms.create(m.x, m.y, 'mushroom').setInteractive();
            obj.setScale(0.25);
            if (obj.body) obj.body.updateFromGameObject();
            obj.data = { type: 'mushroom' };
        });
    }

    if (data.exit) {
        exitObj = scene.physics.add.staticSprite(data.exit.x, data.exit.y, 'exit').setInteractive();
        exitObj.data = { type: 'exit' };
    }
}

function saveLevelData() {
    const data = {
        width: parseInt(document.getElementById('level-width').value),
        height: 600,
        platforms: [],
        carrots: [],
        eggs: [],
        mushrooms: [],
        exit: null
    };

    platforms.children.iterate(p => {
        const height = 32 * p.data.scaleY;
        const collisionY = p.y - 38.5 + 17 + height / 2;
        data.platforms.push({ x: p.x, y: collisionY, scaleX: p.data.scaleX, scaleY: p.data.scaleY });
    });

    carrots.children.iterate(c => {
        data.carrots.push({ x: c.x, y: c.y });
    });

    eggs.children.iterate(e => {
        data.eggs.push({ x: e.x, y: e.y });
    });

    mushrooms.children.iterate(m => {
        data.mushrooms.push({ x: m.x, y: m.y });
    });

    if (exitObj) {
        data.exit = { x: exitObj.x, y: exitObj.y };
    }

    const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'level.json';
    a.click();
}

function update() {
    // Basic camera movement with arrows if needed
    if (cursors.left.isDown) {
        this.cameras.main.scrollX -= 5;
    } else if (cursors.right.isDown) {
        this.cameras.main.scrollX += 5;
    }
}

function setupUI(scene) {
    document.getElementById('load-btn').addEventListener('click', () => {
        fetch('levels/level1.json')
            .then(res => res.json())
            .then(data => loadLevelData(scene, data));
    });

    document.getElementById('upload-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            loadLevelData(scene, data);
        };
        reader.readAsText(file);
    });

    document.getElementById('save-btn').addEventListener('click', saveLevelData);

    document.getElementById('level-width').addEventListener('input', (e) => {
        const width = parseInt(e.target.value);
        if (width > 0) {
            scene.physics.world.setBounds(0, 0, width, 600);
            scene.cameras.main.setBounds(0, 0, width, 600);
        }
    });

    document.getElementById('platform-scale-x').addEventListener('input', (e) => {
        if (selectedObject && selectedObject.data.type === 'platform') {
            const scaleX = parseFloat(e.target.value);
            const scaleY = selectedObject.data.scaleY;
            const width = 32 * scaleX;
            const height = 32 * scaleY;
            const textureKey = getPlatformTexture(scene, width);
            selectedObject.setTexture(textureKey);
            selectedObject.data.scaleX = scaleX;
            selectedObject.setSize(width, height);
            selectedObject.setOffset(0, 17);
            if (selectedObject.body) {
                selectedObject.body.updateFromGameObject();
            }
        }
    });

    document.getElementById('delete-btn').addEventListener('click', () => {
        if (selectedObject) {
            if (selectedObject.data.type === 'exit') {
                exitObj = null;
            }
            selectedObject.destroy();
            deselectObject();
        }
    });

    const tools = ['select', 'platform', 'carrot', 'egg', 'mushroom', 'exit'];
    tools.forEach(tool => {
        document.getElementById(`tool-${tool}`).addEventListener('click', () => {
            currentTool = tool;
            tools.forEach(t => document.getElementById(`tool-${t}`).classList.remove('active'));
            document.getElementById(`tool-${tool}`).classList.add('active');

            // Hide selection-specific UI when tool changes
            document.getElementById('platform-scale-label').style.display = 'none';
            document.getElementById('delete-btn').style.display = 'none';
            selectedObject = null;
        });
    });
}
