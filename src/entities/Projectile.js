export class Projectile {
    constructor(x, y, vx, vy, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type; // 'beam', 'bullet', 'boss_bullet', 'homing_missile'
        this.active = true;
        this.width = type === 'beam' ? 20 : 10;
        this.height = type === 'beam' ? 40 : 10;
        this.radius = (type === 'boss_bullet' || type === 'homing_missile') ? 8 : 5;

        if (type === 'boss_bullet') this.color = '#ff0055';
        else if (type === 'homing_missile') this.color = '#ffaa00'; // Orange
        else this.color = '#fff';
    }

    update(deltaTime, target = null) {
        if (this.type === 'homing_missile' && target) {
            const speed = 350; // Faster (was 200)
            const turnRate = 1.0; // Slower turn (was 2.0) for "light homing"

            // Vector to target
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                // Desired velocity
                const targetVx = (dx / dist) * speed;
                const targetVy = (dy / dist) * speed;

                // Current angle
                let currentAngle = Math.atan2(this.vy, this.vx);
                // Target angle
                let targetAngle = Math.atan2(targetVy, targetVx);

                // Smoothly rotate towards target angle
                // Shortest angular distance
                let deltaAngle = targetAngle - currentAngle;
                while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

                // Clamp rotation
                const maxRotate = turnRate * deltaTime;
                if (Math.abs(deltaAngle) < maxRotate) {
                    currentAngle = targetAngle;
                } else {
                    currentAngle += Math.sign(deltaAngle) * maxRotate;
                }

                // Update velocity
                this.vx = Math.cos(currentAngle) * speed;
                this.vy = Math.sin(currentAngle) * speed;
            }
        }

        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }
}
