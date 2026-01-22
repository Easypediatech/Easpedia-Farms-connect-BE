import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { TransactionSchema } from '../src/schemas/transaction.schema';
import { WalletSchema } from '../src/schemas/wallet.schema';
import { FarmerSchema } from '../src/schemas/farmer.schema';
import { model } from 'mongoose';

const Transaction = model('Transaction', TransactionSchema);
const Wallet = model('Wallet', WalletSchema);
const Farmer = model('Farmer', FarmerSchema);

async function fixTransactionUserIds() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  console.log('Finding deposit transactions that use farmer IDs instead of user IDs...');
  
  // Get all farmers to build mapping
  const farmers = await Farmer.find({});
  const farmerToUserMap = new Map();
  farmers.forEach(farmer => {
    farmerToUserMap.set(farmer._id.toString(), farmer.user_id.toString());
  });
  
  console.log(`Found ${farmers.length} farmers, checking transactions...`);
  
  // Find transactions where user_id matches a farmer_id instead of user_id
  const transactionsToFix: Array<{ tx: any; correctUserId: string }> = [];
  
  for (const [farmerId, userId] of farmerToUserMap.entries()) {
    const badTransactions = await Transaction.find({
      user_id: farmerId, // This should be userId instead
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
  
  // Fix each transaction
  for (const { tx, correctUserId } of transactionsToFix) {
    console.log(`Fixing transaction ${tx._id}: ${tx.user_id} -> ${correctUserId}`);
    
    await Transaction.updateOne(
      { _id: tx._id },
      { user_id: correctUserId }
    );
  }
  
  console.log('All transactions updated');
  
  // Now recalculate wallet balances
  console.log('\nRecalculating wallet balances...');
  
  const uniqueUserIds = [...new Set(transactionsToFix.map(item => item.correctUserId))];
  
  for (const userId of uniqueUserIds) {
    const wallet = await Wallet.findOne({ user_id: userId, user_type: 'farmer' });
    
    if (!wallet) {
      console.log(`No wallet found for user ${userId}, skipping`);
      continue;
    }
    
    // Calculate total from all deposit transactions
    const depositTransactions = await Transaction.find({
      user_id: userId,
      type: 'deposit',
      status: 'completed'
    });
    
    const totalBalance = depositTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    console.log(`User ${userId}: ${depositTransactions.length} deposits, total: ${totalBalance} kobo`);
    
    // Update wallet balance
    const previousBalance = wallet.balance;
    wallet.balance = totalBalance;
    await wallet.save();
    
    console.log(`Wallet ${wallet._id}: ${previousBalance} -> ${totalBalance} kobo`);
  }
}

fixTransactionUserIds()
  .then(() => {
    console.log('\nFix completed successfully');
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    disconnect();
    process.exit(1);
  });