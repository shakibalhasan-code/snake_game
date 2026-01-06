class Snake {
    constructor(x, y, isBot = false, name = "Snake") {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.targetAngle = 0;
        this.speed = 3;
        this.turnSpeed = 0.08;
        this.size = 15; // Radius of body segments
        this.name = name;
        this.isBot = isBot;
        this.color = Utils.randomColor();

        // Body array: store positions
        this.body = [];
        this.length = 20; // Initial length
        // spacing between segments
        this.spacing = 8;

        // Initialize body
        for (let i = 0; i < this.length; i++) {
            this.body.push({ x: this.x, y: this.y });
        }

        this.score = 0;
        this.boost = false;

        // Bot state
        this.botTarget = { x: 0, y: 0 };
        this.changeTargetTimer = 0;
    }

    update(targetX, targetY, gameWidth, gameHeight, foods, dtFactor) {
        dtFactor = dtFactor || 1;

        // Handle Boosting
        if (this.boost && this.length > 5) { // Can only boost if length > 5
            this.speed = 6; // Boost speed
            this.score -= 0.1 * dtFactor; // Lose score scaled by time

            // Drop food particles
            if (Math.random() > (0.8 / dtFactor) && foods) {
                const f = new Food(gameWidth, gameHeight);
                const tail = this.body[this.body.length - 1];
                f.x = tail.x;
                f.y = tail.y;
                f.size = 5;
                f.color = this.color;
                f.glowing = true;
                foods.push(f);
            }
        } else {
            this.speed = 3;
            this.boost = false;
        }

        const currentSpeed = this.speed * dtFactor;

        // Angle calculation
        if (!this.isBot) {
            // Player follows mouse/target
            this.targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
        } else {
            this.updateBotAI(gameWidth, gameHeight, dtFactor);
        }

        // Smooth turning
        // Normalize angles
        let diff = this.targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        this.angle += diff * this.turnSpeed * dtFactor;

        // Move Head
        this.x += Math.cos(this.angle) * currentSpeed;
        this.y += Math.sin(this.angle) * currentSpeed;

        // Keep bounds (simple wrap or bounce, or infinite)
        // For snake.io usually it's a huge map with borders. 
        // Let's constrain to map size
        if (this.x < -gameWidth) this.x = -gameWidth;
        if (this.x > gameWidth) this.x = gameWidth;
        if (this.y < -gameHeight) this.y = -gameHeight;
        if (this.y > gameHeight) this.y = gameHeight;

        // Update Body
        // We push the new head position to the front
        // BUT to make it look smooth like a snake, we don't just shift the array.
        // We maintain a history of positions.

        // Actually, simple constraint distance logic works well for io games
        // Move head, drag next segment towards head, etc. 
        // But the history method (unshift head, pop tail) relies on speed matching.

        // Let's use the history method where we only add a new point if we moved enough
        // Or simpler: unshift head, keep length correct.

        // Update first segment to follow head strictly? 
        // No, typically index 0 is head.

        // Simple "dragging" algorithm for smooth snake
        // Head is already at this.x, this.y

        // We need to manage the body array "growing"
        // Let's insert head position
        this.body.unshift({ x: this.x, y: this.y });

        // Limit body size based on length (but account for speed/spacing?)
        // To keep constant spacing, we might need to store MANY points and only render some.
        // Let's stick to a simpler approximation for now:
        // Just store points. If we store every frame, the snake bunches up when slow.
        // Better: Update body segments to follow the one in front.

        // Reset body to just head at new pos, then drag others?
        // Let's reuse the array we have, but correct positions.
        // Actually, "unshift and pop" works if we want the snake to "slither" exactly along the path.
        // But to keep distance constant:

        // 1. Set head
        this.body[0] = { x: this.x, y: this.y };

        // 2. Drag rest
        for (let i = 1; i < this.body.length; i++) {
            const prev = this.body[i - 1];
            const curr = this.body[i];

            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.spacing) {
                // Drag towards prev
                const angle = Math.atan2(dy, dx);
                const newX = prev.x - Math.cos(angle) * this.spacing;
                const newY = prev.y - Math.sin(angle) * this.spacing;
                this.body[i] = { x: newX, y: newY };
            }
        }

        // Handle Growth: if this.body.length < this.length, we push duplicate of tail
        if (this.body.length < this.length) {
            const tail = this.body[this.body.length - 1];
            this.body.push({ ...tail });
        }
    }

    updateBotAI(w, h, dtFactor) {
        this.changeTargetTimer -= 1 * dtFactor;
        if (this.changeTargetTimer <= 0) {
            this.changeTargetTimer = Utils.randomInt(50, 150);
            this.botTarget.x = Utils.randomInt(-w + 100, w - 100);
            this.botTarget.y = Utils.randomInt(-h + 100, h - 100);

            // Random boost
            this.boost = Math.random() > 0.8;
        }

        // Avoid borders - forceful turn
        const margin = 200;
        if (this.x < -w + margin || this.x > w - margin || this.y < -h + margin || this.y > h - margin) {
            this.botTarget = { x: 0, y: 0 }; // Head to center
            this.boost = true;
        }

        this.targetAngle = Math.atan2(this.botTarget.y - this.y, this.botTarget.x - this.x);
    }

    grow(amount) {
        this.length += amount;
        this.score += amount * 10;
        // Visual size cap
        if (this.size < 40) this.size += amount * 0.05;
    }

    draw(ctx) {
        ctx.save();

        // Draw shadow/glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';

        // Draw segments from tail to head
        for (let i = this.body.length - 1; i >= 0; i--) {
            const segment = this.body[i];
            ctx.beginPath();

            // Head is slightly larger or different?
            let size = this.size;
            if (i === 0) {
                // Head
                ctx.fillStyle = "#ffffff"; // Eyes or different color
                size += 2;
            } else {
                // Alternating color for pattern effect
                ctx.fillStyle = (i % 2 === 0) ? this.color : ShadeColor(this.color, -20);
            }

            ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Draw Eyes on Head
            if (i === 0) {
                ctx.save();
                ctx.translate(segment.x, segment.y);
                ctx.rotate(this.angle);

                // Eyes
                ctx.fillStyle = "white";
                ctx.beginPath();
                ctx.arc(6, -6, 5, 0, Math.PI * 2);
                ctx.arc(6, 6, 5, 0, Math.PI * 2);
                ctx.fill();

                // Pupils
                ctx.fillStyle = "black";
                ctx.beginPath();
                ctx.arc(8, -6, 2, 0, Math.PI * 2);
                ctx.arc(8, 6, 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        // Name tag
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Outfit";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - this.size - 10);

        ctx.restore();
    }
}

// Helper to darken color
function ShadeColor(color, percent) {
    // Simple hex darken
    // Assume hex is #RRGGBB
    var R = parseInt(color.substring(1, 3), 16);
    var G = parseInt(color.substring(3, 5), 16);
    var B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    var RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    var GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    var BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
}
