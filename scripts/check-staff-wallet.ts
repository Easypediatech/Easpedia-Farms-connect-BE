// Usage: npx ts-node scripts/check-staff-wallet.ts <staffUserId>
import { connect, disconnect, model } from 'mongoose';
import { Wallet } from '../src/schemas/wallet.schema';
import { config } from 'dotenv';

config();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/farmconnect';
async function main() {
  const staffUserId = process.argv[2];
  if (!staffUserId) {
    console.error(
      'Usage: npx ts-node scripts/check-staff-wallet.ts <staffUserId>',
    );
    process.exit(1);
  }

  await connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect',
  );

  // Dynamically import WalletSchema
  const { WalletSchema } = await import('../src/schemas/wallet.schema');
  const Wallet = model('Wallet', WalletSchema);

  // Find wallet for staff
  const wallet = await Wallet.findOne({
    user_id: staffUserId,
    user_type: 'staff',
  });

  if (!wallet) {
    console.log('No wallet found for staff:', staffUserId);
  } else {
    console.log('Wallet for staff:', staffUserId);
    console.log('Balance:', wallet.balance);
    console.log('Escrow Balance:', wallet.escrow_balance);
    console.log('Savings Balance:', wallet.savings_balance);
    console.log('Pension Balance:', wallet.pension_balance);
    console.log('Total Earned:', wallet.total_earned);
  }

  await disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  disconnect();
  process.exit(1);
});
