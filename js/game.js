const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let player;
let foods = [];
let bots = [];
let particles = [];
let floatingTexts = [];
let mapSize = { width: 3000, height: 3000 };
let camX = 0;
let camY = 0;
let mouseX = 0;
let mouseY = 0;
let gameMode = 'infinite';
let gameTime = 0; // For time mode
let gameTimerInterval = null;

// UI Elements
const uiStartScreen = document.getElementById('start-screen');
const uiHUD = document.getElementById('hud');
const uiGameOver = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const inputName = document.getElementById('player-name');

// Config
const BOT_COUNT = 20;
const FOOD_COUNT = 400;

const availableSkins = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#1dd1a1', '#00d2d3', '#ff9f43', '#10ac84'];
let currentSkinIndex = 0;

function init() {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => {
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        mouseX = e.clientX - cssW / 2;
        mouseY = e.clientY - cssH / 2;
    });

    window.addEventListener('mousedown', () => {
        if (player) player.boost = true;
    });

    window.addEventListener('mouseup', () => {
        if (player) player.boost = false;
    });

    // Mobile Controls
    const handleTouch = (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            if (e.cancelable) e.preventDefault();
            if (e.type === 'touchstart' && player) player.boost = true;
            if (e.type === 'touchend' && player) player.boost = false;

            if (e.type !== 'touchend' && e.touches.length > 0) {
                const cssW = canvas.clientWidth;
                const cssH = canvas.clientHeight;
                mouseX = e.touches[0].clientX - cssW / 2;
                mouseY = e.touches[0].clientY - cssH / 2;
            }
        }
    };

    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('touchend', handleTouch, { passive: false });
    window.addEventListener('touchmove', handleTouch, { passive: false });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    // Custom Dropdown Logic
    const selectWrapper = document.querySelector('.custom-select');
    const selectTrigger = document.querySelector('.custom-select__trigger');
    const customOptions = document.querySelectorAll('.custom-option');
    const selectedText = document.getElementById('selected-mode');

    selectTrigger.addEventListener('click', () => {
        selectWrapper.classList.toggle('open');
    });

    customOptions.forEach(option => {
        option.addEventListener('click', function () {
            // Remove selected class from all
            customOptions.forEach(opt => opt.classList.remove('selected'));
            // Add to clicked
            this.classList.add('selected');
            // Update UI
            selectedText.textContent = this.textContent;
            // Update Value
            gameMode = this.getAttribute('data-value');

            selectWrapper.classList.remove('open');
        });
    });

    // Close dropdown if clicked outside
    window.addEventListener('click', (e) => {
        if (!selectWrapper.contains(e.target)) {
            selectWrapper.classList.remove('open');
        }
    });

    // Skin Selector Logic
    const skinPreview = document.getElementById('skin-preview');
    const updateSkinPreview = () => {
        skinPreview.style.backgroundColor = availableSkins[currentSkinIndex];
        skinPreview.style.boxShadow = `0 0 20px ${availableSkins[currentSkinIndex]}`;
    };

    document.getElementById('prev-skin').addEventListener('click', () => {
        currentSkinIndex = (currentSkinIndex - 1 + availableSkins.length) % availableSkins.length;
        updateSkinPreview();
    });

    document.getElementById('next-skin').addEventListener('click', () => {
        currentSkinIndex = (currentSkinIndex + 1) % availableSkins.length;
        updateSkinPreview();
    });

    // Initial preview
    updateSkinPreview();

    loop();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function startGame() {
    const name = inputName.value || "Player";

    player = new Snake(0, 0, false, name);
    player.color = availableSkins[currentSkinIndex]; // Set selected skin

    foods = [];
    bots = [];

    // Init Foods
    for (let i = 0; i < FOOD_COUNT; i++) {
        foods.push(new Food(mapSize.width, mapSize.height));
    }

    // Init Bots
    for (let i = 0; i < BOT_COUNT; i++) {
        bots.push(new Snake(
            Utils.randomInt(-mapSize.width, mapSize.width),
            Utils.randomInt(-mapSize.height, mapSize.height),
            true,
            "Bot " + (i + 1)
        ));
    }

    gameState = 'PLAYING';
    uiStartScreen.classList.add('hidden');
    uiGameOver.classList.add('hidden');
    uiHUD.classList.remove('hidden');
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Update Player (target is mouse offset relative to player head actually? 
    // No, mouseX/Y is vector from screen center. Since player is always at center of screen (visually),
    // calculating angle from center to mouse is correct for direction.)
    // But verify: 
    // Player is drawn at canvas center logic? Yes, we transpose canvas.
    // So Vector(0,0) to Vector(mouseX, mouseY) IS the direction.
    // So targetX/Y for player can be just player.x + mouseX, player.y + mouseY

    player.update(player.x + mouseX, player.y + mouseY, mapSize.width, mapSize.height, foods);

    // Camera follows player
    // Smooth camera using lerp? direct lock for now
    camX = player.x;
    camY = player.y;

    // Update Bots
    bots.forEach(bot => bot.update(0, 0, mapSize.width, mapSize.height, foods));

    // Collision Check: Food
    // Player vs Food
    checkFoodCollision(player);

    // Bots vs Food
    bots.forEach(bot => checkFoodCollision(bot));

    // Collision Check: Snakes vs Snakes
    checkSnakeCollisions();

    // Spawn more food if low
    if (foods.length < FOOD_COUNT) {
        foods.push(new Food(mapSize.width, mapSize.height));
    }

    // Update Score UI & Level
    const level = Math.floor(Math.sqrt(player.score / 20)) + 1;
    const nextLevelXp = Math.pow(level, 2) * 20;
    const prevLevelXp = Math.pow(level - 1, 2) * 20;
    const xpProgress = (player.score - prevLevelXp) / (nextLevelXp - prevLevelXp);

    document.getElementById('level-indicator').textContent = `LVL ${level}`;
    document.getElementById('xp-bar').style.width = `${Math.min(100, Math.max(0, xpProgress * 100))}%`;

    if (gameMode === 'time') {
        scoreEl.innerText = `${Math.floor(player.score)} | Time: ${Math.floor(gameTime)}s`;
    } else {
        scoreEl.innerText = Math.floor(player.score);
    }
    // Particles
    particles.forEach((p, index) => {
        p.update();
        if (p.life <= 0) particles.splice(index, 1);
    });

    floatingTexts.forEach((t, index) => {
        t.update();
        if (t.life <= 0) floatingTexts.splice(index, 1);
    });

    updateLeaderboard();
}

function updateLeaderboard() {
    // Combine player and bots
    const allSnakes = [player, ...bots];
    // Sort by score/length
    allSnakes.sort((a, b) => b.score - a.score);

    // Take top 5
    const top5 = allSnakes.slice(0, 5);

    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    top5.forEach((s, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>#${index + 1} ${s.name}</span> <span>${Math.floor(s.score)}</span>`;
        // Highlight player
        if (s === player) {
            li.style.color = '#ffcc00';
            li.style.fontWeight = 'bold';
        }
        list.appendChild(li);
    });
}

function checkFoodCollision(snake) {
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        if (Utils.circleCollision(snake.x, snake.y, snake.size, food.x, food.y, food.size)) {
            snake.grow(1);

            // Spawn Particles
            for (let j = 0; j < 5; j++) {
                particles.push(new Particle(food.x, food.y, food.color));
            }

            // Floating Text (only for player)
            if (snake === player) {
                floatingTexts.push(new FloatingText(food.x, food.y, "+10", "#fff"));
            }

            foods.splice(i, 1);
        }
    }
}

function checkSnakeCollisions() {
    // Check Player vs Bots
    for (let bot of bots) {
        // Player hits Bot Body
        if (checkHeadBodyCollision(player, bot)) {
            gameOver();
            return;
        }
        // Bot hits Player Body
        if (checkHeadBodyCollision(bot, player)) {
            killSnake(bot);
            // Respawn bot
            respawnBot();
        }
    }

    // Bots vs Bots (O(N^2) but N is small)
    for (let i = 0; i < bots.length; i++) {
        for (let j = 0; j < bots.length; j++) {
            if (i === j) continue;
            if (checkHeadBodyCollision(bots[i], bots[j])) {
                killSnake(bots[i]);
                respawnBot();
                // break to avoid double kill logic issues slightly
            }
        }
    }
}

function checkHeadBodyCollision(headSnake, bodySnake) {
    // Check head of headSnake against all body segments of bodySnake
    // Skip checking own head collision obviously
    // Also optimize: only check if close
    if (Utils.distance(headSnake.x, headSnake.y, bodySnake.x, bodySnake.y) > bodySnake.length * bodySnake.spacing * 2) return false;

    // We start from 0? Head vs Head is also a collision.
    // Usually head-on-head = bigger kills smaller or both die.
    // Let's implements body collision only first.
    // Start from index 0?
    // If it's the same snake, skip head segments (handled elsewhere or ignored).

    for (let k = 0; k < bodySnake.body.length; k++) {
        // Simple circle collision
        // Give some leeway so you don't die instantly on graze
        if (Utils.circleCollision(headSnake.x, headSnake.y, headSnake.size * 0.8, bodySnake.body[k].x, bodySnake.body[k].y, bodySnake.size)) {
            return true;
        }
    }
    return false;
}

function killSnake(snake) {
    // Turn body into food
    for (let segment of snake.body) {
        if (Math.random() > 0.5) { // Drop food for 50% of segments
            const f = new Food(mapSize.width, mapSize.height);
            f.x = segment.x + Utils.randomInt(-10, 10);
            f.y = segment.y + Utils.randomInt(-10, 10);
            f.size = 10; // Big yummy
            f.color = snake.color; // Food color matches snake
            f.glowing = true;
            foods.push(f);
        }
    }

    // Remove from array?
    // If it's a bot, we handle respawn outside or here.
    const idx = bots.indexOf(snake);
    if (idx !== -1) {
        bots.splice(idx, 1);
    }
}

function respawnBot() {
    setTimeout(() => {
        bots.push(new Snake(
            Utils.randomInt(-mapSize.width, mapSize.width),
            Utils.randomInt(-mapSize.height, mapSize.height),
            true,
            "Bot " + Utils.randomInt(100, 999)
        ));
    }, 2000);
}

function gameOver() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameState = 'GAMEOVER';
    finalScoreEl.innerText = Math.floor(player.score);
    uiHUD.classList.add('hidden');
    uiGameOver.classList.remove('hidden');
}

function draw() {
    // Background (Clear with color)
    ctx.fillStyle = '#1a1a2e'; // Dark bg
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'START') {
        // Maybe render a "attract mode" background?
        // Just empty or static works for now
        return;
    }

    ctx.save();

    // Camera Transform
    // Translate everything so (camX, camY) is at center (canvas.width/2, canvas.height/2)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.translate(centerX - camX, centerY - camY);

    // Draw Grid/Floor
    drawGrid();

    // Draw Foods
    foods.forEach(f => f.draw(ctx));

    // Draw Bots
    bots.forEach(b => b.draw(ctx));

    // Draw Player
    if (player) player.draw(ctx);

    // Draw Particles
    particles.forEach(p => p.draw(ctx));
    floatingTexts.forEach(t => t.draw(ctx));

    // Draw World Borders
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 10;
    ctx.strokeRect(-mapSize.width, -mapSize.height, mapSize.width * 2, mapSize.height * 2);

    ctx.restore();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    const gridSize = 100;

    // Viewport cull optimization
    // Only draw lines visible
    const startX = Math.floor((camX - canvas.width) / gridSize) * gridSize;
    const endX = Math.ceil((camX + canvas.width) / gridSize) * gridSize;
    const startY = Math.floor((camY - canvas.height) / gridSize) * gridSize;
    const endY = Math.ceil((camY + canvas.height) / gridSize) * gridSize;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    ctx.stroke();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start
init();
