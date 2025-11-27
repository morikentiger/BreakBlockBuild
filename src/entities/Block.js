export class Block {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'normal', 'hard', 'resource'
        this.active = true;

        // Stats based on type
        this.hp = (type === 'hard' ? 3 : 1) * 10; // 10x HP
        this.maxHp = this.hp;
        this.color = this.getColorByType(type);
    }

    getColorByType(type) {
        switch (type) {
            case 'hard': return '#ff0055'; // Redish
            case 'resource': return '#00ff00'; // Greenish
            default: return '#aaaaaa'; // Grey
        }
    }

    update(deltaTime, speed) {
        this.y += speed * deltaTime;

        // Deactivate if off screen (handled by manager usually, but self-check is ok)
    }
}
