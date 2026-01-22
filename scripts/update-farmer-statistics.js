"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const mongoose_1 = require("@nestjs/mongoose");
const app_module_1 = require("../src/app.module");
const purchase_schema_1 = require("../src/schemas/purchase.schema");
const farmer_schema_1 = require("../src/schemas/farmer.schema");
async function updateFarmerStatistics() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const purchaseModel = app.get((0, mongoose_1.getModelToken)(purchase_schema_1.Purchase.name));
    const farmerModel = app.get((0, mongoose_1.getModelToken)(farmer_schema_1.Farmer.name));
    console.log('Starting farmer statistics update...');
    const completedPurchases = await purchaseModel.find({
        status: 'completed',
        paymentStatus: 'paid'
    });
    console.log(`Found ${completedPurchases.length} completed purchases`);
    const farmerPurchases = new Map();
    for (const purchase of completedPurchases) {
        const farmerId = purchase.farmerId;
        if (!farmerPurchases.has(farmerId)) {
            farmerPurchases.set(farmerId, []);
        }
        farmerPurchases.get(farmerId).push(purchase);
    }
    console.log(`Found purchases for ${farmerPurchases.size} unique farmers`);
    for (const [farmerId, purchases] of farmerPurchases) {
        try {
            const totalSales = purchases.length;
            const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
            const totalWeight = purchases.reduce((sum, purchase) => sum + purchase.weightKg, 0);
            console.log(`Updating farmer ${farmerId}: ${totalSales} sales, ₦${(totalEarnings / 100).toFixed(2)} earnings, ${totalWeight}kg`);
            const updateResult = await farmerModel.updateOne({ _id: farmerId }, {
                $set: {
                    total_sales: totalSales,
                    total_earnings: totalEarnings,
                    completed_sales: totalSales,
                }
            });
            if (updateResult.matchedCount === 0) {
                console.warn(`Farmer ${farmerId} not found in database`);
            }
            else {
                console.log(`✅ Updated farmer ${farmerId} statistics`);
            }
        }
        catch (error) {
            console.error(`❌ Failed to update farmer ${farmerId}:`, error);
        }
    }
    console.log('Farmer statistics update completed!');
    await app.close();
}
updateFarmerStatistics()
    .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
});
