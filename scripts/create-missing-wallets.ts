import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { UserSchema } from '../src/schemas/user.schema';
import { FarmerSchema } from '../src/schemas/farmer.schema';
import { WalletSchema } from '../src/schemas/wallet.schema';
import { PurchaseSchema } from '../src/schemas/purchase.schema';
import { model } from 'mongoose';

const User = model('User', UserSchema);
const Farmer = model('Farmer', FarmerSchema);
const Wallet = model('Wallet', WalletSchema);
const Purchase = model('Purchase', PurchaseSchema);

async function createMissingWallets() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  const farmers = await Farmer.find({}).populate('user_id');
  console.log(`Total farmers: ${farmers.length}`);
  
  for (const farmer of farmers) {
    const wallet = await Wallet.findOne({ user_id: farmer.user_id });
    if (!wallet) {
      console.log(`Creating wallet for farmer ${farmer._id}`);
      const newWallet = new Wallet({
        user_id: farmer.user_id,
        user_type: 'farmer',
        balance: 0,
      });
      await newWallet.save();
      console.log(`  Wallet created: ${newWallet._id}`);
    } else {
      console.log(`Farmer ${farmer._id} has wallet: ${wallet._id} (${wallet.balance} kobo)`);
    }
  }
  
  // Now check purchases for these farmers
  console.log('\n--- PURCHASE CHECK ---');
  for (const farmer of farmers) {
    const purchases = await Purchase.find({
      farmerId: farmer._id.toString(),
      paymentStatus: 'paid',
    });
    const totalEarnings = purchases.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0,
    );
    console.log(`Farmer ${farmer._id}: ${purchases.length} purchases, earnings: ${totalEarnings} kobo`);
    
    if (purchases.length > 0) {
      const latest = purchases[purchases.length - 1];
      console.log(`  Latest purchase: ${latest._id} (${latest.totalAmount} kobo)`);
    }
  }
}

createMissingWallets()
  .then(() => {
    console.log('\nWallet creation complete');
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    disconnect();
    process.exit(1);
  });