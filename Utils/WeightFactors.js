


/**
 * ItemWeight.js
 * Atomic unit binding an item to a decimal weight (0.0 to 1.0).
 */
export class ItemWeight {
    constructor(item, weight = 0.0) {
        this.item = item;
        this.weight = parseFloat(weight) || 0.0; 
    }

    isPopulated() {
        return this.item !== "" && !isNaN(this.weight) && this.weight >= 0.0;
    }
}


/**
 * WeightFactors.js
 * First-class collection managing decimal weights with circuit breakers.
 */


export class WeightFactors {
    constructor() {
        this.items = []; 
        this.EPSILON = 1e-6;
    }

    /**
     * Pushes a new item/weight decimal onto the stack.
     * Enforces a 1.0 (100%) maximum total limit using an epsilon check.
     * * @param {string} item - The metric or asset label.
     * @param {number} weight - The numeric weight in decimal (e.g., 0.25).
     * @returns {number} -666 for fatal/corrupted data, negative decimal (-1.09) if exceeding 100%, or current positive sum.
     */
    push(item, weight) {
        const prospectiveEntry = new ItemWeight(item, weight);

        //alert("  push item " + item + "  weight " + weight);
        
        // Fatal Error: Malformed data or invalid bounds
        if (!prospectiveEntry.isPopulated()) {
            return -666;
        }

        const currentSum = this.getSum();
        const prospectiveSum = currentSum + prospectiveEntry.weight;

        // Exceeds 1.0 (100%) limit accounting for floating-point precision
        if (prospectiveSum > (1.0 + this.EPSILON)) {
            // Return negative of the actual prospective sum (e.g., -1.09 for 109%)
            return -Math.abs(prospectiveSum);
        }

        // Accept entry and return current running sum
        this.items.push(prospectiveEntry);
        return this.getSum();
    }

    /**
     * Clears the collection stack.
     */
    reset() {
        this.items = [];
    }

    /**
     * Sums the existing decimal weights.
     */
    getSum() {
        return this.items.reduce((sum, iWeight) => sum + iWeight.weight, 0.0);
    }

    /**
     * Validates if the collection is ready to compute.
     * Sum must equal exactly 1.0 (within epsilon tolerance) and contain items.
     */
    isReadyToCompute() {
        const sumIsOne = Math.abs(this.getSum() - 1.0) < this.EPSILON;
        return sumIsOne && this.items.length > 0;
    }

    /**
     * Normalizes collection for compute engines.
     * Because internal storage is already decimal, this is highly streamlined.
     * * @param {boolean} isEqualWeight - Forces equal distribution across items if true.
     * @returns {Array<{item: string, weight: number}>} Clean data bags for the math engine.
     */
    getAdjustedTuples(isEqualWeight) {
        const count = this.items.length;
        if (count === 0) return [];

        return this.items.map(iWeight => {
            const finalWeight = isEqualWeight ? (1.0 / count) : iWeight.weight;
            return {
                item: iWeight.item,
                weight: finalWeight
            };
        });
    }
}