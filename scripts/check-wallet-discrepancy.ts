import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { WalletSchema } from '../src/schemas/wallet.schema';
import { TransactionSchema } from '../src/schemas/transaction.schema';
import { model } from 'mongoose';

const Wallet = model('Wallet', WalletSchema);
const Transaction = model('Transaction', TransactionSchema);

async function checkWalletDiscrepancy() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  const userIds = [
    '6926aa851af199df23e93584', // farmer user for 6926aa861af199df23e93586
    '69285668f562404cf20aaa49'  // farmer user for 69285668f562404cf20aaa4b
  ];
  
  for (const userId of userIds) {
    console.log(`\nUser ID: ${userId}`);
    
    // Get wallet
    const wallet = await Wallet.findOne({ user_id: userId, user_type: 'farmer' });
    console.log(`Wallet balance: ${wallet?.balance || 'NO_WALLET'} kobo`);
    
    // Get all transactions for this user
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
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    disconnect();
    process.exit(1);
  });