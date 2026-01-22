import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { PurchaseSchema } from '../src/schemas/purchase.schema';
import { model } from 'mongoose';

const Purchase = model('Purchase', PurchaseSchema);

async function checkPurchases() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  const purchases = await Purchase.find({ 
    farmerId: { $in: ['6926aa861af199df23e93586', '69285668f562404cf20aaa4b'] } 
  }).sort({ createdAt: -1 });
  
  console.log('Recent purchases for farmers with earnings:');
  purchases.forEach(p => {
    console.log(`Purchase ${p._id}:`);
    console.log(`  Payment Status: ${p.paymentStatus}`);
    console.log(`  Total Amount: ${p.totalAmount} kobo`);
    console.log(`  Wallet Transaction ID: ${p.walletTransactionId || 'NONE'}`);
    console.log(`  Created: ${p.createdAt}`);
    console.log(`  Updated: ${p.updatedAt}`);
    console.log('---');
  });
  
  console.log(`\nTotal purchases found: ${purchases.length}`);
}

checkPurchases()
  .then(() => {
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    disconnect();
    process.exit(1);
  });