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
        // Single operation for better performance
        this.ctx.fillStyle = '#0d0d0d';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawPlayer(player) {
        this.ctx.save();
        this.ctx.translate(player.x, player.y);

        // Glow effect - only when invincible for performance
        if (player.invincible) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = player.color;
        }

        // Body
        this.ctx.fillStyle = player.invincible ? `hsl(${Date.now() % 360}, 100%, 50%)` : player.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Reset shadow for other elements
        this.ctx.shadowBlur = 0;

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

        // Visual Evolution: Attack Spikes - limit to reasonable number
        if (player.atk > 3) {
            this.ctx.fillStyle = '#ff0055';
            const spikeCount = Math.min(player.atk, 12); // Cap at 12 for performance
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

        // Sword Visuals
        if (player.swordCount > 0) {
            this.ctx.fillStyle = '#ffaa00'; // Gold
            for (let i = 0; i < player.swordCount; i++) {
                const angleOffset = (Math.PI * 2 / player.swordCount) * i;
                const currentAngle = player.swordAngle + angleOffset;

                const swordX = Math.cos(currentAngle) * player.swordRadius;
                const swordY = Math.sin(currentAngle) * player.swordRadius;

                this.ctx.save();
                this.ctx.translate(swordX, swordY);
                this.ctx.rotate(currentAngle + Math.PI / 2);

                // Draw Sword - simplified without shadow
                this.ctx.beginPath();
                this.ctx.moveTo(0, -20);
                this.ctx.lineTo(5, 0);
                this.ctx.lineTo(0, 20);
                this.ctx.lineTo(-5, 0);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.restore();
            }
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
        // Reduce shadow blur for performance
        // this.ctx.shadowBlur = 10;
        // this.ctx.shadowColor = item.color;

        // Shape based on type
        if (item.type === 'atk') {
            // Spiky Star
            this.ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                this.ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * item.radius,
                    Math.sin((18 + i * 72) * Math.PI / 180) * item.radius);
                this.ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (item.radius / 2),
                    Math.sin((54 + i * 72) * Math.PI / 180) * (item.radius / 2));
            }
            this.ctx.closePath();
            this.ctx.fill();
        } else if (item.type === 'spd') {
            // Lightning Bolt (Simplified Triangle/Zigzag)
            this.ctx.beginPath();
            this.ctx.moveTo(5, -item.radius);
            this.ctx.lineTo(-5, 0);
            this.ctx.lineTo(5, 0);
            this.ctx.lineTo(-5, item.radius);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (item.type === 'hp') {
            // Heart
            this.ctx.beginPath();
            const topCurveHeight = item.radius * 0.3;
            this.ctx.moveTo(0, item.radius * 0.3);
            this.ctx.bezierCurveTo(0, -item.radius * 0.5, -item.radius, -item.radius * 0.5, -item.radius, item.radius * 0.3);
            this.ctx.bezierCurveTo(-item.radius, item.radius * 0.8, 0, item.radius, 0, item.radius);
            this.ctx.bezierCurveTo(0, item.radius, item.radius, item.radius * 0.8, item.radius, item.radius * 0.3);
            this.ctx.bezierCurveTo(item.radius, -item.radius * 0.5, 0, -item.radius * 0.5, 0, item.radius * 0.3);
            this.ctx.fill();
        } else if (item.type === 'invincible') {
            // Swirly Lollipop (Spiral)
            this.ctx.beginPath();
            this.ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            for (let i = 0; i < 3; i++) { // Simple spiral approximation
                this.ctx.arc(0, 0, item.radius * (i + 1) / 3, 0, Math.PI * 2 * 0.8);
            }
            this.ctx.stroke();
        } else if (item.type === 'beam') {
            // Beam Icon (Circle with line)
            this.ctx.beginPath();
            this.ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.stroke();
            this.ctx.fillRect(-2, -item.radius, 4, item.radius * 2);
        } else if (item.type === 'sword') {
            // Sword Icon
            this.ctx.fillStyle = item.color;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -item.radius);
            this.ctx.lineTo(item.radius / 3, 0);
            this.ctx.lineTo(0, item.radius);
            this.ctx.lineTo(-item.radius / 3, 0);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (item.type === 'magnet') {
            // Magnet Icon (U-shape)
            this.ctx.strokeStyle = item.color;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(-item.radius * 0.6, -item.radius * 0.5);
            this.ctx.lineTo(-item.radius * 0.6, item.radius * 0.5);
            this.ctx.lineTo(-item.radius * 0.2, item.radius * 0.5);
            this.ctx.moveTo(item.radius * 0.6, -item.radius * 0.5);
            this.ctx.lineTo(item.radius * 0.6, item.radius * 0.5);
            this.ctx.lineTo(item.radius * 0.2, item.radius * 0.5);
            this.ctx.stroke();
        } else {
            // Default Circle
            this.ctx.beginPath();
            this.ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawBoss(boss) {
        this.ctx.save();

        // Phase-based glow
        if (boss.phase === 3) {
            this.ctx.shadowBlur = 30;
            this.ctx.shadowColor = boss.color;
        } else if (boss.phase === 2) {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = boss.color;
        }

        // Boss body
        this.ctx.fillStyle = boss.color;
        this.ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

        // Boss HP Bar
        const barWidth = boss.width;
        const barHeight = 8;
        const barY = boss.y - 15;

        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(boss.x, barY, barWidth, barHeight);
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(boss.x, barY, barWidth, barHeight);

        // HP gradient based on phase
        const hpRatio = boss.hp / boss.maxHp;
        if (hpRatio > 0.66) {
            this.ctx.fillStyle = '#00ff00';
        } else if (hpRatio > 0.33) {
            this.ctx.fillStyle = '#ffaa00';
        } else {
            this.ctx.fillStyle = '#ff0000';
        }
        this.ctx.fillRect(boss.x, barY, barWidth * hpRatio, barHeight);

        // Beam charge indicator
        if (boss.isChargingBeamAttack()) {
            const chargeProgress = boss.getBeamChargeProgress();
            this.ctx.fillStyle = `rgba(255, 0, 255, ${chargeProgress})`;
            this.ctx.fillRect(boss.x, boss.y + boss.height, boss.width, 5);

            // Warning text
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.font = 'bold 20px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('BEAM CHARGING!', boss.x + boss.width / 2, boss.y - 30);
        }

        // Ultimate Attack Warning - "死ぬが良い！"
        if (boss.isChargingUltimateAttack()) {
            const chargeProgress = boss.getUltimateChargeProgress();

            // Screen flash effect
            this.ctx.fillStyle = `rgba(255, 0, 0, ${chargeProgress * 0.3})`;
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Dramatic warning text
            this.ctx.save();
            this.ctx.fillStyle = '#ff0000';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            this.ctx.font = 'bold 60px Inter';
            this.ctx.textAlign = 'center';

            // Flashing effect
            const flash = Math.sin(Date.now() / 100) > 0;
            if (flash) {
                this.ctx.shadowBlur = 30;
                this.ctx.shadowColor = '#ff0000';
                this.ctx.strokeText('死ぬが良い！', this.width / 2, this.height / 2);
                this.ctx.fillText('死ぬが良い！', this.width / 2, this.height / 2);
            }

            // Charge bar
            const barWidth = 400;
            const barX = this.width / 2 - barWidth / 2;
            const barY = this.height / 2 + 50;

            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(barX, barY, barWidth, 20);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(barX, barY, barWidth * chargeProgress, 20);

            this.ctx.restore();
        }

        // Sword shield
        if (boss.swordCount > 0) {
            const swordPositions = boss.getSwordPositions();
            swordPositions.forEach(sword => {
                this.ctx.save();
                this.ctx.translate(sword.x, sword.y);
                this.ctx.rotate(sword.angle + Math.PI / 2);

                this.ctx.fillStyle = '#ff3300';
                this.ctx.beginPath();
                this.ctx.moveTo(0, -15);
                this.ctx.lineTo(4, 0);
                this.ctx.lineTo(0, 15);
                this.ctx.lineTo(-4, 0);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.restore();
            });
        }

        this.ctx.restore();
    }

    drawProjectile(proj) {
        this.ctx.save();

        if (proj.type === 'boss_bullet') {
            // Draw boss bullets as circles
            this.ctx.fillStyle = proj.color;
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (proj.type === 'homing_missile') {
            // Draw missile as a triangle pointing in velocity direction
            this.ctx.fillStyle = proj.color;
            const angle = Math.atan2(proj.vy, proj.vx);
            this.ctx.save();
            this.ctx.translate(proj.x, proj.y);
            this.ctx.rotate(angle);
            this.ctx.beginPath();
            this.ctx.moveTo(10, 0);
            this.ctx.lineTo(-5, 5);
            this.ctx.lineTo(-5, -5);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        } else if (proj.type === 'boss_beam') {
            // Draw boss beam as thick purple beam
            this.ctx.fillStyle = proj.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = proj.color;
            this.ctx.fillRect(proj.x - proj.width / 2, proj.y - proj.height / 2, proj.width, proj.height);
        } else if (proj.type === 'boomerang') {
            // Draw boomerang as spinning disc
            this.ctx.fillStyle = proj.color;
            this.ctx.save();
            this.ctx.translate(proj.x, proj.y);
            this.ctx.rotate(proj.spin || 0);

            // Draw X shape
            this.ctx.fillRect(-12, -2, 24, 4);
            this.ctx.fillRect(-2, -12, 4, 24);

            this.ctx.restore();
        } else if (proj.type === 'death_ray') {
            // Draw death ray as massive red beam
            this.ctx.fillStyle = proj.color;
            this.ctx.shadowBlur = 25;
            this.ctx.shadowColor = proj.color;
            this.ctx.fillRect(proj.x - proj.width / 2, proj.y - proj.height / 2, proj.width, proj.height);
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
