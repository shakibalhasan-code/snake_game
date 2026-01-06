class SpatialGrid {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.buckets = new Map();
    }

    _getKey(x, y) {
        // Map coordinate to bucket key
        // Coordinates can be negative, so we use floor
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }

    clear() {
        this.buckets.clear();
    }

    insert(entity) {
        // We only insert the center point for simplicity, or bounding box?
        // For snake segments/food (circles), center is usually enough if cell size > max entity size.
        // Or we add to multiple buckets if it overlaps.
        // Optimization: Just center for now, with large enough buckets.
        const key = this._getKey(entity.x, entity.y);
        if (!this.buckets.has(key)) {
            this.buckets.set(key, []);
        }
        this.buckets.get(key).push(entity);
    }

    // Returns entities in same bucket + neighbors
    query(x, y, range) {
        const entities = [];
        const minX = Math.floor((x - range) / this.cellSize);
        const maxX = Math.floor((x + range) / this.cellSize);
        const minY = Math.floor((y - range) / this.cellSize);
        const maxY = Math.floor((y + range) / this.cellSize);

        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const key = `${cx},${cy}`;
                if (this.buckets.has(key)) {
                    const bucket = this.buckets.get(key);
                    for (let i = 0; i < bucket.length; i++) {
                        entities.push(bucket[i]);
                    }
                }
            }
        }
        return entities;
    }
}
