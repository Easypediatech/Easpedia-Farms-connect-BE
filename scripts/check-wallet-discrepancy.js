"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const wallet_schema_1 = require("../src/schemas/wallet.schema");
const transaction_schema_1 = require("../src/schemas/transaction.schema");
const mongoose_2 = require("mongoose");
const Wallet = (0, mongoose_2.model)('Wallet', wallet_schema_1.WalletSchema);
const Transaction = (0, mongoose_2.model)('Transaction', transaction_schema_1.TransactionSchema);
async function checkWalletDiscrepancy() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    const userIds = [
        '6926aa851af199df23e93584',
        '69285668f562404cf20aaa49'
    ];
    for (const userId of userIds) {
        console.log(`\nUser ID: ${userId}`);
        const wallet = await Wallet.findOne({ user_id: userId, user_type: 'farmer' });
        console.log(`Wallet balance: ${wallet?.balance || 'NO_WALLET'} kobo`);
        const transactions = await Transaction.find({ user_id: userId, type: 'deposit' })
            .sort({ createdAt: 1 });
        console.log(`Total deposit transactions: ${transactions.length}`);
        let calculatedBalance = 0;
        transactions.forEach((tx, index) => {
            calculatedBalance += tx.amount;
            console.log(`  TX ${index + 1}: +${tx.amount} kobo, balance_after: ${tx.balance_after}, calculated: ${calculatedBalance}`);
        });
        const discrepancy = (wallet?.balance || 0) - calculatedBalance;
        console.log(`Expected balance: ${calculatedBalance} kobo`);
        console.log(`Actual wallet balance: ${wallet?.balance || 0} kobo`);
        console.log(`DISCREPANCY: ${discrepancy} kobo`);
    }
}
checkWalletDiscrepancy()
    .then(() => {
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
