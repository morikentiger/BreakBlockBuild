export class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 100;
        this.hp = 100;
        this.maxHp = 100;
        this.active = true;
        this.color = '#ff0000';
        this.state = 'idle'; // idle, attack, move
        this.timer = 0;
    }

    update(deltaTime, player) {
        this.timer += deltaTime;

        // Simple AI: Move towards player horizontally
        const dx = player.x - (this.x + this.width / 2);
        if (Math.abs(dx) > 10) {
            this.x += Math.sign(dx) * 100 * deltaTime;
        }

        // Hover effect
        this.y = 50 + Math.sin(this.timer * 2) * 20;
    }
}
