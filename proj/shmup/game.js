//Start screen settings
var titleScreen = document.getElementById('titleScreen');
var shipSelectScreen = document.getElementById('shipSelectScreen');
var playerShipType; // To store the player's selected ship type

// Event Listener for Title Screen
titleScreen.addEventListener('click', function() {
    titleScreen.style.display = 'none';
    shipSelectScreen.style.display = 'block';
});

// Score setting
var score = 0;

// Event Listeners for Ship Selection
var ship1 = document.getElementById('ship1');
var ship2 = document.getElementById('ship2');

ship1.addEventListener('click', function() {
    playerShipType = 'ship1';
    shipSelectScreen.style.display = 'none';
    startGame(); // Assuming startGame is a function you will define
});

ship2.addEventListener('click', function() {
    playerShipType = 'ship2';
    shipSelectScreen.style.display = 'none';
    startGame();
});

// Get the canvas and context
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');

// Video settings
var backgroundVideo = document.createElement('video');
backgroundVideo.src = 'assets/tokyoBackground.mp4'; // Ensure this path is correct
backgroundVideo.loop = true;

// When the video can play through, start playing and drawing
backgroundVideo.addEventListener('canplaythrough', function() {
    backgroundVideo.play();
    requestAnimationFrame(gameLoop); // Start the game loop here if the video is essential
}, false);

// Background music settings
var backgroundMusic = new Audio('assets/backgroundMusic.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.5; // Adjust volume from 0.0 to 1.0 as needed

// Start playing the music when the game loads or starts
window.onload = function() {
    backgroundMusic.play();
};

var levelStartTime = Date.now();
var bossSpawned = false;

//Spawn settings
var lastSpawnTime = 0; // To track the last spawn time
var spawnInterval = 5000; // Interval to spawn new set of enemies

// Player settings
var player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    width: 60,
    height: 60,
    speed: 5,
    invincible: false
};
var playerLives = 3;
var invincibleTime = 2000;
var lastHitTime = -invincibleTime;

// Player image
var playerImage = new Image();
playerImage.src = 'assets/playerShip.png';

// Enemy image
var enemyImage = new Image();
enemyImage.src = 'assets/enemyShip.png';

var enemyShip2Image = new Image();
enemyShip2Image.src = 'assets/enemyShip2.png';

var enemyShip3Image = new Image();
enemyShip3Image.src = 'assets/enemyShip3.png';

var bossShip1Image = new Image();
bossShip1Image.src = 'assets/bossShip1.png';


// Enemy class
class Enemy {
    constructor(x, y, image) {
        this.x = x;
        this.y = y;
        this.width = image.width;
        this.height = image.height;
        this.speed = 2;
        this.hits = 0;
        this.image = image;
    }

    move() {
        this.y += this.speed;
    }

    draw() {
        ctx.drawImage(this.image, this.x, this.y);
    }

    isHit(bullet) {
        if (rectIntersect(this, bullet)) {
            this.hits++;
            if (this.hits >= 3) {
                return true; // Enemy should be removed after 3 hits
            }
        }
        return false;
    }
}

class Boss extends Enemy {
    constructor(x, y, image) {
        super(x, y, image);
        this.bossState = 'movingDown';
        this.bossMoveLimit = { left: 0, right: canvas.width - this.width };
        this.oscillationSpeed = 0.02; // Slower oscillation (frequency)
        this.oscillationAmplitude = 10; // Smaller bounce (amplitude)
        this.oscillationOffset = 0; // Starting point of the oscillation
        this.speed = 1; // Slower speed for boss movement
    }

    move() {
        this.oscillationOffset += this.oscillationSpeed;

        switch (this.bossState) {
            case 'movingDown':
                this.y += this.speed / 2; // Slower downward movement
                if (this.y >= canvas.height / 12) { // Adjusting stopping point a bit higher
                    this.bossState = 'movingLeft';
                }
                break;
            case 'movingLeft':
                this.x -= this.speed;
                this.y += Math.sin(this.oscillationOffset) * this.oscillationAmplitude;
                if (this.x <= this.bossMoveLimit.left) {
                    this.bossState = 'movingRight';
                }
                break;
            case 'movingRight':
                this.x += this.speed;
                this.y += Math.sin(this.oscillationOffset) * this.oscillationAmplitude;
                if (this.x >= this.bossMoveLimit.right) {
                    this.bossState = 'movingLeft';
                }
                break;
        }
    }

    // ... Any other boss-specific methods ...
}




//Level Management System
function manageLevel() {
    var currentTime = Date.now();
    var elapsedTime = currentTime - levelStartTime;

    if (elapsedTime < 20000 && !bossSpawned) {
        // Check for enemy spawning every spawnInterval milliseconds
        if (currentTime - lastSpawnTime > spawnInterval) {
            lastSpawnTime = currentTime;
            spawnEnemies(elapsedTime);
        }
    } else if (!bossSpawned) {
        spawnBoss();
        bossSpawned = true;
    }
}


function spawnEnemies(elapsedTime) {
    // Define different enemy sets based on elapsed time
    if (elapsedTime < 15000) {
        for (var i = 0; i < 10; i++) {
            enemies.push(new Enemy(randomX(), -enemyImage.height, enemyImage));
        }
    } else if (elapsedTime < 30000) {
        for (var i = 0; i < 7; i++) {
            enemies.push(new Enemy(randomX(), -enemyShip2Image.height, enemyShip2Image));
        }
    } else {
        for (var i = 0; i < 8; i++) {
            enemies.push(new Enemy(randomX(), -enemyShip3Image.height, enemyShip3Image));
        }
    }
}

function randomX() {
    return Math.random() * (canvas.width - enemyImage.width);
}

function spawnBoss() {
    enemies.push(new Boss(canvas.width / 2 - bossShip1Image.width / 2, -bossShip1Image.height, bossShip1Image));
}




// Bullet class
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 10;
        this.speed = 10;
    }

    move() {
        this.y -= this.speed;
    }

    draw() {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Game entities
var enemies = [];
var maxEnemies = 5;
var bullets = [];

// Bullet shooting settings
var lastBulletTime = 0;
var bulletInterval = 100;

// Input settings
var rightPressed = false;
var leftPressed = false;
var upPressed = false;
var downPressed = false;
var spacePressed = false;

// Sound effects
var hitSound = new Audio('assets/hitSound.wav');

// Event listeners for keyboard input


document.addEventListener('keydown', function(event) {
     // Start the background music on the first key press if it's not already playing
     if (backgroundMusic.paused) {
        backgroundMusic.play();
    }
    switch (event.key) {
        case 'Right': case 'ArrowRight': rightPressed = true; break;
        case 'Left': case 'ArrowLeft': leftPressed = true; break;
        case 'Up': case 'ArrowUp': upPressed = true; break;
        case 'Down': case 'ArrowDown': downPressed = true; break;
        case ' ': case 'Spacebar': spacePressed = true; break;
    }
});

document.addEventListener('keyup', function(event) {
    switch (event.key) {
        case 'Right': case 'ArrowRight': rightPressed = false; break;
        case 'Left': case 'ArrowLeft': leftPressed = false; break;
        case 'Up': case 'ArrowUp': upPressed = false; break;
        case 'Down': case 'ArrowDown': downPressed = false; break;
        case ' ': case 'Spacebar': spacePressed = false; break;
    }
});

// Shooting function
function shoot(currentTime) {
    if (currentTime - lastBulletTime > bulletInterval) {
        bullets.push(new Bullet(player.x + 20, player.y - 5));
        lastBulletTime = currentTime;
    }
}

// Update game state
function update(deltaTime) {
    if (spacePressed) shoot(Date.now());

    // Update player position
    if (rightPressed && player.x < canvas.width - player.width) player.x += player.speed;
    if (leftPressed && player.x > 0) player.x -= player.speed;
    if (upPressed && player.y > 0) player.y -= player.speed;
    if (downPressed && player.y < canvas.height - player.height) player.y += player.speed;

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].move();
        if (bullets[i].y < 0) bullets.splice(i, 1);
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].move();
        if (enemies[i].y > canvas.height) enemies.splice(i, 1);
    }

    // Check collisions
    checkCollisions();
}

// Check for collisions
function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let bulletRemoved = false;

        for (let j = enemies.length - 1; j >= 0; j--) {
            if (rectIntersect(bullets[i], enemies[j])) {
                enemies[j].hits++; // Increment hit counter

                // Update score based on the enemy type
                if (enemies[j].image === enemyImage) {
                    score += 870;
                } else if (enemies[j].image === enemyShip2Image) {
                    score += 1230;
                } else if (enemies[j].image === enemyShip3Image) {
                    score += 620;
                } else if (enemies[j].image === bossShip1Image) {
                    score += 500;
                }

                // Check if enemy has been hit 3 times
                if (enemies[j].hits >= 3) {
                    enemies.splice(j, 1); // Remove enemy
                    hitSound.play(); // Play hit sound
                }

                bullets.splice(i, 1); // Remove bullet
                bulletRemoved = true;
                break; // Stop checking other enemies for this bullet
            }
        }

        if (bulletRemoved) break; // Exit the loop to avoid further iteration since bullet is removed
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (rectIntersect(player, enemies[i])) {
            handlePlayerHit();
            break;
        }
    }
}




// Rectangle intersection for collision detection
function rectIntersect(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height && obj1.height + obj1.y > obj2.y;
}

// Handle player hit by enemy
function handlePlayerHit() {
    var currentTime = Date.now();
    if (currentTime - lastHitTime > invincibleTime && !player.invincible) {
        playerLives--;
        player.invincible = true;
        lastHitTime = currentTime;
        setTimeout(function() { player.invincible = false; }, invincibleTime);
    }
}

// Draw the game
function draw() {
    // Draw the video background first
    if (!backgroundVideo.paused && !backgroundVideo.ended) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(backgroundVideo, 0, 0, canvas.width, canvas.height);
    }

    // Draw player
    if (!player.invincible || Math.floor(Date.now() / 100) % 2) {
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    }

    // Draw bullets with hot pink color and a bright purple outline
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'hotpink'; // Set the stroke color to bright purple
    ctx.lineWidth = 2; // Set the width of the outline

    for (let bullet of bullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height); // Fill bullet
        ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height); // Outline bullet
    }

    // Draw enemies
    for (let enemy of enemies) {
        enemy.draw();
    }

    // Set common style for text
    ctx.font = '24px "Press Start 2P", cursive'; // Font style
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw score in the top left
    ctx.fillStyle = '#ff6600'; // Orange color for score
    ctx.fillText("Score: " + score, 10, 30);

    // Draw lives in the top right
    ctx.fillStyle = '#ff6600'; // Orange color for lives
    ctx.fillText("Lives: " + playerLives, canvas.width - 150, 30); // Adjust position as needed

    // Reset shadow settings to avoid affecting other elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}


// Main game loop
var lastTime;
function gameLoop(timestamp) {
    var deltaTime = timestamp - (lastTime || timestamp);
    lastTime = timestamp;
    manageLevel();
    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Start the game
requestAnimationFrame(gameLoop);
