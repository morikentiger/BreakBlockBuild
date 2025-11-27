export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.type = type; // 'atk', 'spd', 'def', 'hp'
        this.active = true;

        this.color = this.getColorByType(type);
        this.pulse = 0;
    }

    getColorByType(type) {
        switch (type) {
            case 'atk': return '#ff0055'; // Red
            case 'spd': return '#00f0ff'; // Cyan
            case 'def': return '#ffff00'; // Yellow
            case 'hp': return '#00ff00'; // Green
            case 'invincible': return '#ffffff'; // White/Rainbow
            default: return '#ffffff';
        }
    }

    update(deltaTime, speed) {
        this.y += speed * deltaTime;
        this.pulse += deltaTime * 5;
    }
}
