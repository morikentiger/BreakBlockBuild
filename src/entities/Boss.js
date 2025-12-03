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
        this.state = 'idle'; // idle, attack, move, enraged
        this.timer = 0;
        this.attackTimer = 0;
        this.attackCooldown = 2.0;

        // Movement
        this.targetY = 50;
        this.moveSpeed = 100;
        this.movePattern = 'hover'; // hover, circle, zigzag, charge

        // Attack patterns
        this.missileTimer = 0;
        this.missileCooldown = 5.0;
        this.missileBurstCount = 0;
        this.missileBurstTimer = 0;
        this.isFiringMissiles = false;

        this.beamTimer = 0;
        this.beamCooldown = 8.0;
        this.isChargingBeam = false;
        this.beamChargeTime = 0;

        this.barrageTimer = 0;
        this.barrageCooldown = 10.0;

        this.boomerangTimer = 0;
        this.boomerangCooldown = 7.0;

        // Phase system
        this.phase = 1; // 1, 2, 3
        this.enraged = false;

        // Sword shield
        this.swordCount = 0;
        this.swordAngle = 0;
        this.swordRadius = 80;

        this.projectilesQueue = [];
    }

    update(deltaTime, player) {
        this.timer += deltaTime;
        this.attackTimer += deltaTime;
        this.missileTimer += deltaTime;
        this.beamTimer += deltaTime;
        this.barrageTimer += deltaTime;
        this.boomerangTimer += deltaTime;

        // Phase transitions based on HP
        if (this.hp < this.maxHp * 0.66 && this.phase === 1) {
            this.phase = 2;
            this.swordCount = 4; // Add sword shield
            this.attackCooldown = 1.5;
            this.color = '#ff3300';
        }
        if (this.hp < this.maxHp * 0.33 && this.phase === 2) {
            this.phase = 3;
            this.enraged = true;
            this.swordCount = 6;
            this.attackCooldown = 1.0;
            this.missileCooldown = 3.0;
            this.color = '#ff00ff';
        }

        // Update sword rotation
        if (this.swordCount > 0) {
            this.swordAngle += deltaTime * 3; // Rotate swords
        }

        // Dynamic movement patterns
        this.updateMovement(deltaTime, player);

        // Attack patterns
        this.updateAttacks(deltaTime, player);
    }

    updateMovement(deltaTime, player) {
        const dx = player.x - (this.x + this.width / 2);

        if (this.phase === 1) {
            // Phase 1: Simple hover and horizontal tracking
            this.x += Math.sign(dx) * this.moveSpeed * deltaTime;
            this.y = 50 + Math.sin(this.timer * 2) * 20;
        } else if (this.phase === 2) {
            // Phase 2: Circle pattern
            const centerX = player.x;
            const radius = 150;
            this.x = centerX + Math.cos(this.timer) * radius - this.width / 2;
            this.y = 100 + Math.sin(this.timer) * 80;
        } else if (this.phase === 3) {
            // Phase 3: Aggressive zigzag
            this.x += Math.sign(dx) * this.moveSpeed * 1.5 * deltaTime;
            this.y = 80 + Math.sin(this.timer * 4) * 60;
        }
    }

    updateAttacks(deltaTime, player) {
        // Missile Attack
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
                this.missileBurstTimer = 0.5;

                const burstLimit = this.phase === 3 ? 5 : 3;
                if (this.missileBurstCount >= burstLimit) {
                    this.isFiringMissiles = false;
                }
            }
        }

        // Beam Attack - when player is below boss
        const playerBelowBoss = Math.abs(player.x - (this.x + this.width / 2)) < 80;
        if (playerBelowBoss && this.beamTimer > this.beamCooldown && !this.isChargingBeam) {
            this.isChargingBeam = true;
            this.beamChargeTime = 0;
            this.beamTimer = 0;
        }

        if (this.isChargingBeam) {
            this.beamChargeTime += deltaTime;
            if (this.beamChargeTime > 1.0) { // 1 second charge
                this.fireBeam(player);
                this.isChargingBeam = false;
            }
        }

        // Barrage Attack (Phase 2+)
        if (this.phase >= 2 && this.barrageTimer > this.barrageCooldown) {
            this.fireBarrage(player);
            this.barrageTimer = 0;
        }

        // Boomerang Attack (Phase 3)
        if (this.phase >= 3 && this.boomerangTimer > this.boomerangCooldown) {
            this.fireBoomerang(player);
            this.boomerangTimer = 0;
        }
    }

    fireMissileBurst() {
        const speed = 150;
        const diagonalAngle = Math.PI / 4;

        // Left Missile
        this.projectilesQueue.push({
            x: this.x,
            y: this.y + this.height / 2,
            vx: speed * Math.cos(diagonalAngle),
            vy: speed * Math.sin(diagonalAngle),
            type: 'homing_missile'
        });

        // Right Missile
        this.projectilesQueue.push({
            x: this.x + this.width,
            y: this.y + this.height / 2,
            vx: -speed * Math.cos(diagonalAngle),
            vy: speed * Math.sin(diagonalAngle),
            type: 'homing_missile'
        });
    }

    fireBeam(player) {
        // Massive beam straight down
        const beamWidth = 60;
        const beamX = this.x + this.width / 2;

        for (let i = 0; i < 10; i++) {
            this.projectilesQueue.push({
                x: beamX + (Math.random() - 0.5) * beamWidth,
                y: this.y + this.height,
                vx: 0,
                vy: 800,
                type: 'boss_beam',
                damage: 20 // Heavy damage
            });
        }
    }

    fireBarrage(player) {
        // Spray of bullets in arc toward player
        const bulletCount = this.phase === 3 ? 12 : 8;
        const spreadAngle = Math.PI / 3; // 60 degrees
        const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);

        for (let i = 0; i < bulletCount; i++) {
            const angle = baseAngle + (i / bulletCount - 0.5) * spreadAngle;
            const speed = 300;

            this.projectilesQueue.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                type: 'boss_bullet'
            });
        }
    }

    fireBoomerang(player) {
        // Spinning boomerang that curves
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const speed = 250;

        this.projectilesQueue.push({
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            type: 'boomerang',
            spin: 0
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
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height / 2;

        const dx = playerX - startX;
        const dy = playerY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const speed = this.phase === 3 ? 500 : 400;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        return { x: startX, y: startY, vx, vy };
    }

    getSwordPositions() {
        const positions = [];
        for (let i = 0; i < this.swordCount; i++) {
            const angle = this.swordAngle + (Math.PI * 2 / this.swordCount) * i;
            positions.push({
                x: this.x + this.width / 2 + Math.cos(angle) * this.swordRadius,
                y: this.y + this.height / 2 + Math.sin(angle) * this.swordRadius,
                angle: angle
            });
        }
        return positions;
    }

    isChargingBeamAttack() {
        return this.isChargingBeam;
    }

    getBeamChargeProgress() {
        return Math.min(this.beamChargeTime / 1.0, 1.0);
    }
}
