"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const farmer_schema_1 = require("../src/schemas/farmer.schema");
const transaction_schema_1 = require("../src/schemas/transaction.schema");
const mongoose_2 = require("mongoose");
const Farmer = (0, mongoose_2.model)('Farmer', farmer_schema_1.FarmerSchema);
const Transaction = (0, mongoose_2.model)('Transaction', transaction_schema_1.TransactionSchema);
async function testPurchaseTransactionFlow() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    console.log('Testing purchase transaction user_id consistency...\n');
    const farmer = await Farmer.findById('6926aa861af199df23e93586');
    if (!farmer) {
        console.log('Test farmer not found');
        return;
    }
    console.log(`Farmer ${farmer._id}:`);
    console.log(`  farmer._id: ${farmer._id}`);
    console.log(`  farmer.user_id: ${farmer.user_id}`);
    const transactions = await Transaction.find({
        user_id: farmer.user_id,
        $or: [
            { type: 'deposit' },
            { type: 'loan_repayment' }
        ]
    }).sort({ createdAt: -1 });
    console.log(`\nTransactions found: ${transactions.length}`);
    for (const tx of transactions) {
        console.log(`  Transaction ${tx._id}:`);
        console.log(`    Type: ${tx.type}`);
        console.log(`    user_id: ${tx.user_id}`);
        console.log(`    Amount: ${tx.amount} kobo`);
        console.log(`    Description: ${tx.description}`);
        console.log(`    Status: ${tx.status}`);
        const isCorrectUserId = tx.user_id.toString() === farmer.user_id.toString();
        console.log(`    ✓ Correct user_id: ${isCorrectUserId ? 'YES' : 'NO'}`);
        console.log('    ---');
    }
    const badTransactions = await Transaction.find({
        user_id: farmer._id,
        user_type: 'farmer'
    });
    console.log(`\nBad transactions (using farmer._id): ${badTransactions.length}`);
    if (badTransactions.length > 0) {
        console.log('⚠️  WARNING: Found transactions using farmer._id instead of farmer.user_id!');
        badTransactions.forEach(tx => {
            console.log(`  Bad transaction: ${tx._id} (${tx.type})`);
        });
    }
    else {
        console.log('✓ All transactions are using correct user_id!');
    }
}
testPurchaseTransactionFlow()
    .then(() => {
    console.log('\nTransaction consistency test completed');
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Test error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
