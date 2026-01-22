"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const farmer_schema_1 = require("../src/schemas/farmer.schema");
const wallet_schema_1 = require("../src/schemas/wallet.schema");
const mongoose_2 = require("mongoose");
const Farmer = (0, mongoose_2.model)('Farmer', farmer_schema_1.FarmerSchema);
const Wallet = (0, mongoose_2.model)('Wallet', wallet_schema_1.WalletSchema);
async function testWalletLookup() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    console.log('Testing wallet lookup for farmers with earnings...');
    const farmersWithEarnings = [
        '6926aa861af199df23e93586',
        '69285668f562404cf20aaa4b'
    ];
    for (const farmerId of farmersWithEarnings) {
        const farmer = await Farmer.findById(farmerId);
        if (!farmer) {
            console.log(`Farmer ${farmerId}: NOT FOUND`);
            continue;
        }
        console.log(`\nFarmer ${farmerId}:`);
        console.log(`  User ID: ${farmer.user_id}`);
        console.log(`  Full Name: ${farmer.full_name}`);
        const wallet = await Wallet.findOne({
            user_id: farmer.user_id,
            user_type: 'farmer'
        });
        if (wallet) {
            const balanceInNaira = wallet.balance / 100;
            console.log(`  Wallet Found: ${wallet._id}`);
            console.log(`  Balance: ${wallet.balance} kobo (₦${balanceInNaira.toLocaleString()})`);
        }
        else {
            console.log('  Wallet: NOT FOUND');
        }
        const walletBalance = wallet ? Number((wallet.balance / 100).toFixed(2)) : 0;
        console.log(`  API Return Value: ₦${walletBalance.toLocaleString()}`);
    }
}
testWalletLookup()
    .then(() => {
    console.log('\nWallet lookup test completed');
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Test error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
