"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const transaction_schema_1 = require("../src/schemas/transaction.schema");
const mongoose_2 = require("mongoose");
const Transaction = (0, mongoose_2.model)('Transaction', transaction_schema_1.TransactionSchema);
async function checkTransactions() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    const transactionIds = [
        '6929fa70ab0c5b9b99c9ecc5',
        '6929e58efd3825683dcc449b',
        '6929e49e07c540a78e4f5969',
        '6929e618fd3825683dcc44e3'
    ];
    console.log('Checking wallet transactions:');
    for (const txId of transactionIds) {
        const tx = await Transaction.findById(txId);
        if (tx) {
            console.log(`Transaction ${txId}:`);
            console.log(`  Type: ${tx.type}`);
            console.log(`  Amount: ${tx.amount} kobo`);
            console.log(`  Balance Before: ${tx.balance_before} kobo`);
            console.log(`  Balance After: ${tx.balance_after} kobo`);
            console.log(`  Status: ${tx.status}`);
            console.log(`  User ID: ${tx.user_id}`);
            console.log(`  Description: ${tx.description}`);
            console.log('---');
        }
        else {
            console.log(`Transaction ${txId}: NOT FOUND`);
        }
    }
}
checkTransactions()
    .then(() => {
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
