export class Projectile {
    constructor(x, y, vx, vy, type, damage = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type; // 'beam', 'bullet', 'boss_bullet', 'homing_missile', 'boss_beam', 'boomerang'
        this.active = true;
        this.damage = damage; // Custom damage for special attacks

        // Size based on type
        if (type === 'beam') {
            this.width = 20;
            this.height = 40;
            this.radius = 5;
        } else if (type === 'boss_beam') {
            this.width = 15;
            this.height = 30;
            this.radius = 10;
        } else if (type === 'boomerang') {
            this.width = 20;
            this.height = 20;
            this.radius = 12;
            this.spin = 0;
            this.returnTimer = 0;
            this.returning = false;
        } else {
            this.width = 10;
            this.height = 10;
            this.radius = (type === 'boss_bullet' || type === 'homing_missile') ? 8 : 5;
        }

        // Color based on type
        if (type === 'boss_bullet') this.color = '#ff0055';
        else if (type === 'homing_missile') this.color = '#ffaa00';
        else if (type === 'boss_beam') this.color = '#ff00ff';
        else if (type === 'boomerang') this.color = '#00ffff';
        else this.color = '#fff';
    }

    update(deltaTime, target = null) {
        // Homing missile behavior
        if (this.type === 'homing_missile' && target) {
            const speed = 350;
            const turnRate = 1.0;

            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const targetVx = (dx / dist) * speed;
                const targetVy = (dy / dist) * speed;

                let currentAngle = Math.atan2(this.vy, this.vx);
                let targetAngle = Math.atan2(targetVy, targetVx);

                let deltaAngle = targetAngle - currentAngle;
                while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

                const maxRotate = turnRate * deltaTime;
                if (Math.abs(deltaAngle) < maxRotate) {
                    currentAngle = targetAngle;
                } else {
                    currentAngle += Math.sign(deltaAngle) * maxRotate;
                }

                this.vx = Math.cos(currentAngle) * speed;
                this.vy = Math.sin(currentAngle) * speed;
            }
        }

        // Boomerang behavior
        if (this.type === 'boomerang') {
            this.spin += deltaTime * 10;
            this.returnTimer += deltaTime;

            // After 1 second, start returning
            if (this.returnTimer > 1.0 && !this.returning) {
                this.returning = true;
                this.vx = -this.vx * 1.2;
                this.vy = -this.vy * 1.2;
            }

            // Add slight curve
            if (!this.returning) {
                this.vy += 100 * deltaTime; // Gravity-like curve
            }
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }
}
