const Utils = {
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1) + min),
    
    randomColor: () => {
        const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#1dd1a1'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    distance: (x1, y1, x2, y2) => {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    lerp: (start, end, amt) => {
        return (1 - amt) * start + amt * end;
    },

    // Convert degrees to radians
    degToRad: (deg) => deg * (Math.PI / 180),

    // Check collision between circle and circle
    circleCollision: (x1, y1, r1, x2, y2, r2) => {
        const dist = Utils.distance(x1, y1, x2, y2);
        return dist < r1 + r2;
    }
};
