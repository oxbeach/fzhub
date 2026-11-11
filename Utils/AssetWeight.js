/**
 * AssetWeight.js
 * A standard container for Ticker/Weight pairs.
 */


export class AssetWeight {
    constructor(ticker, weight = 0) {
        this.ticker = ticker;
        this.weight = weight; 
    }

    /**
     * Optional helper to ensure the pair is "Complete"
     * before the Portfolio engine tries to process it.
     */
    isPopulated() {
        return this.ticker !== "" && !isNaN(this.weight);
    }

    /**
     * adjustedAssetsWeight: The Precision Filter
     * Creates a high-accuracy array of simple objects for the math engine.
     */
    

    static adjustAssetsWeight(assetsArray, isEqualWeight) {
        if (!assetsArray || assetsArray.length === 0) return [];

        const count = assetsArray.length;
   
        return assetsArray.map(asset => {
            // Fork in the road: Logic vs. User Input
             const finalWeight =  (isEqualWeight ? (100.0 / count) : parseFloat(asset.weight || 0)) / 100;

            // Return the "Simple Object" (Data Bag)
            return {
                ticker: asset.ticker,
                weight: finalWeight
            };
        });
    }





}