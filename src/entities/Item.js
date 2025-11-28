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
            case 'spd': return '#ffff00'; // Yellow
            case 'def': return '#0055ff'; // Blue
            case 'hp': return '#ff00ff'; // Magenta
            case 'invincible': return '#ffffff'; // White
            case 'beam': return '#00f0ff'; // Cyan
            default: return '#aaaaaa';
        }
    }

    update(deltaTime, speed) {
        this.y += speed * deltaTime;
        this.pulse += deltaTime * 5;
    }
}
