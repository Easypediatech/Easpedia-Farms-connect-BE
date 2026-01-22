import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { TransactionSchema } from '../src/schemas/transaction.schema';
import { FarmerSchema } from '../src/schemas/farmer.schema';
import { model } from 'mongoose';

const Transaction = model('Transaction', TransactionSchema);
const Farmer = model('Farmer', FarmerSchema);

async function fixLoanRepaymentTransactions() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  console.log('Finding loan repayment transactions with incorrect user_id...\n');
  
  // Get all farmers to build mapping
  const farmers = await Farmer.find({});
  const farmerToUserMap = new Map();
  farmers.forEach(farmer => {
    farmerToUserMap.set(farmer._id.toString(), farmer.user_id.toString());
  });
  
  // Find loan_repayment transactions that use farmer_id instead of user_id
  const badLoanTransactions: Array<{ tx: any; correctUserId: string }> = [];
  
  for (const [farmerId, userId] of farmerToUserMap.entries()) {
    const badTransactions = await Transaction.find({
      user_id: farmerId, // Should be userId instead
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
  
  // Fix each transaction
  for (const { tx, correctUserId } of badLoanTransactions) {
    console.log(`Fixing loan repayment transaction ${tx._id}: ${tx.user_id} -> ${correctUserId}`);
    
    await Transaction.updateOne(
      { _id: tx._id },
      { user_id: correctUserId }
    );
  }
  
  console.log('\nAll loan repayment transactions fixed!');
}

fixLoanRepaymentTransactions()
  .then(() => {
    console.log('\nLoan repayment transaction fix completed');
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    disconnect();
    process.exit(1);
  });