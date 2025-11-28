export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;

        // Stats Counts
        this.atkCount = 0;
        this.spdCount = 0;
        this.defCount = 0;
        this.hpCount = 0; // Track HP items for exponential gain
        this.hp = 100;

        this.baseSpeed = 400; // Faster start (was 300)
        this.baseAtk = 5; // Stronger start (was 1)
        this.baseDef = 1;

        this.baseColor = '#00f0ff';
        this.color = this.baseColor;
        this.isCharging = false;

        // New Mechanics
        this.hasBeam = false; // Beam enabled by item
        this.chargePower = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.chargeDirection = { x: 0, y: -1 }; // Default: upward

        // Shake Detection
        this.lastX = x;
        this.shakeCount = 0;
        this.shakeTimer = 0;
        this.isShaking = false;

        this.weaponTimer = 0; // Fix for beam firing

        // Sword Mechanics
        this.swordCount = 0; // Multiple swords
        this.swordAngle = 0;
        this.swordRadius = 70; // Distance from player
        this.swordSize = 20;

        // Magnet Mechanics
        this.hasMagnet = false;
        this.magnetTimer = 0;
        this.magnetDuration = 10; // 10 seconds
        this.magnetRange = 200; // Attraction range
    }

    // Exponential Stat Getters
    get speed() {
        // Base + (Count * Multiplier) -> Exponential: Base * (1.1 ^ Count)
        let s = this.baseSpeed * Math.pow(1.10, this.spdCount); // 10% increase per item
        if (this.invincible) s *= 2; // Double speed when invincible
        return s;
    }

    get atk() {
        return this.baseAtk * Math.pow(1.3, this.atkCount); // 30% increase per item
    }

    get def() {
        return this.baseDef * Math.pow(1.2, this.defCount);
    }

    get canBreakOnContact() {
        // If ATK count is high enough, just touching blocks breaks them
        return this.atkCount >= 5;
    }

    upgrade(type) {
        switch (type) {
            case 'atk':
                this.atkCount++;
                break;
            case 'spd':
                this.spdCount++;
                break;
            case 'def':
                this.defCount++;
                break;
            case 'hp':
                this.hpCount++;
                // Exponential HP gain: Base 20 * (1.5 ^ count)
                // This allows HP to skyrocket
                const hpGain = 20 * Math.pow(1.5, this.hpCount);
                this.hp += hpGain;
                break;
            case 'beam':
                this.hasBeam = true;
                break;
            case 'sword':
                this.swordCount++;
                break;
            case 'magnet':
                this.hasMagnet = true;
                this.magnetTimer = this.magnetDuration;
                break;
        }
    }

    update(deltaTime, input) {
        // Magnet Timer
        if (this.hasMagnet) {
            this.magnetTimer -= deltaTime;
            if (this.magnetTimer <= 0) {
                this.hasMagnet = false;
            }
        }

        // Invincibility
        if (this.invincible) {
            this.invincibleTimer -= deltaTime;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // Charge Logic 2.0 (Modified for Beam)
        if (this.hasBeam) {
            // Beam Mode: Fire while holding input
            if (input.chargeActive) {
                this.isAttacking = true; // Flag to tell Game.js to fire
                this.isCharging = false;
            } else {
                this.isAttacking = false;
            }

            // Normal movement (always available in beam mode)
            if (!this.isCharging) {
                const move = input.getMovement();

                // Apply movement speed (slower if firing)
                const moveSpeed = this.isAttacking ? this.speed * 0.5 : this.speed;
                this.x += move.x * moveSpeed * deltaTime;
                this.y += move.y * moveSpeed * deltaTime;
            }
        } else {
            // Standard Charge Mode
            if (input.chargeActive) {
                this.isCharging = true;
                this.chargePower += deltaTime * 5; // Accumulate power
                this.chargePower = Math.min(this.chargePower, 20); // Cap power (higher for multi-block)

                // Color feedback: gradually turn red
                const chargeRatio = this.chargePower / 20;
                const r = Math.floor(255 * chargeRatio);
                const g = Math.floor(240 * (1 - chargeRatio));
                const b = 255;
                this.color = `rgb(${r}, ${g}, ${b})`;
            } else {
                if (this.isCharging) {
                    // RELEASE - Store current input direction
                    const move = input.getMovement();
                    if (move.x !== 0 || move.y !== 0) {
                        // Normalize direction
                        const magnitude = Math.sqrt(move.x * move.x + move.y * move.y);
                        this.chargeDirection = {
                            x: move.x / magnitude,
                            y: move.y / magnitude
                        };
                    } else {
                        // Default to upward if no input
                        this.chargeDirection = { x: 0, y: -1 };
                    }

                    this.isCharging = false;
                    this.isAttacking = true;
                    this.attackTimer = 0.5; // Duration of dash/attack
                    this.chargePower = Math.max(1, this.chargePower); // Min power
                }
                // Reset color when not charging
                if (!this.invincible) {
                    this.color = this.baseColor;
                }
            }

            if (this.isAttacking) {
                this.attackTimer -= deltaTime;
                if (this.attackTimer <= 0) {
                    this.isAttacking = false;
                    this.chargePower = 0;
                } else {
                    // Charge Attack Movement - Use stored direction
                    const speed = 500 + this.chargePower * 50;
                    this.x += this.chargeDirection.x * speed * deltaTime;
                    this.y += this.chargeDirection.y * speed * deltaTime;
                }
            } else if (!this.isCharging) {
                // Normal Movement
                const move = input.getMovement();

                // Shake Logic
                this.shakeTimer += deltaTime;
                if (this.shakeTimer > 0.2) { // Shorter window
                    this.shakeCount = 0;
                    this.shakeTimer = 0;
                }

                // Shake Detection
                // Require significant movement change
                if (Math.sign(move.x) !== Math.sign(this.lastX - this.x) && Math.abs(move.x) > 0.8) {
                    this.shakeCount++;
                    this.shakeTimer = 0;
                }
                this.lastX = this.x;

                if (this.shakeCount > 3) { // Slightly lower count but stricter timing/magnitude
                    this.isShaking = true;
                    // Visual feedback for shake attack
                } else {
                    this.isShaking = false;
                }
                this.x += move.x * this.speed * deltaTime;
                this.y += move.y * this.speed * deltaTime;
            }
        }

        // Sword Orbit
        if (this.swordCount > 0) {
            this.swordAngle += deltaTime * 5; // Rotation speed
        }

        // Boundary checks
        this.x = Math.max(this.radius, Math.min(window.innerWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(window.innerHeight - this.radius, this.y));
    }
}
