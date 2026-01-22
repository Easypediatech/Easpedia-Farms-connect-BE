import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { FarmerSchema } from '../src/schemas/farmer.schema';
import { TransactionSchema } from '../src/schemas/transaction.schema';
import { model } from 'mongoose';

const Farmer = model('Farmer', FarmerSchema);
const Transaction = model('Transaction', TransactionSchema);

async function testPurchaseTransactionFlow() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  console.log('Testing purchase transaction user_id consistency...\n');
  
  // Get a farmer with transactions
  const farmer = await Farmer.findById('6926aa861af199df23e93586');
  if (!farmer) {
    console.log('Test farmer not found');
    return;
  }
  
  console.log(`Farmer ${farmer._id}:`);
  console.log(`  farmer._id: ${farmer._id}`);
  console.log(`  farmer.user_id: ${farmer.user_id}`);
  
  // Check transactions for this farmer
  const transactions = await Transaction.find({
    user_id: farmer.user_id,  // Should be using farmer.user_id now
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
    
    // Verify the user_id matches farmer.user_id (not farmer._id)
    const isCorrectUserId = tx.user_id?.toString() === farmer.user_id.toString();
    console.log(`    ✓ Correct user_id: ${isCorrectUserId ? 'YES' : 'NO'}`);
    console.log('    ---');
  }
  
  // Check if there are any bad transactions still using farmer._id
  const badTransactions = await Transaction.find({
    user_id: farmer._id,  // Should NOT find any transactions using farmer._id
    user_type: 'farmer'
  });
  
  console.log(`\nBad transactions (using farmer._id): ${badTransactions.length}`);
  if (badTransactions.length > 0) {
    console.log('⚠️  WARNING: Found transactions using farmer._id instead of farmer.user_id!');
    badTransactions.forEach(tx => {
      console.log(`  Bad transaction: ${tx._id} (${tx.type})`);
    });
  } else {
    console.log('✓ All transactions are using correct user_id!');
  }
}

testPurchaseTransactionFlow()
  .then(() => {
    console.log('\nTransaction consistency test completed');
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Test error:', err);
    disconnect();
    process.exit(1);
  });