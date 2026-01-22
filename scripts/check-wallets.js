"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const user_schema_1 = require("../src/schemas/user.schema");
const farmer_schema_1 = require("../src/schemas/farmer.schema");
const wallet_schema_1 = require("../src/schemas/wallet.schema");
const mongoose_2 = require("mongoose");
const User = (0, mongoose_2.model)('User', user_schema_1.UserSchema);
const Farmer = (0, mongoose_2.model)('Farmer', farmer_schema_1.FarmerSchema);
const Wallet = (0, mongoose_2.model)('Wallet', wallet_schema_1.WalletSchema);
async function checkWallets() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    const farmers = await Farmer.find({}).populate('user_id');
    console.log(`Total farmers: ${farmers.length}`);
    let missingWallets = 0;
    for (const farmer of farmers) {
        const wallet = await Wallet.findOne({ user_id: farmer.user_id });
        if (wallet) {
            console.log(`Farmer ${farmer._id} (User: ${farmer.user_id}): Wallet EXISTS, Balance: ${wallet.balance} kobo`);
        }
        else {
            console.log(`Farmer ${farmer._id} (User: ${farmer.user_id}): Wallet MISSING`);
            missingWallets++;
        }
    }
    console.log(`\nSummary: ${missingWallets} farmers missing wallets`);
}
checkWallets()
    .then(() => {
    console.log('Check complete');
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
