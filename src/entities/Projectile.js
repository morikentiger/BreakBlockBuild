export class Projectile {
    constructor(x, y, vx, vy, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type; // 'beam', 'bullet', 'boss_bullet'
        this.active = true;
        this.width = type === 'beam' ? 20 : 10;
        this.height = type === 'beam' ? 40 : 10;
        this.radius = type === 'boss_bullet' ? 8 : 5;
        this.color = type === 'boss_bullet' ? '#ff0055' : '#fff';
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }
}
