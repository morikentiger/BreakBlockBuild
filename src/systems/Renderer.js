export class Renderer {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        // Draw background grid or effect
        this.ctx.fillStyle = '#0d0d0d';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawPlayer(player) {
        this.ctx.save();
        this.ctx.translate(player.x, player.y);

        // Glow effect
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = player.color;

        // Body
        this.ctx.fillStyle = player.invincible ? `hsl(${Date.now() % 360}, 100%, 50%)` : player.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Shake Effect
        if (player.isShaking) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Visual Evolution: Defense Shield
        if (player.def > 3) {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 2 + (player.def - 3);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, player.radius + 5 + (player.def), 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Visual Evolution: Attack Spikes
        if (player.atk > 3) {
            this.ctx.fillStyle = '#ff0055';
            const spikeCount = player.atk;
            for (let i = 0; i < spikeCount; i++) {
                const angle = (Math.PI * 2 / spikeCount) * i;
                const sx = Math.cos(angle) * (player.radius + 10);
                const sy = Math.sin(angle) * (player.radius + 10);
                this.ctx.beginPath();
                this.ctx.arc(sx, sy, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        if (player.isCharging) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, player.radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawBlock(block) {
        this.ctx.fillStyle = block.color;
        this.ctx.fillRect(block.x, block.y, block.width, block.height);

        // Outline
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(block.x, block.y, block.width, block.height);

        // Cracks
        if (block.hp < block.maxHp) {
            const damageRatio = 1 - (block.hp / block.maxHp);
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            if (damageRatio > 0.3) {
                this.ctx.moveTo(block.x + 10, block.y + 10);
                this.ctx.lineTo(block.x + block.width / 2, block.y + block.height / 2);
            }
            if (damageRatio > 0.6) {
                this.ctx.moveTo(block.x + block.width - 10, block.y + 10);
                this.ctx.lineTo(block.x + block.width / 2, block.y + block.height / 2);
            }
            if (damageRatio > 0.8) {
                this.ctx.moveTo(block.x + block.width / 2, block.y + block.height - 10);
                this.ctx.lineTo(block.x + block.width / 2, block.y + block.height / 2);
            }
            this.ctx.stroke();
        }
    }

    drawItem(item) {
        this.ctx.save();
        this.ctx.translate(item.x, item.y);

        const scale = 1 + Math.sin(item.pulse) * 0.1;
        this.ctx.scale(scale, scale);

        this.ctx.fillStyle = item.color;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = item.color;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawBoss(boss) {
        this.ctx.fillStyle = boss.color;
        this.ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

        // Boss HP Bar
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(boss.x, boss.y - 10, boss.width, 5);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(boss.x, boss.y - 10, boss.width * (boss.hp / boss.maxHp), 5);
    }

    drawProjectile(proj) {
        this.ctx.save();
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = proj.color;

        if (proj.type === 'boss_bullet') {
            // Draw boss bullets as circles
            this.ctx.fillStyle = proj.color;
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Draw player projectiles as rectangles
            this.ctx.fillStyle = proj.type === 'beam' ? '#00f0ff' : '#ff0055';
            this.ctx.fillRect(proj.x - proj.width / 2, proj.y - proj.height / 2, proj.width, proj.height);
        }

        this.ctx.restore();
    }

    drawFloatingText(text) {
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, text.life);
        this.ctx.fillStyle = text.color;
        this.ctx.font = 'bold 20px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text.text, text.x, text.y);
        this.ctx.restore();
    }
}
