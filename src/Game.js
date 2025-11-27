import { Input } from './Input.js';
import { Renderer } from './systems/Renderer.js';
import { Player } from './entities/Player.js';
import { Block } from './entities/Block.js';
import { Item } from './entities/Item.js';
import { Boss } from './entities/Boss.js';
import { Projectile } from './entities/Projectile.js';
import { FloatingText } from './entities/FloatingText.js';
import { Physics } from './systems/Physics.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.input = new Input();
        this.renderer = new Renderer(this.ctx, this.width, this.height);

        // UI Elements
        this.startScreen = document.getElementById('start-screen');
        this.tutorialScreen = document.getElementById('tutorial-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.startBtn = document.getElementById('start-btn');
        this.tutorialBtn = document.getElementById('tutorial-btn');
        this.closeTutorialBtn = document.getElementById('close-tutorial-btn');
        this.restartBtn = document.getElementById('restart-btn');

        this.startBtn.addEventListener('click', () => this.start());
        this.tutorialBtn.addEventListener('click', () => this.showTutorial());
        this.closeTutorialBtn.addEventListener('click', () => this.hideTutorial());
        this.restartBtn.addEventListener('click', () => this.restart());

        this.reset();
    }

    showTutorial() {
        this.startScreen.classList.add('hidden');
        this.tutorialScreen.classList.remove('hidden');
    }

    hideTutorial() {
        this.tutorialScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
    }

    reset() {
        this.player = new Player(this.width / 2, this.height - 100);
        this.blocks = [];
        this.items = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.score = 0;
        this.spawnTimer = 0;
        this.scrollSpeed = 100;
        // Block Height is Player Radius * 4 = 80.
        // Speed is 100 px/s.
        // Interval = 80 / 100 = 0.8s
        this.spawnInterval = 0.8;

        this.gameTime = 60; // 60 Seconds for scavenge phase
        this.phase = 'scavenge'; // 'scavenge', 'boss'
        this.boss = null;

        this.lastTime = 0;
        this.isRunning = false;

        this.updateHUD();
        this.renderer.clear();
        this.renderer.drawPlayer(this.player);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (this.renderer) this.renderer.resize(this.width, this.height);
    }

    start() {
        if (this.isRunning) return;
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    restart() {
        this.reset();
        this.start();
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(deltaTime) {
        this.player.update(deltaTime, this.input);

        // Block Spawning
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnBlock();
            this.spawnTimer = 0;
        }

        // Update Blocks
        this.blocks.forEach(block => {
            block.update(deltaTime, this.scrollSpeed);

            // Collision Check
            if (block.active && Physics.checkCollision(this.player, block)) {
                this.handleCollision(this.player, block);
            }
        });

        // Game Over Check: Player crushed or pushed off screen
        if (this.player.y > this.height - this.player.radius) {
            this.gameOver();
        }

        // Update Items
        this.items.forEach(item => {
            item.update(deltaTime, this.scrollSpeed);

            if (item.active && Physics.checkCircleCollision(this.player, item)) {
                this.collectItem(item);
            }
        });

        // Update Projectiles
        this.projectiles.forEach(proj => {
            proj.update(deltaTime);

            // Projectile vs Blocks
            this.blocks.forEach(block => {
                if (block.active && Physics.checkCollision(proj, block)) {
                    block.hp -= (proj.type === 'beam' ? 0.5 : 1); // Beam ticks fast
                    if (block.hp <= 0) {
                        block.active = false;
                        this.spawnItem(block.x + block.width / 2, block.y + block.height / 2, block.type);
                        this.score += 100;
                    }
                    if (proj.type !== 'beam') proj.active = false; // Bullets disappear
                }
            });

            // Projectile vs Boss
            if (this.boss && this.phase === 'boss' && Physics.checkCollision(proj, { x: this.boss.x, y: this.boss.y, width: this.boss.width, height: this.boss.height })) {
                this.boss.hp -= (proj.type === 'beam' ? 0.5 : 1);
                if (this.boss.hp <= 0) this.gameWin();
                if (proj.type !== 'beam') proj.active = false;
            }
        });

        // Update Floating Texts
        this.floatingTexts.forEach(text => text.update(deltaTime));

        // Weapon Firing Logic
        if (this.player.isAttacking) {
            this.fireWeapon(deltaTime);
        }

        // Remove inactive entities
        this.blocks = this.blocks.filter(b => b.active && b.y < this.height + 100);
        this.items = this.items.filter(i => i.active && i.y < this.height + 100);
        this.projectiles = this.projectiles.filter(p => p.active && p.y > -100 && p.y < this.height);
        this.floatingTexts = this.floatingTexts.filter(t => t.active);

        // Update HUD
        this.updateHUD();

        // Game Timer & Boss Phase
        if (this.phase === 'scavenge') {
            this.gameTime -= deltaTime;
            if (this.gameTime <= 0) {
                this.startBossPhase();
            }
        } else if (this.phase === 'boss') {
            if (this.boss) {
                this.boss.update(deltaTime, this.player);
                // Boss Collision
                if (Physics.checkCollision(this.player, { x: this.boss.x, y: this.boss.y, width: this.boss.width, height: this.boss.height })) {
                    if (this.player.isCharging) {
                        this.boss.hp -= this.player.atk;
                        // Push back boss or player
                        if (this.boss.hp <= 0) {
                            this.gameWin();
                        }
                    } else {
                        // Player takes damage
                        this.player.hp -= 1; // Simple damage
                    }
                }
            }
        }
    }

    startBossPhase() {
        this.phase = 'boss';
        this.blocks = []; // Clear blocks
        this.items = [];
        this.boss = new Boss(this.width / 2 - 50, 50);
        // Show Boss Warning?
    }

    gameWin() {
        this.isRunning = false;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.querySelector('#game-over-screen h1').innerText = "YOU WIN!";
        document.getElementById('final-score').innerText = this.score;
    }

    spawnBlock() {
        if (this.phase !== 'scavenge') return;

        const blockWidth = this.player.radius * 4; // 2x Player Width (Radius * 2 * 2)
        const blockHeight = blockWidth; // Square
        const cols = Math.floor(this.width / blockWidth);
        const startX = (this.width - (cols * blockWidth)) / 2; // Center alignment

        // Randomly choose one or two gaps
        const gap1 = Math.floor(Math.random() * cols);
        let gap2 = -1;
        if (Math.random() > 0.5) {
            gap2 = Math.floor(Math.random() * cols);
        }

        for (let i = 0; i < cols; i++) {
            if (i === gap1 || i === gap2) continue; // Leave gaps

            const x = startX + i * blockWidth;
            const y = -blockHeight;
            const type = Math.random() > 0.8 ? 'hard' : (Math.random() > 0.8 ? 'resource' : 'normal');

            this.blocks.push(new Block(x, y, blockWidth, blockHeight, type));
        }
    }

    gameOver() {
        this.isRunning = false;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.querySelector('#game-over-screen h1').innerText = "GAME OVER";
        document.getElementById('final-score').innerText = this.score;
    }

    handleCollision(player, block) {
        // Invincibility or Shake Attack
        if (player.invincible || (player.isShaking && !player.isCharging && !player.isAttacking)) {
            block.hp = 0; // Instantly break
            block.active = false;
            this.spawnItem(block.x + block.width / 2, block.y + block.height / 2, block.type);
            this.score += 100;
            return;
        }

        if (player.isAttacking) {
            // Break block using Charge Power
            const damage = player.atk + player.chargePower;
            block.hp -= damage;
            player.chargePower = Math.max(0, player.chargePower - 1); // Consume power

            if (block.hp <= 0) {
                block.active = false;
                this.spawnItem(block.x + block.width / 2, block.y + block.height / 2, block.type);
                this.score += 100;
            } else {
                // Bounce back logic could go here
                player.isAttacking = false; // Stop attack if block too hard
                player.y += 10;
            }
        } else {
            // Simple collision resolution (stop player)
            // Push player down
            player.y += 5;
        }
    }

    spawnItem(x, y, blockType) {
        let type = 'hp';
        if (blockType === 'resource') {
            const rand = Math.random();
            if (rand < 0.33) type = 'atk';
            else if (rand < 0.66) type = 'spd';
            else type = 'def';
        } else {
            if (Math.random() > 0.95) type = 'invincible'; // Rare invincibility
            else if (Math.random() > 0.7) type = 'hp';
            else return;
        }

        this.items.push(new Item(x, y, type));
    }

    collectItem(item) {
        item.active = false;
        let text = "";
        let color = item.color;

        if (item.type === 'invincible') {
            this.player.invincible = true;
            this.player.invincibleTimer = 5.0;
            this.player.speed = 800; // Super speed
            text = "INVINCIBLE!";
        } else {
            this.player.upgrade(item.type);
            text = `+${item.type.toUpperCase()}`;
            if (item.type === 'hp') text = "+20 HP";
        }

        this.spawnFloatingText(item.x, item.y, text, color);
        this.score += 50;
    }

    fireWeapon(deltaTime) {
        this.player.weaponTimer += deltaTime;
        const type = this.player.weaponType;

        if (type === 'beam') {
            // Continuous beam
            if (this.player.weaponTimer > 0.05) {
                this.projectiles.push(new Projectile(this.player.x, this.player.y - 20, 0, -800, 'beam'));
                this.player.weaponTimer = 0;
            }
        } else if (type === 'gun') {
            // Rapid fire
            if (this.player.weaponTimer > 0.1) {
                this.projectiles.push(new Projectile(this.player.x - 10, this.player.y, -50, -600, 'bullet'));
                this.projectiles.push(new Projectile(this.player.x + 10, this.player.y, 50, -600, 'bullet'));
                this.player.weaponTimer = 0;
            }
        }
        // Dash and Sword are handled in Player movement/collision
    }

    updateHUD() {
        document.getElementById('score-val').innerText = this.score;
        document.getElementById('time-val').innerText = Math.ceil(this.gameTime);
        document.getElementById('atk-val').innerText = this.player.atk;
        document.getElementById('spd-val').innerText = Math.floor(this.player.speed);
        document.getElementById('def-val').innerText = this.player.def;
    }

    draw() {
        this.renderer.clear();

        this.blocks.forEach(block => {
            if (block.active) this.renderer.drawBlock(block);
        });

        this.items.forEach(item => {
            if (item.active) this.renderer.drawItem(item);
        });

        this.projectiles.forEach(proj => {
            if (proj.active) this.renderer.drawProjectile(proj);
        });

        this.floatingTexts.forEach(text => {
            if (text.active) this.renderer.drawFloatingText(text);
        });

        if (this.boss && this.phase === 'boss') {
            this.renderer.drawBoss(this.boss);
        }

        this.renderer.drawPlayer(this.player);
    }

    spawnFloatingText(x, y, text, color) {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
    }
}
