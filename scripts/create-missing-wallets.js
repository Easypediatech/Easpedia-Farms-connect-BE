"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const user_schema_1 = require("../src/schemas/user.schema");
const farmer_schema_1 = require("../src/schemas/farmer.schema");
const wallet_schema_1 = require("../src/schemas/wallet.schema");
const purchase_schema_1 = require("../src/schemas/purchase.schema");
const mongoose_2 = require("mongoose");
const User = (0, mongoose_2.model)('User', user_schema_1.UserSchema);
const Farmer = (0, mongoose_2.model)('Farmer', farmer_schema_1.FarmerSchema);
const Wallet = (0, mongoose_2.model)('Wallet', wallet_schema_1.WalletSchema);
const Purchase = (0, mongoose_2.model)('Purchase', purchase_schema_1.PurchaseSchema);
async function createMissingWallets() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    const farmers = await Farmer.find({}).populate('user_id');
    console.log(`Total farmers: ${farmers.length}`);
    for (const farmer of farmers) {
        const wallet = await Wallet.findOne({ user_id: farmer.user_id });
        if (!wallet) {
            console.log(`Creating wallet for farmer ${farmer._id}`);
            const newWallet = new Wallet({
                user_id: farmer.user_id,
                user_type: 'farmer',
                balance: 0,
            });
            await newWallet.save();
            console.log(`  Wallet created: ${newWallet._id}`);
        }
        else {
            console.log(`Farmer ${farmer._id} has wallet: ${wallet._id} (${wallet.balance} kobo)`);
        }
    }
    console.log('\n--- PURCHASE CHECK ---');
    for (const farmer of farmers) {
        const purchases = await Purchase.find({
            farmerId: farmer._id.toString(),
            paymentStatus: 'paid',
        });
        const totalEarnings = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        console.log(`Farmer ${farmer._id}: ${purchases.length} purchases, earnings: ${totalEarnings} kobo`);
        if (purchases.length > 0) {
            const latest = purchases[purchases.length - 1];
            console.log(`  Latest purchase: ${latest._id} (${latest.totalAmount} kobo)`);
        }
    }
}
createMissingWallets()
    .then(() => {
    console.log('\nWallet creation complete');
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
