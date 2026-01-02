// game.js - Game logic (CORRECTED)
const Game = (() => {
    const PLAYFIELD_WIDTH = 360;
    const PLAYFIELD_HEIGHT = 640;
    const PLAYER_START_X = PLAYFIELD_WIDTH / 2;
    const PLAYER_START_Y = PLAYFIELD_HEIGHT - 80;

    let gameState = 'title';
    let selectedShip = null;
    let player = null;
    let score = 0;
    let hiScore = 0;
    let lives = 3;
    let bombs = 3;
    let powerLevel = 1;
    let medalChain = 0;
    let maxChain = 0;
    let medalValue = 100;
    let rank = 0.0;
    let stageTime = 0;
    let enemiesKilled = 0;
    let noMiss = true;
    let noBomb = true;
    let extendThresholds = [500000, 1000000];
    let nextExtendIndex = 0;

    const settings = {
        autofire: true,
        screenShake: true,
        highContrast: false
    };

    const shipTypes = {
        striker: {
            name: 'STRIKER',
            speed: 2.5,
            focusSpeed: 1.5,
            shotDelay: 4,
            shotPattern: (x, y, level) => {
                const bullets = [];
                if (level >= 1) bullets.push({ x, y: y - 10, vx: 0, vy: -8, damage: 1 });
                if (level >= 2) {
                    bullets.push({ x: x - 8, y: y - 5, vx: 0, vy: -8, damage: 1 });
                    bullets.push({ x: x + 8, y: y - 5, vx: 0, vy: -8, damage: 1 });
                }
                if (level >= 3) {
                    bullets.push({ x: x - 16, y, vx: 0, vy: -7, damage: 1 });
                    bullets.push({ x: x + 16, y, vx: 0, vy: -7, damage: 1 });
                }
                if (level >= 4) {
                    bullets.push({ x: x - 4, y: y - 8, vx: 0, vy: -9, damage: 1 });
                    bullets.push({ x: x + 4, y: y - 8, vx: 0, vy: -9, damage: 1 });
                }
                return bullets;
            },
            bomb: (px, py) => {
                player.invulnerable = 90;
                for (let i = 0; i < 60; i++) {
                    setTimeout(() => {
                        if (player) {
                            spawnPlayerBullet(player.x, player.y - 20 - i * 5, 0, -15, 3, '#0ff');
                            spawnPlayerBullet(player.x - 5, player.y - 20 - i * 5, 0, -15, 3, '#0ff');
                            spawnPlayerBullet(player.x + 5, player.y - 20 - i * 5, 0, -15, 3, '#0ff');
                        }
                    }, i * 2);
                }
                clearBulletsInRadius(px, py, 60);
            }
        },
        ranger: {
            name: 'RANGER',
            speed: 3.0,
            focusSpeed: 1.8,
            shotDelay: 3,
            shotPattern: (x, y, level) => {
                const bullets = [];
                const angles = level === 1 ? [0] : level === 2 ? [-0.2, 0, 0.2] : level === 3 ? [-0.4, -0.15, 0.15, 0.4] : [-0.5, -0.25, 0, 0.25, 0.5];
                for (let angle of angles) {
                    bullets.push({
                        x: x + Math.sin(angle) * 10,
                        y: y - 10,
                        vx: Math.sin(angle) * 3,
                        vy: -7 + Math.abs(angle) * 2,
                        damage: 0.7
                    });
                }
                return bullets;
            },
            bomb: (px, py) => {
                player.invulnerable = 60;
                clearBulletsInRadius(px, py, 150);
                for (let i = 0; i < 30; i++) {
                    const angle = (Math.PI * 2 * i) / 30;
                    spawnPlayerBullet(px, py, Math.cos(angle) * 5, Math.sin(angle) * 5, 2, '#ff0');
                }
            }
        },
        phantom: {
            name: 'PHANTOM',
            speed: 2.8,
            focusSpeed: 1.6,
            shotDelay: 8,
            shotPattern: (x, y, level) => {
                const bullets = [];
                const count = Math.min(level + 1, 4);
                for (let i = 0; i < count; i++) {
                    bullets.push({
                        x: x + (i - count / 2 + 0.5) * 12,
                        y: y - 5,
                        vx: 0,
                        vy: -1,
                        damage: 1.2,
                        homing: true
                    });
                }
                return bullets;
            },
            bomb: (px, py) => {
                player.invulnerable = 120;
                player.timeSlow = 120;
            }
        }
    };

    const enemies = [];
    const enemyBullets = [];
    const playerBullets = [];
    const items = [];
    const floatingTexts = [];

    let boss = null;
    let midboss = null;
    let stageScript = [];
    let scriptIndex = 0;

    function init() {
        hiScore = Engine.storage.load('hiscore', 0);
        loadSettings();
        showTitle();
    }

    function loadSettings() {
        const saved = Engine.storage.load('settings', {});
        settings.autofire = saved.autofire !== undefined ? saved.autofire : true;
        settings.screenShake = saved.screenShake !== undefined ? saved.screenShake : true;
        settings.highContrast = saved.highContrast !== undefined ? saved.highContrast : false;
        
        if (saved.sfxVolume !== undefined) Engine.audio.setSFXVolume(saved.sfxVolume);
        if (saved.musicVolume !== undefined) Engine.audio.setMusicVolume(saved.musicVolume);
        
        applySettings();
    }

    function saveSettings() {
        Engine.storage.save('settings', settings);
    }

    function applySettings() {
        document.getElementById('autofire-toggle').checked = settings.autofire;
        document.getElementById('shake-toggle').checked = settings.screenShake;
        document.getElementById('contrast-toggle').checked = settings.highContrast;
    }

    function showTitle() {
        gameState = 'title';
        document.getElementById('title-screen').classList.remove('hidden');
        document.getElementById('ship-select-screen').classList.add('hidden');
        document.getElementById('settings-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('touch-controls').classList.add('hidden');
    }

    function showShipSelect() {
        gameState = 'select';
        document.getElementById('title-screen').classList.add('hidden');
        document.getElementById('ship-select-screen').classList.remove('hidden');
        
        renderShipPreviews();
    }

    function renderShipPreviews() {
        const ships = ['striker', 'ranger', 'phantom'];
        ships.forEach(shipName => {
            const preview = document.getElementById(shipName + '-preview');
            const sprite = Assets.getShipSprite(shipName);
            if (sprite && preview) {
                preview.innerHTML = '';
                const canvas = document.createElement('canvas');
                canvas.width = 60;
                canvas.height = 60;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(sprite, 30 - sprite.width / 2, 30 - sprite.height / 2);
                preview.appendChild(canvas);
            }
        });
    }

    function startGame(ship) {
        selectedShip = ship;
        gameState = 'playing';
        
        score = 0;
        lives = 3;
        bombs = 3;
        powerLevel = 1;
        medalChain = 0;
        maxChain = 0;
        medalValue = 100;
        rank = 0.1;
        stageTime = 0;
        enemiesKilled = 0;
        noMiss = true;
        noBomb = true;
        nextExtendIndex = 0;
        
        enemies.length = 0;
        enemyBullets.length = 0;
        playerBullets.length = 0;
        items.length = 0;
        floatingTexts.length = 0;
        boss = null;
        midboss = null;
        
        const shipData = shipTypes[ship];
        player = {
            x: PLAYER_START_X,
            y: PLAYER_START_Y,
            vx: 0,
            vy: 0,
            radius: 2,
            hitboxRadius: 2,
            speed: shipData.speed,
            focusSpeed: shipData.focusSpeed,
            shotTimer: 0,
            shotDelay: shipData.shotDelay,
            invulnerable: 120,
            timeSlow: 0,
            ship: ship
        };
        
        initStageScript();
        scriptIndex = 0;
        
        document.getElementById('ship-select-screen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('touch-controls').classList.remove('hidden');
        
        updateHUD();
    }

    function initStageScript() {
        stageScript = [
            { time: 1, action: () => spawnWave('popcorn', 5, 100) },
            { time: 3, action: () => spawnWave('popcorn', 5, 100) },
            { time: 5, action: () => spawnWave('vformation', 7, 150) },
            { time: 8, action: () => spawnWave('side', 4, 200) },
            { time: 10, action: () => spawnWave('popcorn', 8, 100) },
            { time: 13, action: () => spawnWave('circle', 8, 180) },
            { time: 16, action: () => spawnWave('vformation', 9, 150) },
            { time: 19, action: () => spawnWave('side', 6, 200) },
            { time: 22, action: () => spawnWave('popcorn', 10, 100) },
            { time: 25, action: () => spawnWave('side', 5, 250) },
            { time: 28, action: () => spawnWave('circle', 10, 200) },
            { time: 32, action: () => spawnMidboss() },
            { time: 50, action: () => spawnWave('popcorn', 6, 120) },
            { time: 53, action: () => spawnWave('vformation', 8, 160) },
            { time: 56, action: () => spawnWave('side', 5, 220) },
            { time: 60, action: () => spawnWave('popcorn', 8, 110) },
            { time: 63, action: () => spawnWave('circle', 12, 180) },
            { time: 67, action: () => spawnWave('side', 6, 240) },
            { time: 71, action: () => spawnWave('vformation', 10, 170) },
            { time: 75, action: () => spawnBoss() }
        ];
    }

    function spawnWave(type, count, hp) {
        const baseHP = hp * (1 + rank * 0.5);
        
        switch(type) {
            case 'popcorn':
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        spawnEnemy(
                            Engine.randomRange(30, PLAYFIELD_WIDTH - 30),
                            -20,
                            'popcorn',
                            baseHP
                        );
                    }, i * 200);
                }
                break;
            case 'vformation':
                const vSpacing = 40;
                const vStartX = PLAYFIELD_WIDTH / 2 - (count - 1) * vSpacing / 2;
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        spawnEnemy(
                            vStartX + i * vSpacing,
                            -20 - Math.abs(i - count / 2) * 20,
                            'formation',
                            baseHP
                        );
                    }, i * 100);
                }
                break;
            case 'side':
                const side = Engine.random() > 0.5 ? 1 : -1;
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        spawnEnemy(
                            side > 0 ? -20 : PLAYFIELD_WIDTH + 20,
                            50 + i * 40,
                            'side',
                            baseHP,
                            side
                        );
                    }, i * 300);
                }
                break;
            case 'circle':
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 * i) / count;
                    setTimeout(() => {
                        spawnEnemy(
                            PLAYFIELD_WIDTH / 2 + Math.cos(angle) * 100,
                            100 + Math.sin(angle) * 100,
                            'circle',
                            baseHP
                        );
                    }, i * 80);
                }
                break;
        }
    }

    function spawnEnemy(x, y, type, hp, data = 0) {
        const enemy = {
            x, y,
            type,
            hp,
            maxHP: hp,
            radius: 12,
            timer: 0,
            data,
            shootTimer: 0,
            destroyed: false
        };
        enemies.push(enemy);
    }

    function spawnMidboss() {
        midboss = {
            x: PLAYFIELD_WIDTH / 2,
            y: -50,
            targetY: 120,
            hp: 2000 * (1 + rank),
            maxHP: 2000 * (1 + rank),
            radius: 30,
            timer: 0,
            phase: 0,
            shootTimer: 0,
            destroyed: false
        };
    }

    function spawnBoss() {
        boss = {
            x: PLAYFIELD_WIDTH / 2,
            y: -80,
            targetY: 100,
            hp: 5000 * (1 + rank * 0.8),
            maxHP: 5000 * (1 + rank * 0.8),
            radius: 40,
            timer: 0,
            phase: 0,
            shootTimer: 0,
            moveTimer: 0,
            destroyed: false
        };
    }

    function spawnItem(x, y, type) {
        items.push({
            x, y,
            vx: Engine.randomRange(-1, 1),
            vy: 1,
            type,
            timer: 0
        });
    }

    function spawnPlayerBullet(x, y, vx, vy, damage, color = '#0ff', homing = false) {
        playerBullets.push({
            x, y, vx, vy,
            damage,
            color,
            homing,
            homingTimer: 0,
            radius: 3
        });
    }

    function spawnEnemyBullet(x, y, vx, vy, color = '#f00') {
        const speed = 1 + rank * 0.5;
        enemyBullets.push({
            x, y,
            vx: vx * speed,
            vy: vy * speed,
            radius: 4,
            color
        });
    }

    function clearBulletsInRadius(x, y, radius) {
        let cleared = 0;
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            if (Engine.checkCollision(b.x, b.y, b.radius, x, y, radius)) {
                enemyBullets.splice(i, 1);
                Engine.createParticle(b.x, b.y, 0, 0, 10, '#ff0', 3);
                cleared++;
                addScore(10);
            }
        }
        if (cleared > 0) {
            Engine.audio.playHit();
        }
    }

    function addFloatingText(x, y, text, color = '#fff', size = 12) {
        floatingTexts.push({
            x, y,
            text,
            color,
            size,
            life: 60,
            vy: -1
        });
    }

    function addScore(points) {
        score += points;
        if (score > hiScore) {
            hiScore = score;
            Engine.storage.save('hiscore', hiScore);
        }
        
        while (nextExtendIndex < extendThresholds.length && score >= extendThresholds[nextExtendIndex]) {
            lives++;
            Engine.audio.playExtend();
            addFloatingText(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, 'EXTEND!', '#0f0', 20);
            nextExtendIndex++;
        }
    }

    function collectMedal() {
        medalChain++;
        if (medalChain > maxChain) maxChain = medalChain;
        
        const points = medalValue * medalChain;
        addScore(points);
        addFloatingText(player.x, player.y - 30, `+${points}`, '#ff0', 14);
        
        medalValue = Math.min(medalValue + 10, 1000);
        
        Engine.audio.playItem();
    }

    function breakChain() {
        if (medalChain > 0) {
            medalChain = 0;
            medalValue = 100;
            addFloatingText(PLAYFIELD_WIDTH / 2, 200, 'CHAIN BREAK', '#f00', 16);
        }
    }

    function updateRank(dt) {
        rank += dt * 0.01;
        rank += powerLevel * 0.0001;
        rank += medalChain * 0.00005;
        
        rank = Math.max(0, Math.min(rank, 2.0));
    }

    function playerDeath() {
        lives--;
        noMiss = false;
        rank = Math.max(0, rank - 0.3);
        powerLevel = Math.max(1, powerLevel - 1);
        medalChain = 0;
        medalValue = 100;
        
        Engine.createExplosion(player.x, player.y, '#0ff', 40);
        Engine.audio.playExplosion();
        if (settings.screenShake) Engine.shakeCamera(8);
        
        if (lives >= 0) {
            player.x = PLAYER_START_X;
            player.y = PLAYER_START_Y;
            player.invulnerable = 180;
            
            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                enemyBullets.splice(i, 1);
            }
        } else {
            gameOver();
        }
    }

    function useBomb() {
        if (bombs <= 0 || player.invulnerable > 0) return;
        
        bombs--;
        noBomb = false;
        rank = Math.max(0, rank - 0.2);
        
        const shipData = shipTypes[player.ship];
        shipData.bomb(player.x, player.y);
        
        Engine.audio.playBomb();
        if (settings.screenShake) Engine.shakeCamera(6);
        
        addFloatingText(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, 'BOMB!', '#ff0', 24);
    }

    function gameOver() {
        gameState = 'results';
        document.getElementById('results-title').textContent = 'GAME OVER';
        showResults();
    }

    function stageClear() {
        gameState = 'results';
        document.getElementById('results-title').textContent = 'STAGE CLEAR';
        
        let bonusScore = score;
        if (noMiss) bonusScore += 1000000;
        if (noBomb) bonusScore += 500000;
        
        setTimeout(() => showResults(bonusScore), 2000);
    }

    function showResults(finalScore = score) {
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('touch-controls').classList.add('hidden');
        
        document.getElementById('final-score').textContent = score.toLocaleString();
        document.getElementById('max-chain').textContent = maxChain;
        document.getElementById('no-miss-bonus').textContent = noMiss ? '1,000,000' : '0';
        document.getElementById('no-bomb-bonus').textContent = noBomb ? '500,000' : '0';
        document.getElementById('total-score').textContent = finalScore.toLocaleString();
        
        document.getElementById('results-screen').classList.remove('hidden');
    }

    function update(dt) {
        if (gameState !== 'playing') return;
        
        stageTime += dt;
        updateRank(dt);
        
        while (scriptIndex < stageScript.length && stageScript[scriptIndex].time <= stageTime) {
            stageScript[scriptIndex].action();
            scriptIndex++;
        }
        
        updatePlayer(dt);
        updateEnemies(dt);
        updateBullets(dt);
        updateItems(dt);
        updateBoss(dt);
        updateMidboss(dt);
        updateFloatingTexts(dt);
        
        checkCollisions();
        updateHUD();
        
        if (boss && boss.destroyed && stageTime > 120) {
            stageClear();
        }
    }

    function updatePlayer(dt) {
        if (!player) return;
        
        const input = Engine.getInput();
        
        if (input.bombPressed) {
            useBomb();
        }
        
        const speed = input.fire ? player.focusSpeed : player.speed;
        
        if (input.left) player.vx = -speed;
        else if (input.right) player.vx = speed;
        else player.vx = 0;
        
        if (input.up) player.vy = -speed;
        else if (input.down) player.vy = speed;
        else player.vy = 0;
        
        if (input.touchDX || input.touchDY) {
            player.vx = input.touchDX * 0.3;
            player.vy = input.touchDY * 0.3;
            
            const maxSpeed = speed * 1.5;
            const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            if (currentSpeed > maxSpeed) {
                player.vx = (player.vx / currentSpeed) * maxSpeed;
                player.vy = (player.vy / currentSpeed) * maxSpeed;
            }
        }
        
        player.x += player.vx;
        player.y += player.vy;
        
        player.x = Math.max(10, Math.min(PLAYFIELD_WIDTH - 10, player.x));
        player.y = Math.max(10, Math.min(PLAYFIELD_HEIGHT - 10, player.y));
        
        if (player.invulnerable > 0) {
            player.invulnerable--;
        }
        
        if (player.timeSlow > 0) {
            player.timeSlow--;
        }
        
        const shouldFire = (settings.autofire || input.fire);
        
        if (shouldFire) {
            player.shotTimer--;
            if (player.shotTimer <= 0) {
                const shipData = shipTypes[player.ship];
                const bullets = shipData.shotPattern(player.x, player.y, powerLevel);
                
                bullets.forEach(b => {
                    spawnPlayerBullet(b.x, b.y, b.vx, b.vy, b.damage, '#0ff', b.homing);
                });
                
                player.shotTimer = player.shotDelay;
                Engine.audio.playShot();
            }
        }
    }

    function updateEnemies(dt) {
        const timeScale = player && player.timeSlow > 0 ? 0.3 : 1;
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.timer++;
            
            switch(e.type) {
                case 'popcorn':
                    e.y += 1.5 * timeScale;
                    e.x += Math.sin(e.timer * 0.05) * 1 * timeScale;
                    
                    if (player && e.timer % Math.max(60 - rank * 20, 30) === 0 && e.y < PLAYFIELD_HEIGHT - 50) {
                        const angle = Math.atan2(player.y - e.y, player.x - e.x);
                        spawnEnemyBullet(e.x, e.y, Math.cos(angle) * 2, Math.sin(angle) * 2);
                    }
                    break;
                    
                case 'formation':
                    if (e.y < 100) {
                        e.y += 2 * timeScale;
                    } else {
                        e.x += Math.sin(e.timer * 0.03) * 2 * timeScale;
                    }
                    
                    if (player && e.timer % Math.max(80 - rank * 30, 40) === 0) {
                        const angle = Math.atan2(player.y - e.y, player.x - e.x);
                        spawnEnemyBullet(e.x, e.y, Math.cos(angle) * 2, Math.sin(angle) * 2);
                    }
                    break;
                    
                case 'side':
                    e.x += e.data * 2 * timeScale;
                    e.y += Math.sin(e.timer * 0.08) * 1 * timeScale;
                    
                    if (player && e.timer % Math.max(50 - rank * 15, 25) === 0) {
                        const angle = Math.atan2(player.y - e.y, player.x - e.x);
                        spawnEnemyBullet(e.x, e.y, Math.cos(angle) * 2.5, Math.sin(angle) * 2.5);
                    }
                    break;
                    
                case 'circle':
                    const targetX = PLAYFIELD_WIDTH / 2 + Math.cos(e.timer * 0.02) * 80;
                    const targetY = 120 + Math.sin(e.timer * 0.02) * 80;
                    e.x += (targetX - e.x) * 0.02 * timeScale;
                    e.y += (targetY - e.y) * 0.02 * timeScale;
                    
                    if (e.timer % Math.max(70 - rank * 25, 35) === 0) {
                        for (let j = 0; j < 3 + rank; j++) {
                            const angle = (Math.PI * 2 * j) / (3 + rank) + e.timer * 0.1;
                            spawnEnemyBullet(e.x, e.y, Math.cos(angle) * 2, Math.sin(angle) * 2);
                        }
                    }
                    break;
            }
            
            if (e.y > PLAYFIELD_HEIGHT + 50 || e.x < -50 || e.x > PLAYFIELD_WIDTH + 50) {
                enemies.splice(i, 1);
            }
        }
    }

    function updateMidboss(dt) {
        if (!midboss || midboss.destroyed) return;
        
        const timeScale = player && player.timeSlow > 0 ? 0.3 : 1;
        
        if (midboss.y < midboss.targetY) {
            midboss.y += 1 * timeScale;
        }
        
        midboss.timer++;
        
        const hpPercent = midboss.hp / midboss.maxHP;
        
        if (midboss.timer % Math.max(40 - rank * 10, 20) === 0) {
            const count = 5 + Math.floor(rank * 3);
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + midboss.timer * 0.05;
                spawnEnemyBullet(midboss.x, midboss.y, Math.cos(angle) * 2, Math.sin(angle) * 2, '#f80');
            }
        }
        
        if (player && midboss.timer % 120 === 0 && hpPercent < 0.5) {
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    if (midboss && !midboss.destroyed && player) {
                        const angle = Math.atan2(player.y - midboss.y, player.x - midboss.x);
                        spawnEnemyBullet(midboss.x, midboss.y, Math.cos(angle) * 3, Math.sin(angle) * 3, '#ff0');
                    }
                }, i * 50);
            }
        }
        
        midboss.x = PLAYFIELD_WIDTH / 2 + Math.sin(midboss.timer * 0.02) * 60;
    }

    function updateBoss(dt) {
        if (!boss || boss.destroyed) return;
        
        const timeScale = player && player.timeSlow > 0 ? 0.3 : 1;
        
        if (boss.y < boss.targetY) {
            boss.y += 1 * timeScale;
        }
        
        boss.timer++;
        boss.moveTimer++;
        
        const hpPercent = boss.hp / boss.max
        HP;
        
        if (hpPercent <= 0.35 && boss.phase < 2) {
            boss.phase = 2;
            clearBulletsInRadius(boss.x, boss.y, 1000);
            addFloatingText(PLAYFIELD_WIDTH / 2, 150, 'FINAL PHASE', '#f00', 20);
        } else if (hpPercent <= 0.7 && boss.phase < 1) {
            boss.phase = 1;
            clearBulletsInRadius(boss.x, boss.y, 1000);
            addFloatingText(PLAYFIELD_WIDTH / 2, 150, 'PHASE 2', '#f80', 18);
        }
        
        switch(boss.phase) {
            case 0:
                boss.x = PLAYFIELD_WIDTH / 2 + Math.sin(boss.moveTimer * 0.015) * 80;
                
                if (boss.timer % 30 === 0) {
                    const count = 8 + Math.floor(rank * 2);
                    for (let i = 0; i < count; i++) {
                        const angle = (Math.PI * 2 * i) / count + boss.timer * 0.08;
                        spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * 2, Math.sin(angle) * 2, '#f00');
                    }
                }
                
                if (player && boss.timer % 80 === 0) {
                    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
                    for (let i = 0; i < 5; i++) {
                        spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * (2 + i * 0.5), Math.sin(angle) * (2 + i * 0.5), '#ff0');
                    }
                }
                break;
                
            case 1:
                boss.x = PLAYFIELD_WIDTH / 2 + Math.cos(boss.moveTimer * 0.02) * 100;
                
                if (boss.timer % 25 === 0) {
                    const count = 12 + Math.floor(rank * 3);
                    for (let i = 0; i < count; i++) {
                        const angle = (Math.PI * 2 * i) / count + boss.timer * 0.1;
                        spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, '#f80');
                    }
                }
                
                if (player && boss.timer % 60 === 0) {
                    for (let i = 0; i < 3; i++) {
                        const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (i - 1) * 0.3;
                        for (let j = 0; j < 4; j++) {
                            spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * (2 + j * 0.7), Math.sin(angle) * (2 + j * 0.7), '#ff0');
                        }
                    }
                }
                break;
                
            case 2:
                boss.x = PLAYFIELD_WIDTH / 2 + Math.sin(boss.moveTimer * 0.03) * 120;
                boss.targetY = 80 + Math.sin(boss.moveTimer * 0.02) * 20;
                
                if (boss.timer % 20 === 0) {
                    const count = 16 + Math.floor(rank * 4);
                    for (let i = 0; i < count; i++) {
                        const angle = (Math.PI * 2 * i) / count + boss.timer * 0.15;
                        spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * 3, Math.sin(angle) * 3, '#f00');
                    }
                }
                
                if (player && boss.timer % 45 === 0) {
                    for (let i = 0; i < 5; i++) {
                        const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + (i - 2) * 0.2;
                        for (let j = 0; j < 6; j++) {
                            setTimeout(() => {
                                if (boss && !boss.destroyed) {
                                    spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, '#ff0');
                                }
                            }, j * 30);
                        }
                    }
                }
                
                if (boss.timer % 100 === 0) {
                    for (let i = 0; i < 20; i++) {
                        const angle = Engine.randomRange(0, Math.PI * 2);
                        spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * Engine.randomRange(1, 3), Math.sin(angle) * Engine.randomRange(1, 3), '#f0f');
                    }
                }
                break;
        }
    }

    function updateBullets(dt) {
        const timeScale = player && player.timeSlow > 0 ? 0.3 : 1;
        
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const b = playerBullets[i];
            
            if (b.homing && b.homingTimer++ % 2 === 0) {
                let target = null;
                let minDist = 200;
                
                for (let e of enemies) {
                    const dist = Math.sqrt((e.x - b.x) ** 2 + (e.y - b.y) ** 2);
                    if (dist < minDist) {
                        minDist = dist;
                        target = e;
                    }
                }
                
                if (!target && boss && !boss.destroyed) {
                    const dist = Math.sqrt((boss.x - b.x) ** 2 + (boss.y - b.y) ** 2);
                    if (dist < 300) target = boss;
                }
                
                if (!target && midboss && !midboss.destroyed) {
                    const dist = Math.sqrt((midboss.x - b.x) ** 2 + (midboss.y - b.y) ** 2);
                    if (dist < 300) target = midboss;
                }
                
                if (target) {
                    const angle = Math.atan2(target.y - b.y, target.x - b.x);
                    const speed = Math.sqrt(b.vx ** 2 + b.vy ** 2);
                    b.vx += Math.cos(angle) * 0.3;
                    b.vy += Math.sin(angle) * 0.3;
                    
                    const currentSpeed = Math.sqrt(b.vx ** 2 + b.vy ** 2);
                    if (currentSpeed > speed * 1.5) {
                        b.vx = (b.vx / currentSpeed) * speed * 1.5;
                        b.vy = (b.vy / currentSpeed) * speed * 1.5;
                    }
                }
            }
            
            b.x += b.vx;
            b.y += b.vy;
            
            if (b.y < -10 || b.x < -10 || b.x > PLAYFIELD_WIDTH + 10) {
                playerBullets.splice(i, 1);
            }
        }
        
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            b.x += b.vx * timeScale;
            b.y += b.vy * timeScale;
            
            if (b.y > PLAYFIELD_HEIGHT + 10 || b.x < -10 || b.x > PLAYFIELD_WIDTH + 10 || b.y < -10) {
                enemyBullets.splice(i, 1);
            }
        }
    }

    function updateItems(dt) {
        if (!player) return;
        
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            item.timer++;
            
            const dist = Math.sqrt((player.x - item.x) ** 2 + (player.y - item.y) ** 2);
            if (dist < 80 && player.y < item.y + 40) {
                item.vx = (player.x - item.x) * 0.1;
                item.vy = (player.y - item.y) * 0.1;
            }
            
            item.x += item.vx;
            item.y += item.vy;
            
            if (item.y > PLAYFIELD_HEIGHT + 20) {
                if (item.type === 'medal') {
                    breakChain();
                }
                items.splice(i, 1);
            }
        }
    }

    function updateFloatingTexts(dt) {
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const t = floatingTexts[i];
            t.y += t.vy;
            t.life--;
            
            if (t.life <= 0) {
                floatingTexts.splice(i, 1);
            }
        }
    }

    function checkCollisions() {
        if (!player || player.invulnerable > 0) return;
        
        for (let b of enemyBullets) {
            if (Engine.checkCollision(player.x, player.y, player.hitboxRadius, b.x, b.y, b.radius)) {
                playerDeath();
                return;
            }
        }
        
        for (let e of enemies) {
            if (Engine.checkCollision(player.x, player.y, player.hitboxRadius, e.x, e.y, e.radius)) {
                playerDeath();
                return;
            }
        }
        
        if (boss && !boss.destroyed) {
            if (Engine.checkCollision(player.x, player.y, player.hitboxRadius, boss.x, boss.y, boss.radius)) {
                playerDeath();
                return;
            }
        }
        
        if (midboss && !midboss.destroyed) {
            if (Engine.checkCollision(player.x, player.y, player.hitboxRadius, midboss.x, midboss.y, midboss.radius)) {
                playerDeath();
                return;
            }
        }
        
        for (let item of items) {
            if (Engine.checkCollision(player.x, player.y, 15, item.x, item.y, 8)) {
                const index = items.indexOf(item);
                if (index !== -1) items.splice(index, 1);
                
                switch(item.type) {
                    case 'power':
                        if (powerLevel < 4) {
                            powerLevel++;
                            Engine.audio.playItem();
                        } else {
                            addScore(1000);
                        }
                        break;
                    case 'bomb':
                        if (bombs < 9) {
                            bombs++;
                            Engine.audio.playItem();
                        } else {
                            addScore(5000);
                        }
                        break;
                    case 'medal':
                        collectMedal();
                        break;
                }
            }
        }
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            
            for (let j = playerBullets.length - 1; j >= 0; j--) {
                const b = playerBullets[j];
                
                if (Engine.checkCollision(e.x, e.y, e.radius, b.x, b.y, b.radius)) {
                    e.hp -= b.damage;
                    playerBullets.splice(j, 1);
                    Engine.createParticle(b.x, b.y, 0, 0, 10, '#0ff', 3);
                    
                    if (e.hp <= 0) {
                        enemies.splice(i, 1);
                        Engine.createExplosion(e.x, e.y, '#f80', 15);
                        Engine.audio.playHit();
                        addScore(100);
                        enemiesKilled++;
                        
                        if (Engine.random() < 0.3) spawnItem(e.x, e.y, 'power');
                        if (Engine.random() < 0.15) spawnItem(e.x, e.y, 'bomb');
                        if (Engine.random() < 0.5) spawnItem(e.x, e.y, 'medal');
                    }
                    break;
                }
            }
        }
        
        if (boss && !boss.destroyed) {
            for (let j = playerBullets.length - 1; j >= 0; j--) {
                const b = playerBullets[j];
                
                if (Engine.checkCollision(boss.x, boss.y, boss.radius, b.x, b.y, b.radius)) {
                    boss.hp -= b.damage;
                    playerBullets.splice(j, 1);
                    Engine.createParticle(b.x, b.y, 0, 0, 10, '#0ff', 3);
                    
                    if (boss.hp <= 0) {
                        boss.destroyed = true;
                        Engine.createExplosion(boss.x, boss.y, '#ff0', 50);
                        Engine.audio.playExplosion();
                        if (settings.screenShake) Engine.shakeCamera(10);
                        addScore(100000);
                        clearBulletsInRadius(boss.x, boss.y, 1000);
                        
                        for (let i = 0; i < 10; i++) {
                            spawnItem(boss.x + Engine.randomRange(-30, 30), boss.y + Engine.randomRange(-30, 30), 'power');
                        }
                    }
                }
            }
        }
        
        if (midboss && !midboss.destroyed) {
            for (let j = playerBullets.length - 1; j >= 0; j--) {
                const b = playerBullets[j];
                
                if (Engine.checkCollision(midboss.x, midboss.y, midboss.radius, b.x, b.y, b.radius)) {
                    midboss.hp -= b.damage;
                    playerBullets.splice(j, 1);
                    Engine.createParticle(b.x, b.y, 0, 0, 10, '#0ff', 3);
                    
                    if (midboss.hp <= 0) {
                        midboss.destroyed = true;
                        Engine.createExplosion(midboss.x, midboss.y, '#f80', 30);
                        Engine.audio.playExplosion();
                        if (settings.screenShake) Engine.shakeCamera(8);
                        addScore(50000);
                        clearBulletsInRadius(midboss.x, midboss.y, 1000);
                        
                        for (let i = 0; i < 5; i++) {
                            spawnItem(midboss.x + Engine.randomRange(-20, 20), midboss.y + Engine.randomRange(-20, 20), 'power');
                        }
                    }
                }
            }
        }
    }

    function updateHUD() {
        document.getElementById('score-display').textContent = score.toLocaleString();
        document.getElementById('hiscore-display').textContent = hiScore.toLocaleString();
        document.getElementById('power-display').textContent = powerLevel;
        
        const livesDisplay = document.getElementById('lives-display');
        livesDisplay.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            const icon = document.createElement('div');
            icon.textContent = '♦';
            icon.style.color = '#0ff';
            icon.style.fontSize = '16px';
            livesDisplay.appendChild(icon);
        }
        
        const bombsDisplay = document.getElementById('bombs-display');
        bombsDisplay.innerHTML = '';
        for (let i = 0; i < bombs; i++) {
            const icon = document.createElement('div');
            icon.textContent = '●';
            icon.style.color = '#ff0';
            icon.style.fontSize = '16px';
            bombsDisplay.appendChild(icon);
        }
        
        const chainDisplay = document.getElementById('chain-display');
        if (medalChain > 0) {
            chainDisplay.classList.remove('hidden');
            document.getElementById('chain-value').textContent = medalChain + 'x';
        } else {
            chainDisplay.classList.add('hidden');
        }
        
        const rankFill = document.getElementById('rank-fill');
        rankFill.style.width = Math.min(rank * 50, 100) + '%';
        
        const debugOverlay = document.getElementById('debug-overlay');
        if (!debugOverlay.classList.contains('hidden')) {
            document.getElementById('fps-display').textContent = Engine.getState().fps;
            document.getElementById('entity-count').textContent = enemies.length + enemyBullets.length + playerBullets.length;
            document.getElementById('rank-display').textContent = rank.toFixed(2);
            document.getElementById('debug-chain').textContent = medalChain;
        }
    }

    function render(ctx) {
        drawBackground(ctx);
        
        if (gameState === 'playing') {
            for (let b of enemyBullets) {
                Engine.drawCircle(b.x, b.y, b.radius, b.color);
            }
            
            for (let b of playerBullets) {
                Engine.drawCircle(b.x, b.y, b.radius, b.color);
            }
            
            for (let e of enemies) {
                const sprite = Assets.getEnemySprite(e.type);
                if (sprite) {
                    Engine.drawSprite(sprite, e.x, e.y, e.timer * 0.02);
                } else {
                    Engine.drawCircle(e.x, e.y, e.radius, '#f80');
                }
                
                const hpPercent = e.hp / e.maxHP;
                ctx.fillStyle = '#f00';
                ctx.fillRect(e.x - 10, e.y - e.radius - 5, 20 * hpPercent, 2);
            }
            
            if (midboss && !midboss.destroyed) {
                const sprite = Assets.getBossSprite('midboss');
                if (sprite) {
                    Engine.drawSprite(sprite, midboss.x, midboss.y, midboss.timer * 0.01);
                } else {
                    Engine.drawCircle(midboss.x, midboss.y, midboss.radius, '#f80');
                }
                
                const hpPercent = midboss.hp / midboss.maxHP;
                ctx.fillStyle = '#400';
                ctx.fillRect(20, 30, PLAYFIELD_WIDTH - 40, 8);
                ctx.fillStyle = '#f00';
                ctx.fillRect(20, 30, (PLAYFIELD_WIDTH - 40) * hpPercent, 8);
                Engine.drawText('MIDBOSS', PLAYFIELD_WIDTH / 2, 26, 12, '#f80', 'center');
            }
            
            if (boss && !boss.destroyed) {
                const sprite = Assets.getBossSprite('boss');
                if (sprite) {
                    Engine.drawSprite(sprite, boss.x, boss.y, boss.timer * 0.01);
                } else {
                    Engine.drawCircle(boss.x, boss.y, boss.radius, '#f00');
                }
                
                const hpPercent = boss.hp / boss.maxHP;
                ctx.fillStyle = '#400';
                ctx.fillRect(20, 30, PLAYFIELD_WIDTH - 40, 10);
                ctx.fillStyle = boss.phase === 2 ? '#f0f' : boss.phase === 1 ? '#f80' : '#f00';
                ctx.fillRect(20, 30, (PLAYFIELD_WIDTH - 40) * hpPercent, 10);
                Engine.drawText('BOSS', PLAYFIELD_WIDTH / 2, 24, 14, '#ff0', 'center');
            }
            
            for (let item of items) {
                const sprite = Assets.getItemSprite(item.type);
                if (sprite) {
                    Engine.drawSprite(sprite, item.x, item.y, item.timer * 0.1);
                } else {
                    const color = item.type === 'power' ? '#f00' : item.type === 'bomb' ? '#ff0' : '#0f0';
                    Engine.drawCircle(item.x, item.y, 6, color);
                }
            }
            
            if (player) {
                if (player.invulnerable === 0 || Math.floor(player.invulnerable / 5) % 2 === 0) {
                    const sprite = Assets.getShipSprite(player.ship);
                    if (sprite) {
                        Engine.drawSprite(sprite, player.x, player.y);
                    } else {
                        Engine.drawCircle(player.x, player.y, 8, '#0ff');
                    }
                    
                    Engine.drawCircle(player.x, player.y, player.hitboxRadius, 'rgba(255, 0, 0, 0.5)');
                }
            }
            
            for (let t of floatingTexts) {
                const alpha = t.life / 60;
                ctx.globalAlpha = alpha;
                Engine.drawText(t.text, t.x, t.y, t.size, t.color, 'center');
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, PLAYFIELD_HEIGHT);
        gradient.addColorStop(0, '#001a33');
        gradient.addColorStop(1, '#000a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
        
        ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 123 + stageTime * 10) % PLAYFIELD_WIDTH;
            const y = (i * 456 + stageTime * 20) % PLAYFIELD_HEIGHT;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    function setupUI() {
        document.getElementById('start-btn').addEventListener('click', () => {
            Engine.audio.playUI();
            showShipSelect();
        });
        
        document.getElementById('settings-btn').addEventListener('click', () => {
            Engine.audio.playUI();
            document.getElementById('title-screen').classList.add('hidden');
            document.getElementById('settings-screen').classList.remove('hidden');
        });
        
        document.querySelectorAll('.select-ship-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                Engine.audio.playUI();
                const card = e.target.closest('.ship-card');
                const ship = card.dataset.ship;
                startGame(ship);
            });
        });
        
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Engine.audio.playUI();
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                document.getElementById('title-screen').classList.remove('hidden');
            });
        });
        
        document.getElementById('sfx-volume').addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Engine.audio.setSFXVolume(val);
            document.getElementById('sfx-value').textContent = e.target.value + '%';
            Engine.storage.save('settings', { ...settings, sfxVolume: val });
        });
        
        document.getElementById('music-volume').addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Engine.audio.setMusicVolume(val);
            document.getElementById('music-value').textContent = e.target.value + '%';
            Engine.storage.save('settings', { ...settings, musicVolume: val });
        });
        
        document.getElementById('autofire-toggle').addEventListener('change', (e) => {
            settings.autofire = e.target.checked;
            saveSettings();
        });
        
        document.getElementById('shake-toggle').addEventListener('change', (e) => {
            settings.screenShake = e.target.checked;
            saveSettings();
        });
        
        document.getElementById('contrast-toggle').addEventListener('change', (e) => {
            settings.highContrast = e.target.checked;
            saveSettings();
        });
        
        document.getElementById('continue-btn').addEventListener('click', () => {
            Engine.audio.playUI();
            document.getElementById('results-screen').classList.add('hidden');
            showTitle();
        });
        
        document.getElementById('tap-to-start').addEventListener('click', () => {
            Engine.audio.unlock();
            document.getElementById('tap-to-start').style.display = 'none';
        });
        
        let prevPause = false;
        let prevDebug = false;
        
        setInterval(() => {
            const inp = Engine.getInput();
            
            if (inp.pause && !prevPause && gameState === 'playing') {
                if (Engine.isPaused()) {
                    Engine.resume();
                    document.getElementById('pause-screen').classList.add('hidden');
                } else {
                    Engine.pause();
                    document.getElementById('pause-screen').classList.remove('hidden');
                }
            }
            prevPause = inp.pause;
            
            if (inp.debug && !prevDebug) {
                document.getElementById('debug-overlay').classList.toggle('hidden');
                document.getElementById('rank-meter').classList.toggle('hidden');
            }
            prevDebug = inp.debug;
        }, 100);
        
        document.getElementById('resume-btn').addEventListener('click', () => {
            Engine.audio.playUI();
            Engine.resume();
            document.getElementById('pause-screen').classList.add('hidden');
        });
        
        document.getElementById('pause-settings-btn').addEventListener('click', () => {
            Engine.audio.playUI();
            document.getElementById('pause-screen').classList.add('hidden');
            document.getElementById('settings-screen').classList.remove('hidden');
        });
        
        document.getElementById('quit-btn').addEventListener('click', () => {
            Engine.audio.playUI();
            Engine.resume();
            gameState = 'title';
            document.getElementById('pause-screen').classList.add('hidden');
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('touch-controls').classList.add('hidden');
            showTitle();
        });
    }

    return {
        init,
        update,
        render,
        setupUI
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    Game.init();
    Game.setupUI();
    Engine.start();
});