"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const transaction_schema_1 = require("../src/schemas/transaction.schema");
const wallet_schema_1 = require("../src/schemas/wallet.schema");
const farmer_schema_1 = require("../src/schemas/farmer.schema");
const mongoose_2 = require("mongoose");
const Transaction = (0, mongoose_2.model)('Transaction', transaction_schema_1.TransactionSchema);
const Wallet = (0, mongoose_2.model)('Wallet', wallet_schema_1.WalletSchema);
const Farmer = (0, mongoose_2.model)('Farmer', farmer_schema_1.FarmerSchema);
async function fixTransactionUserIds() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    console.log('Finding deposit transactions that use farmer IDs instead of user IDs...');
    const farmers = await Farmer.find({});
    const farmerToUserMap = new Map();
    farmers.forEach(farmer => {
        farmerToUserMap.set(farmer._id.toString(), farmer.user_id.toString());
    });
    console.log(`Found ${farmers.length} farmers, checking transactions...`);
    const transactionsToFix = [];
    for (const [farmerId, userId] of farmerToUserMap.entries()) {
        const badTransactions = await Transaction.find({
            user_id: farmerId,
            type: 'deposit',
            user_type: 'farmer'
        });
        if (badTransactions.length > 0) {
            console.log(`Found ${badTransactions.length} bad transactions for farmer ${farmerId}`);
            badTransactions.forEach(tx => {
                transactionsToFix.push({ tx, correctUserId: userId });
            });
        }
    }
    console.log(`Total transactions to fix: ${transactionsToFix.length}`);
    if (transactionsToFix.length === 0) {
        console.log('No transactions need fixing');
        return;
    }
    for (const { tx, correctUserId } of transactionsToFix) {
        console.log(`Fixing transaction ${tx._id}: ${tx.user_id} -> ${correctUserId}`);
        await Transaction.updateOne({ _id: tx._id }, { user_id: correctUserId });
    }
    console.log('All transactions updated');
    console.log('\nRecalculating wallet balances...');
    const uniqueUserIds = [...new Set(transactionsToFix.map(item => item.correctUserId))];
    for (const userId of uniqueUserIds) {
        const wallet = await Wallet.findOne({ user_id: userId, user_type: 'farmer' });
        if (!wallet) {
            console.log(`No wallet found for user ${userId}, skipping`);
            continue;
        }
        const depositTransactions = await Transaction.find({
            user_id: userId,
            type: 'deposit',
            status: 'completed'
        });
        const totalBalance = depositTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        console.log(`User ${userId}: ${depositTransactions.length} deposits, total: ${totalBalance} kobo`);
        const previousBalance = wallet.balance;
        wallet.balance = totalBalance;
        await wallet.save();
        console.log(`Wallet ${wallet._id}: ${previousBalance} -> ${totalBalance} kobo`);
    }
}
fixTransactionUserIds()
    .then(() => {
    console.log('\nFix completed successfully');
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
