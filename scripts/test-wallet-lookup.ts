import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { FarmerSchema } from '../src/schemas/farmer.schema';
import { WalletSchema } from '../src/schemas/wallet.schema';
import { model } from 'mongoose';

const Farmer = model('Farmer', FarmerSchema);
const Wallet = model('Wallet', WalletSchema);

async function testWalletLookup() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  console.log('Testing wallet lookup for farmers with earnings...');
  
  const farmersWithEarnings = [
    '6926aa861af199df23e93586',  // Should have 5,740,000 kobo (₦57,400)
    '69285668f562404cf20aaa4b'   // Should have 6,300,549,900 kobo (₦63,005,499)
  ];
  
  for (const farmerId of farmersWithEarnings) {
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      console.log(`Farmer ${farmerId}: NOT FOUND`);
      continue;
    }
    
    console.log(`\nFarmer ${farmerId}:`);
    console.log(`  User ID: ${farmer.user_id}`);
    console.log(`  Full Name: ${farmer.full_name}`);
    
    // Lookup wallet using user_id (as AdminService would do)
    const wallet = await Wallet.findOne({ 
      user_id: farmer.user_id, 
      user_type: 'farmer' 
    });
    
    if (wallet) {
      const balanceInNaira = wallet.balance / 100; // Convert kobo to naira
      console.log(`  Wallet Found: ${wallet._id}`);
      console.log(`  Balance: ${wallet.balance} kobo (₦${balanceInNaira.toLocaleString()})`);
    } else {
      console.log('  Wallet: NOT FOUND');
    }
    
    // This simulates what AdminService.transformToFarmerDetailDto() does
    const walletBalance = wallet ? Number((wallet.balance / 100).toFixed(2)) : 0;
    console.log(`  API Return Value: ₦${walletBalance.toLocaleString()}`);
  }
}

testWalletLookup()
  .then(() => {
    console.log('\nWallet lookup test completed');
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Test error:', err);
    disconnect();
    process.exit(1);
  });