/**
 * Dino Runner Game Logic
 * Handles game loop, player physics, obstacle generation, and scoring.
 */

// --- Game Constants & Setup ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game Settings
const GRAVITY = 0.6;
const JUMP_FORCE = -12; // Slightly higher jump for smooth cat feel
const GROUND_HEIGHT = 20; // Height of the ground from the bottom
const GAME_SPEED_START = 6;
const SPAWN_TIMER_MIN = 50;
const SPAWN_TIMER_MAX = 110;

// DOM Elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Game State Variables
let score = 0;
let highScore = 0;
let gameSpeed = GAME_SPEED_START;
let startSpawnTimer = SPAWN_TIMER_MAX;
let spawnTimer = startSpawnTimer;
let isGameOver = false;
let isGameRunning = false;

let animationId; // Check if we need to cancel animation frame
let obstacles = [];
let clouds = []; // Moving background clouds

// --- Player (Dino) Class ---
class Dino {
    constructor() {
        this.w = 40; // Width
        this.h = 40; // Height
        this.x = 50; // Initial X position
        this.y = canvas.height - GROUND_HEIGHT - this.h; // Initial Y position (on ground)

        this.dy = 0; // Vertical velocity
        this.jumpPower = JUMP_FORCE;
        this.originalY = canvas.height - GROUND_HEIGHT - this.h; // Ground Y position
        this.grounded = true; // Is the dino on the ground?
    }

    animate() {
        // Jump
        if (keys['Space'] || keys['ArrowUp']) {
            this.jump();
        } else {
            this.jumpTimer = 0;
        }

        // Apply Gravity
        this.y += this.dy;

        // Gravity Logic
        if (this.y + this.h < canvas.height - GROUND_HEIGHT) {
            this.dy += GRAVITY;
            this.grounded = false;
        } else {
            this.dy = 0;
            this.grounded = true;
            this.y = this.originalY; // Snap to ground
        }

        this.draw();
    }

    jump() {
        if (this.grounded && (keys['Space'] || keys['ArrowUp'])) { // Only jump if on ground
            this.dy = this.jumpPower;
            this.grounded = false;
        }
    }

    draw() {
        // Draw Pink Cat
        ctx.fillStyle = '#ff80ab'; // Light pink body
        ctx.fillRect(this.x, this.y, this.w, this.h);

        // Ears
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + 10, this.y - 10); // Left ear tip
        ctx.lineTo(this.x + 20, this.y);
        ctx.lineTo(this.x + 30, this.y - 10); // Right ear tip
        ctx.lineTo(this.x + 40, this.y);
        ctx.fill();

        // Eyes (Cute & Simple)
        ctx.fillStyle = '#880e4f';
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y + 15, 3, 0, Math.PI * 2); // Left eye
        ctx.arc(this.x + 30, this.y + 15, 3, 0, Math.PI * 2); // Right eye
        ctx.fill();

        // Cheeks
        ctx.fillStyle = '#ffcdd2';
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y + 22, 4, 0, Math.PI * 2);
        ctx.arc(this.x + 32, this.y + 22, 4, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.strokeStyle = '#ff80ab';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 30);
        ctx.quadraticCurveTo(this.x - 15, this.y + 20, this.x - 10, this.y + 10);
        ctx.stroke();
    }
}

// --- Obstacle Class ---
class Obstacle {
    constructor(x, y, w, h, c) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.c = c; // Color

        this.dx = -gameSpeed; // Move left
    }

    update() {
        this.x += this.dx;
        this.draw();
        this.dx = -gameSpeed; // continuous update in case gameSpeed changes
    }

    draw() {
        // Purple Brick Texture
        ctx.fillStyle = '#9c27b0';
        ctx.fillRect(this.x, this.y, this.w, this.h);

        // Brick details (lighter lines)
        ctx.fillStyle = '#e1bee7';
        ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, 4); // Top highlight
        ctx.fillRect(this.x + 2, this.y + 10, 10, 4);
        ctx.fillRect(this.x + 15, this.y + 10, this.w - 17, 4);
    }
}

// --- Cloud Class (Background) ---
class Cloud {
    constructor() {
        this.x = canvas.width + Math.random() * 200;
        this.y = Math.random() * (canvas.height / 2);
        this.w = 40 + Math.random() * 40;
        this.h = 20 + Math.random() * 10;
        this.speed = 1 + Math.random();
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.w < 0) {
            this.x = canvas.width + Math.random() * 100;
            this.y = Math.random() * (canvas.height / 2);
        }
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.w / 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.w / 2, this.y - 10, this.w / 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.w, this.y, this.w / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Input Handling ---
const keys = {};

window.addEventListener('keydown', function (evt) {
    keys[evt.code] = true;

    // Start Game
    if ((evt.code === 'Space' || evt.code === 'ArrowUp') && !isGameRunning && !isGameOver) {
        startGame();
    }

    // Restart Game
    if ((evt.code === 'Space' || evt.code === 'ArrowUp') && isGameOver) {
        resetGame();
    }
});

window.addEventListener('keyup', function (evt) {
    keys[evt.code] = false;
});


// --- Game Functions ---

function spawnObstacle() {
    spawnTimer--;
    if (spawnTimer <= 0) {
        let obstacleH = 30 + Math.random() * 20; // Random height between 30 and 50
        let obstacleW = 20 + Math.random() * 10; // Random width between 20 and 30
        let obstacleX = canvas.width + obstacleW;
        let obstacleY = canvas.height - GROUND_HEIGHT - obstacleH;
        let obstacleC = '#9c27b0'; // Purple color

        obstacles.push(new Obstacle(obstacleX, obstacleY, obstacleW, obstacleH, obstacleC));

        // Reset spawn timer with some randomness
        spawnTimer = startSpawnTimer - gameSpeed * 8 + Math.random() * (startSpawnTimer - gameSpeed * 8);
        if (spawnTimer < SPAWN_TIMER_MIN) spawnTimer = SPAWN_TIMER_MIN;
    }
}

function updateScore() {
    score++;
    scoreElement.innerText = "Score: " + String(score).padStart(5, '0');

    // Increase game speed every 500 points
    if (score % 500 === 0) {
        gameSpeed += 0.5;
    }
}

function checkHighScore() {
    if (score > highScore) {
        highScore = score;
        highScoreElement.innerText = "HI: " + String(highScore).padStart(5, '0');
        // Save to local storage could be added here
    }
}

function drawGround() {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - GROUND_HEIGHT);
    ctx.lineTo(canvas.width, canvas.height - GROUND_HEIGHT);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#880e4f';
    ctx.stroke();
}

function drawClouds() {
    clouds.forEach(cloud => {
        cloud.update();
        cloud.draw();
    });
}

function handleGameStatus() {
    if (isGameOver) {
        showGameOver();
    }
}

function showGameOver() {
    // Stop the loop
    cancelAnimationFrame(animationId);

    // Show Game Over Screen
    gameOverScreen.classList.remove('hidden');
    checkHighScore();

    // Game Over text removed from canvas to use the overlay instead
}

function resetGame() {
    isGameOver = false;
    isGameRunning = true;
    score = 0;
    spawnTimer = startSpawnTimer;
    gameSpeed = GAME_SPEED_START;
    obstacles = [];
    clouds = [];
    // Init some clouds
    for (let i = 0; i < 3; i++) clouds.push(new Cloud());
    scoreElement.innerText = "Score: 00000";

    gameOverScreen.classList.add('hidden');
    startScreen.classList.add('hidden');

    player.x = 50;
    player.y = player.originalY;
    player.dy = 0;

    requestAnimationFrame(update);
}

function startGame() {
    isGameRunning = true;
    startScreen.classList.add('hidden');
    requestAnimationFrame(update);
}


// --- Main Game Loop ---
const player = new Dino();
for (let i = 0; i < 3; i++) clouds.push(new Cloud()); // Initial clouds

function update() {
    if (!isGameRunning) return;

    animationId = requestAnimationFrame(update);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    spawnObstacle();
    drawClouds(); // Draw background clouds
    drawGround();
    player.animate();

    // Update and Draw Obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let o = obstacles[i];
        o.update();

        // Remove off-screen obstacles
        if (o.x + o.w < 0) {
            obstacles.splice(i, 1);
            i--; // Adjust index since array length decreased
        }

        // Collision Detection
        if (
            player.x < o.x + o.w &&
            player.x + player.w > o.x &&
            player.y < o.y + o.h &&
            player.y + player.h > o.y
        ) {
            isGameOver = true;
            handleGameStatus();
        }
    }

    updateScore();
}

// Initial Draw (to show something before start)
function init() {
    drawClouds();
    drawGround();
    player.draw();
}

init();
