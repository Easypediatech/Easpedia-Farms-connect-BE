import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { Purchase } from '../src/schemas/purchase.schema';
import { Farmer } from '../src/schemas/farmer.schema';

async function updateFarmerStatistics() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const purchaseModel = app.get<Model<Purchase>>(getModelToken(Purchase.name));
  const farmerModel = app.get<Model<Farmer>>(getModelToken(Farmer.name));

  console.log('Starting farmer statistics update...');

  // Get all completed purchases
  const completedPurchases = await purchaseModel.find({ 
    status: 'completed',
    paymentStatus: 'paid'
  });

  console.log(`Found ${completedPurchases.length} completed purchases`);

  // Group purchases by farmerId
  const farmerPurchases = new Map<string, any[]>();
  
  for (const purchase of completedPurchases) {
    const farmerId = purchase.farmerId;
    if (!farmerPurchases.has(farmerId)) {
      farmerPurchases.set(farmerId, []);
    }
    farmerPurchases.get(farmerId)!.push(purchase);
  }

  console.log(`Found purchases for ${farmerPurchases.size} unique farmers`);

  // Update each farmer's statistics
  for (const [farmerId, purchases] of farmerPurchases) {
    try {
      const totalSales = purchases.length;
      const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
      const totalWeight = purchases.reduce((sum, purchase) => sum + purchase.weightKg, 0);

      console.log(`Updating farmer ${farmerId}: ${totalSales} sales, ₦${(totalEarnings/100).toFixed(2)} earnings, ${totalWeight}kg`);

      const updateResult = await farmerModel.updateOne(
        { _id: farmerId },
        {
          $set: {
            total_sales: totalSales,
            total_earnings: totalEarnings, // in kobo
            completed_sales: totalSales,
          }
        }
      );

      if (updateResult.matchedCount === 0) {
        console.warn(`Farmer ${farmerId} not found in database`);
      } else {
        console.log(`✅ Updated farmer ${farmerId} statistics`);
      }
    } catch (error) {
      console.error(`❌ Failed to update farmer ${farmerId}:`, error);
    }
  }

  console.log('Farmer statistics update completed!');
  await app.close();
}

updateFarmerStatistics()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });