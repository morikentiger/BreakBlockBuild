export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 300;
        this.atk = 1;
        this.def = 1;
        this.hp = 100;
        this.color = '#00f0ff';
        this.isCharging = false;

        // New Mechanics
        this.weaponType = 'dash'; // 'dash', 'beam', 'sword'
        this.weaponTimer = 0;
        this.chargePower = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.invincible = false;
        this.invincibleTimer = 0;

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
            this.chargePower = Math.min(this.chargePower, 10); // Cap power
            // Visual shake or glow could increase here
        } else {
            if (this.isCharging) {
                // RELEASE
                this.isCharging = false;
                this.isAttacking = true;
                this.attackTimer = 0.5; // Duration of dash/attack
                this.chargePower = Math.max(1, this.chargePower); // Min power
            }
        }

        if (this.isAttacking) {
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.chargePower = 0;
            } else {
                // Charge Attack Movement
                this.y -= (500 + this.chargePower * 50) * deltaTime;
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
