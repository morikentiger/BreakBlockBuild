export class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0; // Seconds
        this.active = true;
        this.vy = -50;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        this.y += this.vy * deltaTime;
        if (this.life <= 0) this.active = false;
    }
}
