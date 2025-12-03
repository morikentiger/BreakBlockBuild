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
        this.baseScrollSpeed = 70;
        this.scrollSpeed = this.baseScrollSpeed;
        this.spawnInterval = 1.0;

        this.gameTime = 60;
        this.phase = 'scavenge';
        this.boss = null;

        // Event System
        this.combo = 0;
        this.comboTimer = 0;
        this.comboTimeLimit = 2.0; // 2 seconds to maintain combo
        this.maxCombo = 0;

        this.miniBosses = [];
        this.miniBoss1Spawned = false;
        this.miniBoss2Spawned = false;

        this.bonusTimeActive = false;
        this.bonusTimeTimer = 0;
        this.bonusTimeDuration = 5.0;
        this.nextBonusTime = 15 + Math.random() * 10; // Random between 15-25s

        this.goldenBlockTimer = 0;
        this.goldenBlockInterval = 8 + Math.random() * 4; // Every 8-12 seconds

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

        // === EVENT SYSTEM ===
        if (this.phase === 'scavenge') {
            // Combo Timer
            if (this.combo > 0) {
                this.comboTimer += deltaTime;
                if (this.comboTimer > this.comboTimeLimit) {
                    this.combo = 0;
                    this.comboTimer = 0;
                }
            }

            // Progressive Difficulty - scroll speed increases over time
            const timeElapsed = 60 - this.gameTime;
            this.scrollSpeed = this.baseScrollSpeed + (timeElapsed * 2); // +2 speed per second
            this.spawnInterval = Math.max(0.5, 1.0 - (timeElapsed * 0.01)); // Faster spawns

            // Bonus Time Event
            this.bonusTimeTimer += deltaTime;
            if (this.bonusTimeTimer >= this.nextBonusTime && !this.bonusTimeActive) {
                this.bonusTimeActive = true;
                this.bonusTimeTimer = 0;
                this.spawnFloatingText(this.width / 2, 100, "BONUS TIME! x2 ITEMS!", "#ffff00");
            }

            if (this.bonusTimeActive) {
                this.bonusTimeTimer += deltaTime;
                if (this.bonusTimeTimer >= this.bonusTimeDuration) {
                    this.bonusTimeActive = false;
                    this.bonusTimeTimer = 0;
                    this.nextBonusTime = 15 + Math.random() * 10;
                }
            }

            // Golden Block Spawning
            this.goldenBlockTimer += deltaTime;
            if (this.goldenBlockTimer >= this.goldenBlockInterval) {
                this.spawnGoldenBlock();
                this.goldenBlockTimer = 0;
                this.goldenBlockInterval = 8 + Math.random() * 4;
            }

            // Mini-Boss Spawning
            if (!this.miniBoss1Spawned && this.gameTime <= 30) {
                this.spawnMiniBoss();
                this.miniBoss1Spawned = true;
            }
            if (!this.miniBoss2Spawned && this.gameTime <= 15) {
                this.spawnMiniBoss();
                this.miniBoss2Spawned = true;
            }

            // Update Mini-Bosses
            this.miniBosses.forEach(mb => {
                if (mb.active) {
                    mb.update(deltaTime, this.player);

                    // Mini-boss collision with player
                    if (Physics.checkCollision(this.player, mb)) {
                        if (this.player.isAttacking || this.player.invincible) {
                            mb.hp -= this.player.atk;
                            if (mb.hp <= 0) {
                                mb.active = false;
                                this.score += 500;
                                this.spawnFloatingText(mb.x, mb.y, "+500 MINI-BOSS!", "#ff00ff");
                                // Drop multiple items
                                for (let i = 0; i < 3; i++) {
                                    this.items.push(new Item(mb.x + Math.random() * 50, mb.y, ['atk', 'spd', 'def'][i]));
                                }
                            }
                        }
                    }
                }
            });
        }

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
                    const isBossProjectile = ['boss_bullet', 'homing_missile', 'boss_beam', 'boomerang', 'death_ray'].includes(proj.type);
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
                    const isBossProjectile = ['boss_bullet', 'homing_missile', 'boss_beam', 'boomerang', 'death_ray'].includes(proj.type);
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
            block.hp -= player.atk;

            if (block.hp <= 0) {
                block.active = false;
                this.addCombo();
                const baseScore = block.type === 'golden' ? 1000 : 100;
                const comboBonus = this.combo * 10;
                this.score += baseScore + comboBonus;
                this.spawnItem(block.x + block.width / 2, block.y + block.height / 2, block.type);
                if (this.combo > 1) {
                    this.spawnFloatingText(block.x, block.y, `x${this.combo} COMBO! +${comboBonus}`, "#ffff00");
                }
            } else {
                player.y += 2;
            }
            return;
        }

        if (player.isAttacking) {
            const damage = player.atk + player.chargePower;
            block.hp -= damage;

            player.chargePower = Math.max(0, player.chargePower - 3);

            if (block.hp <= 0) {
                block.active = false;
                this.addCombo();
                const baseScore = block.type === 'golden' ? 1000 : 100;
                const comboBonus = this.combo * 10;
                this.score += baseScore + comboBonus;
                this.spawnItem(block.x + block.width / 2, block.y + block.height / 2, block.type);
                if (this.combo > 1) {
                    this.spawnFloatingText(block.x, block.y, `x${this.combo} COMBO! +${comboBonus}`, "#ffff00");
                }
            } else {
                player.isAttacking = false;
                player.y += 10;
            }
        } else {
            player.y += 5;
        }
    }

    addCombo() {
        this.combo++;
        this.comboTimer = 0;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }
    }

    spawnItem(x, y, blockType) {
        // Golden blocks always drop rare items
        if (blockType === 'golden') {
            const rareTypes = ['atk', 'spd', 'def', 'beam', 'sword', 'magnet'];
            const type = rareTypes[Math.floor(Math.random() * rareTypes.length)];
            this.items.push(new Item(x, y, type));
            // Bonus time: drop extra item
            if (this.bonusTimeActive) {
                const type2 = rareTypes[Math.floor(Math.random() * rareTypes.length)];
                this.items.push(new Item(x + 20, y, type2));
            }
            return;
        }

        let type = 'hp';
        if (blockType === 'resource') {
            const rand = Math.random();
            if (rand < 0.15) type = 'atk';
            else if (rand < 0.30) type = 'spd';
            else if (rand < 0.45) type = 'def';
            else if (rand < 0.70) type = 'beam';
            else type = 'magnet';
        } else if (blockType === 'hard') {
            const rand = Math.random();
            if (rand > 0.7) type = 'sword';
            else type = 'atk';
        } else {
            const rand = Math.random();
            if (rand > 0.95) type = 'invincible';
            else if (rand > 0.90) type = 'beam';
            else if (rand > 0.7) type = 'hp';
            else return;
        }

        this.items.push(new Item(x, y, type));

        // Bonus Time: Double drops!
        if (this.bonusTimeActive) {
            this.items.push(new Item(x + 20, y, type));
        }
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

        // Draw mini-bosses
        this.miniBosses.forEach(mb => {
            if (mb.active) {
                this.ctx.fillStyle = mb.color;
                this.ctx.fillRect(mb.x, mb.y, mb.width, mb.height);
                // HP bar
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(mb.x, mb.y - 10, mb.width, 5);
                this.ctx.fillStyle = '#ff00ff';
                this.ctx.fillRect(mb.x, mb.y - 10, mb.width * (mb.hp / mb.maxHp), 5);
            }
        });

        if (this.boss && this.phase === 'boss') {
            this.renderer.drawBoss(this.boss);
        }

        this.renderer.drawPlayer(this.player);

        // Draw combo counter
        if (this.combo > 1) {
            this.ctx.save();
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 40px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(`${this.combo}x COMBO!`, this.width / 2, 80);
            this.ctx.fillText(`${this.combo}x COMBO!`, this.width / 2, 80);
            this.ctx.restore();
        }

        // Draw bonus time indicator
        if (this.bonusTimeActive) {
            this.ctx.save();
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 30px Inter';
            this.ctx.textAlign = 'center';
            const flash = Math.sin(Date.now() / 200) > 0;
            if (flash) {
                this.ctx.fillText('⭐ BONUS TIME! x2 ITEMS ⭐', this.width / 2, 120);
            }
            this.ctx.restore();
        }
    }

    spawnFloatingText(x, y, text, color) {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
    }

    spawnGoldenBlock() {
        const blockWidth = this.player.radius * 4;
        const x = Math.random() * (this.width - blockWidth);
        const y = -blockWidth;

        const goldenBlock = new Block(x, y, blockWidth, blockWidth, 'golden');
        goldenBlock.color = '#ffd700'; // Gold color
        goldenBlock.hp = 3; // Harder to break
        goldenBlock.maxHp = 3;
        goldenBlock.type = 'golden';

        this.blocks.push(goldenBlock);
        this.spawnFloatingText(x, y, "GOLDEN BLOCK!", "#ffd700");
    }

    spawnMiniBoss() {
        const miniBoss = {
            x: Math.random() * (this.width - 80),
            y: -100,
            width: 80,
            height: 80,
            hp: 50,
            maxHp: 50,
            active: true,
            color: '#ff00ff',
            vy: 50, // Moves down slowly
            update: function (deltaTime, player) {
                this.y += this.vy * deltaTime;
                // Simple AI: move toward player horizontally
                const dx = player.x - (this.x + this.width / 2);
                this.x += Math.sign(dx) * 30 * deltaTime;
            }
        };

        this.miniBosses.push(miniBoss);
        this.spawnFloatingText(this.width / 2, 100, "MINI-BOSS APPEARS!", "#ff00ff");
    }
}
