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

        // Bind methods for proper cleanup
        this.resizeHandler = this.resize.bind(this);
        this.startHandler = this.start.bind(this);
        this.tutorialHandler = this.showTutorial.bind(this);
        this.closeTutorialHandler = this.hideTutorial.bind(this);
        this.restartHandler = this.restart.bind(this);
        this.shareHandler = this.shareToAntigravity.bind(this);

        this.resize();
        window.addEventListener('resize', this.resizeHandler);

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

        this.startBtn.addEventListener('click', this.startHandler);
        this.tutorialBtn.addEventListener('click', this.tutorialHandler);
        this.closeTutorialBtn.addEventListener('click', this.closeTutorialHandler);
        this.restartBtn.addEventListener('click', this.restartHandler);

        // Antigravity share button
        this.shareBtn = document.getElementById('share-btn');
        this.shareBtn.addEventListener('click', this.shareHandler);

        this.reset();
    }

    destroy() {
        // Cleanup event listeners
        window.removeEventListener('resize', this.resizeHandler);
        this.startBtn.removeEventListener('click', this.startHandler);
        this.tutorialBtn.removeEventListener('click', this.tutorialHandler);
        this.closeTutorialBtn.removeEventListener('click', this.closeTutorialHandler);
        this.restartBtn.removeEventListener('click', this.restartHandler);
        this.shareBtn.removeEventListener('click', this.shareHandler);

        // Cleanup input
        if (this.input && this.input.destroy) {
            this.input.destroy();
        }

        // Clear all game objects
        this.blocks = [];
        this.items = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.boss = null;
        this.player = null;
        this.renderer = null;
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
        // Clear existing objects
        if (this.blocks) this.blocks.length = 0;
        if (this.items) this.items.length = 0;
        if (this.projectiles) this.projectiles.length = 0;
        if (this.floatingTexts) this.floatingTexts.length = 0;

        this.player = new Player(this.width / 2, this.height - 100);
        this.blocks = [];
        this.items = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.score = 0;
        this.spawnTimer = 0;
        this.baseScrollSpeed = 70; // Faster for better feel
        this.scrollSpeed = this.baseScrollSpeed;
        // Block Height is Player Radius * 4 = 80.
        // Initial Speed is 60 px/s.
        // Interval = 80 / 60 = 1.33s
        this.spawnInterval = 1.0; // Faster spawns to match speed

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
        this.phase = 'scavenge'; // Ensure phase is correct
        this.lastTime = performance.now();

        // Force initial spawn
        this.spawnBlock();

        requestAnimationFrame(this.loop.bind(this));
    }

    restart() {
        // Stop current game loop
        this.isRunning = false;

        // Small delay to ensure loop stops
        setTimeout(() => {
            this.reset();
            this.start();
        }, 100);
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        // Handle first frame or weird timestamps
        if (!this.lastTime) this.lastTime = timestamp;

        let deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap deltaTime to prevent huge jumps (e.g. tab switching)
        if (deltaTime > 0.1) deltaTime = 0.1;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(deltaTime) {
        this.player.update(deltaTime, this.input);

        // Keep scroll speed constant - no dynamic difficulty
        // this.scrollSpeed stays at this.baseScrollSpeed


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

            // Magnet attraction
            if (this.player.hasMagnet && item.active) {
                const dx = this.player.x - item.x;
                const dy = this.player.y - item.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.player.magnetRange) {
                    // Pull item toward player
                    const pullSpeed = 300;
                    item.x += (dx / distance) * pullSpeed * deltaTime;
                    item.y += (dy / distance) * pullSpeed * deltaTime;
                }
            }

            if (item.active && Physics.checkCircleCollision(this.player, item)) {
                this.collectItem(item);
            }
        });

        // Update Projectiles
        this.projectiles.forEach(proj => {
            proj.update(deltaTime, this.player);

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
            if (this.boss && this.phase === 'boss' &&
                proj.type !== 'boss_bullet' && proj.type !== 'homing_missile' && // Ignore boss's own attacks
                Physics.checkCollision(proj, { x: this.boss.x, y: this.boss.y, width: this.boss.width, height: this.boss.height })) {

                const damage = (proj.type === 'beam' ? 0.5 : 1);
                this.boss.hp -= damage;
                this.score += Math.floor(damage * 10); // 10 points per damage (5 for beam tick)
                this.spawnFloatingText(this.boss.x + this.boss.width / 2, this.boss.y, `+${Math.floor(damage * 10)}`, "#00f0ff");
                if (this.boss.hp <= 0) this.gameWin();
                if (proj.type !== 'beam') proj.active = false;
            }
        });

        // Update Floating Texts
        this.floatingTexts.forEach(text => text.update(deltaTime));

        // Sword Collision Logic
        if (this.player.swordCount > 0) {
            const swordCount = this.player.swordCount;
            const swordRadius = this.player.swordRadius;
            const swordSize = this.player.swordSize;

            for (let i = 0; i < swordCount; i++) {
                const angleOffset = (Math.PI * 2 / swordCount) * i;
                const currentAngle = this.player.swordAngle + angleOffset;

                const swordX = this.player.x + Math.cos(currentAngle) * swordRadius;
                const swordY = this.player.y + Math.sin(currentAngle) * swordRadius;

                // Sword vs Blocks
                this.blocks.forEach(block => {
                    if (block.active && Physics.checkCollision({ x: swordX, y: swordY, radius: swordSize }, block)) {
                        block.hp = 0;
                        block.active = false;
                        this.spawnItem(block.x + block.width / 2, block.y + block.height / 2, block.type);
                        this.score += 100;
                        this.spawnFloatingText(block.x, block.y, "SLASH!", "#ffaa00");
                    }
                });

                // Sword vs Projectiles (Boss bullets)
                this.projectiles.forEach(proj => {
                    const isBossProjectile = ['boss_bullet', 'homing_missile', 'boss_beam', 'boomerang'].includes(proj.type);
                    if (proj.active && isBossProjectile) {
                        if (Physics.checkCircleCollision({ x: swordX, y: swordY, radius: swordSize }, proj)) {
                            proj.active = false; // Destroy bullet
                            this.score += 50; // Score for intercepting missiles
                            this.spawnFloatingText(proj.x, proj.y, "BLOCK! +50", "#ffaa00");
                        }
                    }
                });

                // Sword vs Boss
                if (this.boss && this.phase === 'boss') {
                    if (Physics.checkCircleCollision({ x: swordX, y: swordY, radius: swordSize },
                        { x: this.boss.x + this.boss.width / 2, y: this.boss.y + this.boss.height / 2, radius: this.boss.width / 2 })) {
                        const damage = this.player.atk * 0.5; // Sword does half ATK damage per tick
                        this.boss.hp -= damage;
                        this.score += Math.floor(damage * 10);
                        if (this.boss.hp <= 0) {
                            this.gameWin();
                        }
                    }
                }
            }
        }

        // Weapon Firing Logic
        // If hasBeam, fire beam instead of dash
        if (this.player.isAttacking && this.player.hasBeam) {
            this.fireWeapon(deltaTime);
            // Stop player movement during beam fire? Or allow movement?
            // User said "Beam and Body Slam should not coexist".
            // If we fire beam, we probably shouldn't be dashing forward at high speed.
            // But Player.update handles movement.
        }


        // Remove inactive entities more aggressively
        // Filter and nullify references
        const prevBlocksLength = this.blocks.length;
        const prevItemsLength = this.items.length;
        const prevProjectilesLength = this.projectiles.length;

        this.blocks = this.blocks.filter(b => b.active && b.y < this.height + 100);
        this.items = this.items.filter(i => i.active && i.y < this.height + 100);
        this.projectiles = this.projectiles.filter(p => p.active && p.y > -100 && p.y < this.height + 100 && p.x > -100 && p.x < this.width + 100);
        this.floatingTexts = this.floatingTexts.filter(t => t.active);

        // Performance limits - cap array sizes
        const MAX_BLOCKS = 40;
        const MAX_ITEMS = 30;
        const MAX_PROJECTILES = 50;
        const MAX_FLOATING_TEXTS = 20;

        if (this.blocks.length > MAX_BLOCKS) {
            this.blocks = this.blocks.slice(-MAX_BLOCKS);
        }
        if (this.items.length > MAX_ITEMS) {
            this.items = this.items.slice(-MAX_ITEMS);
        }
        if (this.projectiles.length > MAX_PROJECTILES) {
            this.projectiles = this.projectiles.slice(-MAX_PROJECTILES);
        }
        if (this.floatingTexts.length > MAX_FLOATING_TEXTS) {
            this.floatingTexts = this.floatingTexts.slice(-MAX_FLOATING_TEXTS);
        }


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

                // Boss Attack
                if (this.boss.shouldAttack()) {
                    const attack = this.boss.getAttackProjectile(this.player.x, this.player.y);
                    this.projectiles.push(new Projectile(attack.x, attack.y, attack.vx, attack.vy, 'boss_bullet'));
                }

                // Poll for new projectiles from boss
                const newProjectiles = this.boss.pollProjectiles();
                newProjectiles.forEach(p => {
                    this.projectiles.push(new Projectile(p.x, p.y, p.vx, p.vy, p.type, p.damage));
                });

                // Boss Collision
                if (Physics.checkCollision(this.player, { x: this.boss.x, y: this.boss.y, width: this.boss.width, height: this.boss.height })) {
                    if (this.player.isAttacking) {
                        const damage = this.player.atk;
                        this.boss.hp -= damage;
                        this.score += Math.floor(damage * 10); // Score for charge attack damage
                        this.spawnFloatingText(this.boss.x + this.boss.width / 2, this.boss.y, `+${Math.floor(damage * 10)}`, "#ff0055");
                        // Push back boss or player
                        if (this.boss.hp <= 0) {
                            this.gameWin();
                        }
                    } else if (!this.player.invincible) {
                        // Player takes damage
                        this.player.hp -= 1; // Simple damage
                        if (this.player.hp <= 0) {
                            this.gameOver();
                        }
                    }
                }

                // Boss Projectile vs Player
                this.projectiles.forEach(proj => {
                    const isBossProjectile = ['boss_bullet', 'homing_missile', 'boss_beam', 'boomerang'].includes(proj.type);
                    if (isBossProjectile && proj.active && Physics.checkCircleCollision(this.player, proj)) {
                        if (!this.player.invincible) {
                            const damage = proj.damage || (proj.type === 'boss_beam' ? 20 : 5);
                            this.player.hp -= damage;
                            if (this.player.hp <= 0) {
                                this.gameOver();
                            }
                        }
                        proj.active = false;
                    }
                });

                // Boss Sword Shield vs Player Projectiles
                if (this.boss.swordCount > 0) {
                    const swordPositions = this.boss.getSwordPositions();
                    this.projectiles.forEach(proj => {
                        if (proj.active && proj.type !== 'boss_bullet' && proj.type !== 'homing_missile' &&
                            proj.type !== 'boss_beam' && proj.type !== 'boomerang') {
                            swordPositions.forEach(sword => {
                                if (Physics.checkCircleCollision({ x: sword.x, y: sword.y, radius: 15 }, proj)) {
                                    proj.active = false; // Boss blocks player projectiles
                                    this.spawnFloatingText(sword.x, sword.y, "BLOCKED!", "#ff3300");
                                }
                            });
                        }
                    });
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
        document.getElementById('device-category').innerText = this.getDeviceCategoryLabel();
    }

    getDeviceCategory() {
        // Detect device type and orientation
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;

        if (isMobile && !isTablet) {
            // Mobile device - check orientation
            const isPortrait = window.innerHeight > window.innerWidth;
            return isPortrait ? 'mobile-portrait' : 'mobile-landscape';
        } else {
            // PC or Tablet (treat tablet as PC)
            return 'pc';
        }
    }

    getDeviceCategoryLabel() {
        const category = this.getDeviceCategory();
        const labels = {
            'mobile-portrait': 'スマホ（縦画面）',
            'mobile-landscape': 'スマホ（横画面）',
            'pc': 'PC'
        };
        return labels[category] || 'PC';
    }

    shareToAntigravity() {
        const score = this.score;
        const gameName = 'BreakBlockBuild';
        const gameUrl = 'https://morikentiger.github.io/BreakBlockBuild/';
        const category = this.getDeviceCategory();

        // Antigravity URL with score, game name, and category parameters
        const antigravityUrl = `https://antigravity-sns.vercel.app/?score=${score}&game=${gameName}&category=${category}`;

        // Open in new tab
        window.open(antigravityUrl, '_blank');
    }

    spawnBlock() {
        if (this.phase !== 'scavenge') return;

        // Performance Limit: Max 40 active blocks (reduced for better performance)
        if (this.blocks.length > 40) return;

        const blockWidth = this.player.radius * 4; // 80px
        const cols = Math.floor(this.width / blockWidth);
        const startX = (this.width - (cols * blockWidth)) / 2;

        if (cols <= 0) return;

        // Randomly choose one or two gaps
        // If cols is 1, we must NOT always have a gap, otherwise nothing spawns.
        // Let's say 30% chance of gap for single column, or just no gap (player must break it).
        let gap1 = Math.floor(Math.random() * cols);

        if (cols === 1) {
            // For single column, 50% chance to be a gap (no block), 50% chance to spawn block
            if (Math.random() > 0.5) gap1 = -1;
        }

        let gap2 = -1;
        if (Math.random() > 0.5 && cols > 2) {
            gap2 = Math.floor(Math.random() * cols);
        }

        for (let i = 0; i < cols; i++) {
            if (i === gap1 || i === gap2) continue; // Leave gaps

            const x = startX + i * blockWidth;
            const y = -blockWidth; // Start just above screen
            const type = Math.random() > 0.8 ? 'hard' : (Math.random() > 0.8 ? 'resource' : 'normal');

            this.blocks.push(new Block(x, y, blockWidth, blockWidth, type));
        }
    }

    gameOver() {
        this.isRunning = false;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.querySelector('#game-over-screen h1').innerText = "GAME OVER";
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('device-category').innerText = this.getDeviceCategoryLabel();
    }

    handleCollision(player, block) {
        // Invincibility or Shake Attack or High Stats (Body Slam)
        if (player.invincible || (player.isShaking && !player.isCharging && !player.isAttacking) || player.canBreakOnContact) {
            block.hp -= player.atk; // Deal ATK damage on contact

            if (block.hp <= 0) {
                block.active = false;
                this.spawnItem(block.x + block.width / 2, block.y + block.height / 2, block.type);
                this.score += 100;
            } else {
                // Slight pushback if not broken immediately
                player.y += 2;
            }
            return;
        }

        if (player.isAttacking) {
            // Break block using Charge Power
            const damage = player.atk + player.chargePower;
            block.hp -= damage;

            // Consume less power per block to enable multi-block destruction
            player.chargePower = Math.max(0, player.chargePower - 3); // Consume 3 power per block

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
            if (rand < 0.15) type = 'atk';
            else if (rand < 0.30) type = 'spd';
            else if (rand < 0.45) type = 'def';
            else if (rand < 0.70) type = 'beam';
            else type = 'magnet'; // 30% chance for magnet from green blocks
        } else if (blockType === 'hard') {
            // Red block - chance for sword
            const rand = Math.random();
            if (rand > 0.7) type = 'sword'; // 30% chance for sword
            else type = 'atk';
        } else {
            const rand = Math.random();
            if (rand > 0.95) type = 'invincible'; // Rare invincibility
            else if (rand > 0.90) type = 'beam'; // 5% chance from normal blocks
            else if (rand > 0.7) type = 'hp';
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
            // this.player.speed = 800; // Removed direct speed set
            text = "INVINCIBLE!";
        } else if (item.type === 'beam') {
            this.player.upgrade('beam');
            text = "BEAM UNLOCKED!";
        } else if (item.type === 'sword') {
            this.player.upgrade('sword');
            text = "SWORD EQUIPPED!";
        } else if (item.type === 'magnet') {
            this.player.upgrade('magnet');
            text = "MAGNET ACTIVE!";
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
        // Always beam if hasBeam

        // Continuous beam
        if (this.player.weaponTimer > 0.05) {
            this.projectiles.push(new Projectile(this.player.x, this.player.y - 20, 0, -800, 'beam'));
            this.player.weaponTimer = 0;
        }
    }

    updateHUD() {
        document.getElementById('score-val').innerText = this.score;
        document.getElementById('time-val').innerText = Math.ceil(this.gameTime);
        document.getElementById('hp-val').innerText = Math.max(0, Math.floor(this.player.hp));
        // Show Counts instead of raw values
        document.getElementById('atk-val').innerText = this.player.atkCount;
        document.getElementById('spd-val').innerText = this.player.spdCount;
        document.getElementById('def-val').innerText = this.player.defCount;
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
