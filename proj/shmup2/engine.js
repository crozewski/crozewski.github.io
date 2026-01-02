// engine.js - Core game engine
const Engine = (() => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    
    const state = {
        width: 360,
        height: 640,
        dpr: 1,
        running: false,
        paused: false,
        lastTime: 0,
        accumulator: 0,
        dt: 1/120,
        frame: 0,
        fps: 60,
        fpsTime: 0,
        fpsFrames: 0
    };

    const pools = {
        bullets: [],
        particles: [],
        enemies: [],
        items: []
    };

    const input = {
        keys: {},
        touch: {
            active: false,
            id: null,
            startX: 0,
            startY: 0,
            x: 0,
            y: 0,
            dx: 0,
            dy: 0
        },
        fire: false,
        bomb: false,
        prevFire: false,
        prevBomb: false
    };

    const camera = {
        x: 0,
        y: 0,
        shake: 0,
        shakeX: 0,
        shakeY: 0
    };

    let rngSeed = Date.now();
    
    function random() {
        rngSeed = (rngSeed * 9301 + 49297) % 233280;
        return rngSeed / 233280;
    }

    function randomRange(min, max) {
        return min + random() * (max - min);
    }

    function randomInt(min, max) {
        return Math.floor(randomRange(min, max + 1));
    }

    function setSeed(seed) {
        rngSeed = seed;
    }

    const audio = (() => {
        let context = null;
        let masterGain = null;
        let sfxGain = null;
        let musicGain = null;
        let unlocked = false;

        const settings = {
            sfxVolume: 0.7,
            musicVolume: 0.5
        };

        function init() {
            if (context) return;
            
            try {
                context = new (window.AudioContext || window.webkitAudioContext)();
                masterGain = context.createGain();
                sfxGain = context.createGain();
                musicGain = context.createGain();
                
                sfxGain.connect(masterGain);
                musicGain.connect(masterGain);
                masterGain.connect(context.destination);
                
                sfxGain.gain.value = settings.sfxVolume;
                musicGain.gain.value = settings.musicVolume;
            } catch(e) {
                console.warn('Audio not supported');
            }
        }

        function unlock() {
            if (!context || unlocked) return;
            
            if (context.state === 'suspended') {
                context.resume().then(() => {
                    unlocked = true;
                });
            } else {
                unlocked = true;
            }
        }

        function playTone(freq, duration, type = 'sine', gain = 0.3) {
            if (!context || !unlocked) return;
            
            const osc = context.createOscillator();
            const gainNode = context.createGain();
            
            osc.type = type;
            osc.frequency.value = freq;
            gainNode.gain.value = gain;
            
            osc.connect(gainNode);
            gainNode.connect(sfxGain);
            
            const now = context.currentTime;
            gainNode.gain.setValueAtTime(gain, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.start(now);
            osc.stop(now + duration);
        }

        function playShot() {
            playTone(800, 0.05, 'square', 0.1);
        }

        function playHit() {
            playTone(200, 0.1, 'sawtooth', 0.2);
        }

        function playExplosion() {
            if (!context || !unlocked) return;
            
            const noise = context.createBufferSource();
            const buffer = context.createBuffer(1, context.sampleRate * 0.3, context.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            noise.buffer = buffer;
            const gainNode = context.createGain();
            const filter = context.createBiquadFilter();
            
            filter.type = 'lowpass';
            filter.frequency.value = 500;
            
            gainNode.gain.value = 0.3;
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(sfxGain);
            
            const now = context.currentTime;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            noise.start(now);
            noise.stop(now + 0.3);
        }

        function playBomb() {
            playTone(100, 0.5, 'sawtooth', 0.4);
        }

        function playItem() {
            playTone(1200, 0.1, 'sine', 0.2);
            setTimeout(() => playTone(1600, 0.1, 'sine', 0.2), 50);
        }

        function playExtend() {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => playTone(800 + i * 200, 0.1, 'triangle', 0.2), i * 80);
            }
        }

        function playUI() {
            playTone(600, 0.05, 'square', 0.15);
        }

        function setSFXVolume(vol) {
            settings.sfxVolume = vol;
            if (sfxGain) sfxGain.gain.value = vol;
        }

        function setMusicVolume(vol) {
            settings.musicVolume = vol;
            if (musicGain) musicGain.gain.value = vol;
        }

        return {
            init, unlock,
            playShot, playHit, playExplosion, playBomb, playItem, playExtend, playUI,
            setSFXVolume, setMusicVolume
        };
    })();

    function initCanvas() {
        state.dpr = window.devicePixelRatio || 1;
        
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const aspectRatio = state.width / state.height;
        const containerAspect = containerWidth / containerHeight;
        
        let displayWidth, displayHeight;
        
        if (containerAspect > aspectRatio) {
            displayHeight = containerHeight;
            displayWidth = displayHeight * aspectRatio;
        } else {
            displayWidth = containerWidth;
            displayHeight = displayWidth / aspectRatio;
        }
        
        canvas.width = state.width * state.dpr;
        canvas.height = state.height * state.dpr;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        ctx.imageSmoothingEnabled = false;
        ctx.scale(state.dpr, state.dpr);
    }

    function initInput() {
        document.addEventListener('keydown', (e) => {
            input.keys[e.key.toLowerCase()] = true;
            
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            input.keys[e.key.toLowerCase()] = false;
        });

        const moveZone = document.getElementById('move-zone');
        const fireBtn = document.getElementById('fire-btn');
        const bombBtn = document.getElementById('bomb-btn');

        moveZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            input.touch.active = true;
            input.touch.id = touch.identifier;
            input.touch.startX = touch.clientX;
            input.touch.startY = touch.clientY;
            input.touch.x = touch.clientX;
            input.touch.y = touch.clientY;
            input.touch.dx = 0;
            input.touch.dy = 0;
        }, { passive: false });

        moveZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === input.touch.id) {
                    const newX = touch.clientX;
                    const newY = touch.clientY;
                    input.touch.dx = newX - input.touch.x;
                    input.touch.dy = newY - input.touch.y;
                    input.touch.x = newX;
                    input.touch.y = newY;
                    break;
                }
            }
        }, { passive: false });

        moveZone.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === input.touch.id) {
                    input.touch.active = false;
                    input.touch.id = null;
                    input.touch.dx = 0;
                    input.touch.dy = 0;
                    break;
                }
            }
        }, { passive: false });

        fireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            input.fire = true;
        }, { passive: false });

        fireBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            input.fire = false;
        }, { passive: false });

        bombBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            input.bomb = true;
            if (navigator.vibrate) navigator.vibrate(50);
        }, { passive: false });

        bombBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            input.bomb = false;
        }, { passive: false });

        canvas.addEventListener('touchstart', (e) => {
            audio.unlock();
        }, { passive: true });
    }

    function getInput() {
        const result = {
            left: input.keys['arrowleft'] || input.keys['a'],
            right: input.keys['arrowright'] || input.keys['d'],
            up: input.keys['arrowup'] || input.keys['w'],
            down: input.keys['arrowdown'] || input.keys['s'],
            fire: input.keys['z'] || input.keys['j'] || input.fire,
            bomb: input.keys['x'] || input.keys['k'] || input.bomb,
            pause: input.keys['p'],
            debug: input.keys['`'],
            touchDX: input.touch.dx,
            touchDY: input.touch.dy,
            firePressed: false,
            bombPressed: false
        };

        result.firePressed = result.fire && !input.prevFire;
        result.bombPressed = result.bomb && !input.prevBomb;

        input.prevFire = result.fire;
        input.prevBomb = result.bomb;
        input.touch.dx = 0;
        input.touch.dy = 0;

        return result;
    }

    function shakeCamera(intensity) {
        camera.shake = Math.max(camera.shake, intensity);
    }

    function updateCamera() {
        if (camera.shake > 0) {
            camera.shakeX = randomRange(-camera.shake, camera.shake);
            camera.shakeY = randomRange(-camera.shake, camera.shake);
            camera.shake *= 0.9;
            if (camera.shake < 0.1) camera.shake = 0;
        } else {
            camera.shakeX = 0;
            camera.shakeY = 0;
        }
    }

    function drawRect(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + camera.shakeX, y + camera.shakeY, w, h);
    }

    function drawCircle(x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + camera.shakeX, y + camera.shakeY, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawLine(x1, y1, x2, y2, color, width = 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1 + camera.shakeX, y1 + camera.shakeY);
        ctx.lineTo(x2 + camera.shakeX, y2 + camera.shakeY);
        ctx.stroke();
    }

    function drawText(text, x, y, size, color, align = 'left', outline = true) {
        ctx.font = `${size}px "Courier New", monospace`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        
        if (outline) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(text, x + camera.shakeX, y + camera.shakeY);
        }
        
        ctx.fillStyle = color;
        ctx.fillText(text, x + camera.shakeX, y + camera.shakeY);
    }

    function drawSprite(sprite, x, y, rotation = 0) {
        if (!sprite) return;
        
        ctx.save();
        ctx.translate(x + camera.shakeX, y + camera.shakeY);
        if (rotation) ctx.rotate(rotation);
        ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
        ctx.restore();
    }

    function checkCollision(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < r1 + r2;
    }

    function createParticle(x, y, vx, vy, life, color, size = 2) {
        let p = pools.particles.find(p => !p.active);
        if (!p) {
            p = { active: false };
            pools.particles.push(p);
        }
        
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.life = life;
        p.maxLife = life;
        p.color = color;
        p.size = size;
        
        return p;
    }

    function updateParticles() {
        for (let p of pools.particles) {
            if (!p.active) continue;
            
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            if (p.life <= 0) {
                p.active = false;
            }
        }
    }

    function drawParticles() {
        for (let p of pools.particles) {
            if (!p.active) continue;
            
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            drawCircle(p.x, p.y, p.size, p.color);
        }
        ctx.globalAlpha = 1;
    }

    function createExplosion(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = randomRange(1, 3);
            createParticle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                randomInt(20, 40),
                color,
                randomRange(2, 4)
            );
        }
    }

    const storage = (() => {
        function save(key, data) {
            try {
                localStorage.setItem('metro_aegis_' + key, JSON.stringify(data));
            } catch(e) {
                console.warn('Save failed');
            }
        }

        function load(key, defaultValue = null) {
            try {
                const item = localStorage.getItem('metro_aegis_' + key);
                return item ? JSON.parse(item) : defaultValue;
            } catch(e) {
                return defaultValue;
            }
        }

        return { save, load };
    })();

    function loop(currentTime) {
        if (!state.running) return;
        
        const deltaTime = Math.min((currentTime - state.lastTime) / 1000, 0.1);
        state.lastTime = currentTime;
        state.accumulator += deltaTime;

        state.fpsFrames++;
        if (currentTime - state.fpsTime >= 1000) {
            state.fps = state.fpsFrames;
            state.fpsFrames = 0;
            state.fpsTime = currentTime;
        }

        while (state.accumulator >= state.dt) {
            if (!state.paused && window.Game) {
                window.Game.update(state.dt);
            }
            updateCamera();
            updateParticles();
            state.accumulator -= state.dt;
            state.frame++;
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, state.width, state.height);

        if (window.Game) {
            window.Game.render(ctx);
        }

        drawParticles();

        requestAnimationFrame(loop);
    }

    function start() {
        if (state.running) return;
        state.running = true;
        state.lastTime = performance.now();
        state.fpsTime = performance.now();
        audio.init();
        loop(state.lastTime);
    }

    function pause() {
        state.paused = true;
    }

    function resume() {
        state.paused = false;
    }

    function isPaused() {
        return state.paused;
    }

    function getState() {
        return state;
    }

    return {
        init: () => {
            initCanvas();
            initInput();
            window.addEventListener('resize', initCanvas);
        },
        start, pause, resume, isPaused, getState, getInput,
        random, randomRange, randomInt, setSeed,
        audio, storage,
        shakeCamera,
        drawRect, drawCircle, drawLine, drawText, drawSprite,
        checkCollision,
        createParticle, createExplosion,
        pools
    };
})();

Engine.init();