"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const purchase_schema_1 = require("../src/schemas/purchase.schema");
const mongoose_2 = require("mongoose");
const Purchase = (0, mongoose_2.model)('Purchase', purchase_schema_1.PurchaseSchema);
async function checkPurchases() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    const purchases = await Purchase.find({
        farmerId: { $in: ['6926aa861af199df23e93586', '69285668f562404cf20aaa4b'] }
    }).sort({ createdAt: -1 });
    console.log('Recent purchases for farmers with earnings:');
    purchases.forEach(p => {
        console.log(`Purchase ${p._id}:`);
        console.log(`  Payment Status: ${p.paymentStatus}`);
        console.log(`  Total Amount: ${p.totalAmount} kobo`);
        console.log(`  Wallet Transaction ID: ${p.walletTransactionId || 'NONE'}`);
        console.log(`  Created: ${p.createdAt}`);
        console.log(`  Updated: ${p.updatedAt}`);
        console.log('---');
    });
    console.log(`\nTotal purchases found: ${purchases.length}`);
}
checkPurchases()
    .then(() => {
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
