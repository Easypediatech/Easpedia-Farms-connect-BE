"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const transaction_schema_1 = require("../src/schemas/transaction.schema");
const farmer_schema_1 = require("../src/schemas/farmer.schema");
const mongoose_2 = require("mongoose");
const Transaction = (0, mongoose_2.model)('Transaction', transaction_schema_1.TransactionSchema);
const Farmer = (0, mongoose_2.model)('Farmer', farmer_schema_1.FarmerSchema);
async function fixLoanRepaymentTransactions() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    console.log('Finding loan repayment transactions with incorrect user_id...\n');
    const farmers = await Farmer.find({});
    const farmerToUserMap = new Map();
    farmers.forEach(farmer => {
        farmerToUserMap.set(farmer._id.toString(), farmer.user_id.toString());
    });
    const badLoanTransactions = [];
    for (const [farmerId, userId] of farmerToUserMap.entries()) {
        const badTransactions = await Transaction.find({
            user_id: farmerId,
            type: 'loan_repayment',
            user_type: 'farmer'
        });
        if (badTransactions.length > 0) {
            console.log(`Found ${badTransactions.length} bad loan repayment transactions for farmer ${farmerId}`);
            badTransactions.forEach(tx => {
                console.log(`  Transaction ${tx._id}: ${tx.amount} kobo, description: ${tx.description}`);
                badLoanTransactions.push({ tx, correctUserId: userId });
            });
        }
    }
    console.log(`\nTotal loan repayment transactions to fix: ${badLoanTransactions.length}`);
    if (badLoanTransactions.length === 0) {
        console.log('No loan repayment transactions need fixing');
        return;
    }
    for (const { tx, correctUserId } of badLoanTransactions) {
        console.log(`Fixing loan repayment transaction ${tx._id}: ${tx.user_id} -> ${correctUserId}`);
        await Transaction.updateOne({ _id: tx._id }, { user_id: correctUserId });
    }
    console.log('\nAll loan repayment transactions fixed!');
}
fixLoanRepaymentTransactions()
    .then(() => {
    console.log('\nLoan repayment transaction fix completed');
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
