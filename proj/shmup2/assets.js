// assets.js - Procedural assets generation
const Assets = (() => {
    const sprites = {};
    
    function createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    function generateShipSprite(type) {
        const canvas = createCanvas(32, 32);
        const ctx = canvas.getContext('2d');
        
        ctx.translate(16, 16);
        
        switch(type) {
            case 'striker':
                ctx.fillStyle = '#0ff';
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(-8, 8);
                ctx.lineTo(-4, 6);
                ctx.lineTo(0, 12);
                ctx.lineTo(4, 6);
                ctx.lineTo(8, 8);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#00a0a0';
                ctx.fillRect(-6, -4, 12, 8);
                
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(-3, -2, 2, 0, Math.PI * 2);
                ctx.arc(3, -2, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'ranger':
                ctx.fillStyle = '#0f0';
                ctx.beginPath();
                ctx.moveTo(-12, -8);
                ctx.lineTo(-6, -10);
                ctx.lineTo(0, -12);
                ctx.lineTo(6, -10);
                ctx.lineTo(12, -8);
                ctx.lineTo(10, 0);
                ctx.lineTo(12, 8);
                ctx.lineTo(6, 6);
                ctx.lineTo(0, 12);
                ctx.lineTo(-6, 6);
                ctx.lineTo(-12, 8);
                ctx.lineTo(-10, 0);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#008000';
                ctx.fillRect(-4, -4, 8, 8);
                break;
                
            case 'phantom':
                ctx.fillStyle = '#f0f';
                ctx.beginPath();
                ctx.moveTo(0, -14);
                ctx.lineTo(-10, -4);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-10, 8);
                ctx.lineTo(-4, 6);
                ctx.lineTo(0, 10);
                ctx.lineTo(4, 6);
                ctx.lineTo(10, 8);
                ctx.lineTo(6, 0);
                ctx.lineTo(10, -4);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#800080';
                ctx.beginPath();
                ctx.arc(0, -2, 4, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-4, -6);
                ctx.lineTo(4, -6);
                ctx.moveTo(-6, 2);
                ctx.lineTo(6, 2);
                ctx.stroke();
                break;
        }
        
        return canvas;
    }

    function generateEnemySprite(type) {
        const canvas = createCanvas(32, 32);
        const ctx = canvas.getContext('2d');
        
        ctx.translate(16, 16);
        
        switch(type) {
            case 'popcorn':
                ctx.fillStyle = '#f80';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#fa0';
                ctx.beginPath();
                ctx.arc(-2, -2, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'formation':
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(8, 6);
                ctx.lineTo(-8, 6);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#f80';
                ctx.fillRect(-4, -2, 8, 4);
                break;
                
            case 'side':
                ctx.fillStyle = '#fa0';
                ctx.fillRect(-10, -6, 20, 12);
                
                ctx.fillStyle = '#f00';
                ctx.fillRect(-8, -4, 16, 8);
                
                ctx.fillStyle = '#ff0';
                ctx.beginPath();
                ctx.arc(-4, 0, 2, 0, Math.PI * 2);
                ctx.arc(4, 0, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'circle':
                ctx.fillStyle = '#f0f';
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6;
                    const x = Math.cos(angle) * 8;
                    const y = Math.sin(angle) * 8;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#f8f';
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        return canvas;
    }

    function generateBossSprite(type) {
        const canvas = createCanvas(80, 80);
        const ctx = canvas.getContext('2d');
        
        ctx.translate(40, 40);
        
        if (type === 'midboss') {
            ctx.fillStyle = '#f80';
            ctx.fillRect(-25, -20, 50, 40);
            
            ctx.fillStyle = '#f00';
            ctx.fillRect(-20, -15, 40, 30);
            
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(-10, -5, 4, 0, Math.PI * 2);
            ctx.arc(10, -5, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#fa0';
            for (let i = 0; i < 3; i++) {
                const x = -15 + i * 15;
                ctx.fillRect(x, 10, 8, 15);
            }
        } else {
            ctx.fillStyle = '#800';
            ctx.fillRect(-35, -30, 70, 60);
            
            ctx.fillStyle = '#f00';
            ctx.fillRect(-30, -25, 60, 50);
            
            ctx.fillStyle = '#600';
            ctx.fillRect(-25, -20, 50, 40);
            
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(-15, -8, 5, 0, Math.PI * 2);
            ctx.arc(15, -8, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#f80';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-20, 5);
            ctx.lineTo(0, 15);
            ctx.lineTo(20, 5);
            ctx.stroke();
            
            ctx.fillStyle = '#f00';
            for (let i = 0; i < 5; i++) {
                const x = -24 + i * 12;
                ctx.fillRect(x, 20, 6, 20);
            }
        }
        
        return canvas;
    }

    function generateItemSprite(type) {
        const canvas = createCanvas(16, 16);
        const ctx = canvas.getContext('2d');
        
        ctx.translate(8, 8);
        
        switch(type) {
            case 'power':
                ctx.fillStyle = '#f00';
                ctx.fillRect(-6, -6, 12, 12);
                
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('P', 0, 0);
                break;
                
            case 'bomb':
                ctx.fillStyle = '#ff0';
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('B', 0, 0);
                break;
                
            case 'medal':
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const r = i % 2 === 0 ? 6 : 3;
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#ff0';
                ctx.beginPath();
                ctx.arc(0, 0, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        return canvas;
    }

    function generateAppIcon(size) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#001a33');
        gradient.addColorStop(1, '#000a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        ctx.translate(size / 2, size / 2);
        ctx.scale(size / 64, size / 64);
        
        ctx.fillStyle = '#0ff';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-15, 15);
        ctx.lineTo(-8, 12);
        ctx.lineTo(0, 20);
        ctx.lineTo(8, 12);
        ctx.lineTo(15, 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, -20 - i * 8, 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        return canvas;
    }

    function init() {
        sprites.striker = generateShipSprite('striker');
        sprites.ranger = generateShipSprite('ranger');
        sprites.phantom = generateShipSprite('phantom');
        
        sprites.popcorn = generateEnemySprite('popcorn');
        sprites.formation = generateEnemySprite('formation');
        sprites.side = generateEnemySprite('side');
        sprites.circle = generateEnemySprite('circle');
        
        sprites.midboss = generateBossSprite('midboss');
        sprites.boss = generateBossSprite('boss');
        
        sprites.power = generateItemSprite('power');
        sprites.bomb = generateItemSprite('bomb');
        sprites.medal = generateItemSprite('medal');
        
        sprites.icon192 = generateAppIcon(192);
        sprites.icon512 = generateAppIcon(512);
    }

    function getShipSprite(type) {
        return sprites[type];
    }

    function getEnemySprite(type) {
        return sprites[type];
    }

    function getBossSprite(type) {
        return sprites[type];
    }

    function getItemSprite(type) {
        return sprites[type];
    }

    function getIconDataURL(size) {
        return sprites['icon' + size].toDataURL('image/png');
    }

    init();

    return {
        getShipSprite,
        getEnemySprite,
        getBossSprite,
        getItemSprite,
        getIconDataURL
    };
})();