import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { TransactionSchema } from '../src/schemas/transaction.schema';
import { model } from 'mongoose';

const Transaction = model('Transaction', TransactionSchema);

async function checkTransactions() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
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
    } else {
      console.log(`Transaction ${txId}: NOT FOUND`);
    }
  }
}

checkTransactions()
  .then(() => {
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    disconnect();
    process.exit(1);
  });