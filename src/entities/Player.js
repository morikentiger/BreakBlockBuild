export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 300;
        this.atk = 1;
        this.def = 1;
        this.hp = 100;
        this.baseColor = '#00f0ff';
        this.color = this.baseColor;
        this.isCharging = false;

        // New Mechanics
        this.weaponType = 'dash'; // 'dash', 'beam', 'sword'
        this.weaponTimer = 0;
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
    }

    upgrade(type) {
        switch (type) {
            case 'atk':
                this.atk += 1;
                if (this.atk > 5) this.weaponType = 'beam';
                else if (this.atk > 3) this.weaponType = 'sword';
                break;
            case 'spd':
                this.speed += 20;
                break;
            case 'def':
                this.def += 1;
                break;
            case 'hp':
                this.hp = Math.min(this.hp + 20, 100);
                break;
        }
    }

    update(deltaTime, input) {
        // Invincibility
        if (this.invincible) {
            this.invincibleTimer -= deltaTime;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.speed = 300; // Reset speed
            }
        }

        // Charge Logic 2.0
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

        // Boundary checks
        this.x = Math.max(this.radius, Math.min(window.innerWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(window.innerHeight - this.radius, this.y));
    }
}
