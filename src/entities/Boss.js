export class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 100;
        this.hp = 1000;
        this.maxHp = 1000;
        this.active = true;
        this.color = '#ff0000';
        this.state = 'idle'; // idle, attack, move
        this.timer = 0;
        this.attackTimer = 0;
        this.attackCooldown = 2.0; // Attack every 2 seconds

        // Missile Logic
        this.missileTimer = 0;
        this.missileCooldown = 5.0; // Every 5 seconds
        this.missileBurstCount = 0;
        this.missileBurstTimer = 0;
        this.isFiringMissiles = false;

        this.projectilesQueue = [];
    }

    update(deltaTime, player) {
        this.timer += deltaTime;
        this.attackTimer += deltaTime;
        this.missileTimer += deltaTime;

        // Simple AI: Move towards player horizontally
        const dx = player.x - (this.x + this.width / 2);
        if (Math.abs(dx) > 10) {
            this.x += Math.sign(dx) * 100 * deltaTime;
        }

        // Hover effect
        this.y = 50 + Math.sin(this.timer * 2) * 20;

        // Missile Attack Logic
        if (this.missileTimer > this.missileCooldown) {
            this.isFiringMissiles = true;
            this.missileTimer = 0;
            this.missileBurstCount = 0;
            this.missileBurstTimer = 0;
        }

        if (this.isFiringMissiles) {
            this.missileBurstTimer -= deltaTime;
            if (this.missileBurstTimer <= 0) {
                this.fireMissileBurst();
                this.missileBurstCount++;
                this.missileBurstTimer = 0.5; // 0.5s between shots in burst

                if (this.missileBurstCount >= 3) {
                    this.isFiringMissiles = false;
                }
            }
        }
    }

    fireMissileBurst() {
        // Fire from left and right sides
        // Initial velocity: horizontal outwards then curve
        const speed = 150;

        // Left Missile
        this.projectilesQueue.push({
            x: this.x,
            y: this.y + this.height / 2,
            vx: -speed,
            vy: 50, // Slight down
            type: 'homing_missile'
        });

        // Right Missile
        this.projectilesQueue.push({
            x: this.x + this.width,
            y: this.y + this.height / 2,
            vx: speed,
            vy: 50, // Slight down
            type: 'homing_missile'
        });
    }

    pollProjectiles() {
        const projs = [...this.projectilesQueue];
        this.projectilesQueue = [];
        return projs;
    }

    shouldAttack() {
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            return true;
        }
        return false;
    }

    getAttackProjectile(playerX, playerY) {
        // Fire from boss center towards player
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height / 2;

        // Calculate direction to player
        const dx = playerX - startX;
        const dy = playerY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize and set speed
        const speed = 400;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        return { x: startX, y: startY, vx, vy };
    }
}
