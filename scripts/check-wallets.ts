import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { UserSchema } from '../src/schemas/user.schema';
import { FarmerSchema } from '../src/schemas/farmer.schema';
import { WalletSchema } from '../src/schemas/wallet.schema';
import { model } from 'mongoose';

const User = model('User', UserSchema);
const Farmer = model('Farmer', FarmerSchema);
const Wallet = model('Wallet', WalletSchema);

async function checkWallets() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  const farmers = await Farmer.find({}).populate('user_id');
  console.log(`Total farmers: ${farmers.length}`);
  
  let missingWallets = 0;
  
  for (const farmer of farmers) {
    const wallet = await Wallet.findOne({ user_id: farmer.user_id });
    if (wallet) {
      console.log(`Farmer ${farmer._id} (User: ${farmer.user_id}): Wallet EXISTS, Balance: ${wallet.balance} kobo`);
    } else {
      console.log(`Farmer ${farmer._id} (User: ${farmer.user_id}): Wallet MISSING`);
      missingWallets++;
    }
  }
  
  console.log(`\nSummary: ${missingWallets} farmers missing wallets`);
}

checkWallets()
  .then(() => {
    console.log('Check complete');
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    disconnect();
    process.exit(1);
  });