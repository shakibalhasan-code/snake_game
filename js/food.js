class Food {
    constructor(gameWidth, gameHeight) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.x = Utils.randomInt(-gameWidth, gameWidth);
        this.y = Utils.randomInt(-gameHeight, gameHeight);
        this.size = Utils.randomInt(5, 12);
        this.color = Utils.randomColor();
        this.glowing = Math.random() > 0.8;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;

        if (this.glowing) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
        }

        ctx.fill();
        ctx.restore();
    }
}
