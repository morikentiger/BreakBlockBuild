export class Input {
    constructor() {
        this.keys = {};
        this.joystick = { x: 0, y: 0, active: false };
        this.chargeActive = false;

        // Bind handlers for proper cleanup
        this.keydownHandler = (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') this.chargeActive = true;
        };
        this.keyupHandler = (e) => {
            this.keys[e.code] = false;
            if (e.code === 'Space') this.chargeActive = false;
        };

        this.setupKeyboard();
        this.setupTouch();
    }

    destroy() {
        // Remove keyboard listeners
        window.removeEventListener('keydown', this.keydownHandler);
        window.removeEventListener('keyup', this.keyupHandler);

        // Remove mouse listeners
        if (this.mousemoveHandler) {
            window.removeEventListener('mousemove', this.mousemoveHandler);
        }
        if (this.mouseupHandler) {
            window.removeEventListener('mouseup', this.mouseupHandler);
        }

        // Clear joystick visual
        const knob = document.querySelector('.joystick-knob');
        if (knob) {
            knob.remove();
        }
    }

    setupKeyboard() {
        window.addEventListener('keydown', this.keydownHandler);
        window.addEventListener('keyup', this.keyupHandler);
    }

    setupTouch() {
        const joystickZone = document.getElementById('joystick-zone');
        const actionButton = document.getElementById('action-button');

        // Joystick Logic
        let startX, startY;

        const handleStart = (x, y) => {
            startX = x;
            startY = y;
            this.joystick.active = true;
            this.updateJoystickVisual(0, 0);
        };

        const handleMove = (x, y) => {
            if (!this.joystick.active) return;
            const dx = x - startX;
            const dy = y - startY;

            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 40; // Max joystick travel

            const angle = Math.atan2(dy, dx);
            const clampedDist = Math.min(distance, maxDist);

            const joyX = Math.cos(angle) * clampedDist;
            const joyY = Math.sin(angle) * clampedDist;

            this.joystick.x = joyX / maxDist;
            this.joystick.y = joyY / maxDist;

            this.updateJoystickVisual(joyX, joyY);
        };

        const handleEnd = () => {
            this.joystick.active = false;
            this.joystick.x = 0;
            this.joystick.y = 0;
            this.updateJoystickVisual(0, 0);
        };

        // Touch Events
        joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        });

        joystickZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        });

        joystickZone.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleEnd();
        });


        // Mouse Events
        joystickZone.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleStart(e.clientX, e.clientY);
        });

        this.mousemoveHandler = (e) => {
            if (this.joystick.active) {
                e.preventDefault();
                handleMove(e.clientX, e.clientY);
            }
        };

        this.mouseupHandler = (e) => {
            if (this.joystick.active) {
                e.preventDefault();
                handleEnd();
            }
        };

        window.addEventListener('mousemove', this.mousemoveHandler);
        window.addEventListener('mouseup', this.mouseupHandler);


        // Action Button Logic
        const activateCharge = (e) => {
            if (e.cancelable) e.preventDefault();
            this.chargeActive = true;
        };

        const deactivateCharge = (e) => {
            if (e.cancelable) e.preventDefault();
            this.chargeActive = false;
        };

        actionButton.addEventListener('touchstart', activateCharge);
        actionButton.addEventListener('touchend', deactivateCharge);
        actionButton.addEventListener('mousedown', activateCharge);
        actionButton.addEventListener('mouseup', deactivateCharge);
        actionButton.addEventListener('mouseleave', deactivateCharge);
    }

    updateJoystickVisual(x, y) {
        // We need to create the knob if it doesn't exist, or select it
        let knob = document.querySelector('.joystick-knob');
        if (!knob) {
            knob = document.createElement('div');
            knob.className = 'joystick-knob';
            document.getElementById('joystick-zone').appendChild(knob);
        }
        knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }

    getMovement() {
        // Combine Keyboard and Joystick
        let x = 0;
        let y = 0;

        if (this.keys['ArrowLeft'] || this.keys['KeyA']) x -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) x += 1;
        if (this.keys['ArrowUp'] || this.keys['KeyW']) y -= 1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) y += 1;

        if (x !== 0 || y !== 0) {
            // Normalize keyboard input
            const len = Math.sqrt(x * x + y * y);
            x /= len;
            y /= len;
        }

        if (this.joystick.active) {
            x = this.joystick.x;
            y = this.joystick.y;
        }

        return { x, y };
    }
}
