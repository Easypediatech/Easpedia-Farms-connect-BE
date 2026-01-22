import 'dotenv/config';
import { connect, disconnect } from 'mongoose';
import { FarmerSchema } from '../src/schemas/farmer.schema';
import { model } from 'mongoose';

const Farmer = model('Farmer', FarmerSchema);

async function inspectFarmerObject() {
  await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
  
  // Get one of the farmers with purchases
  const farmer = await Farmer.findById('6926aa861af199df23e93586');
  
  if (farmer) {
    console.log('Farmer object structure:');
    console.log('farmer._id:', farmer._id);
    console.log('farmer._id type:', typeof farmer._id);
    console.log('farmer._id toString:', farmer._id.toString());
    
    console.log('farmer.user_id:', farmer.user_id);
    console.log('farmer.user_id type:', typeof farmer.user_id);
    console.log('farmer.user_id toString:', farmer.user_id.toString());
    
    console.log('Are they equal?', farmer._id.toString() === farmer.user_id.toString());
  } else {
    console.log('Farmer not found');
  }
}

inspectFarmerObject()
  .then(() => {
    disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    disconnect();
    process.exit(1);
  });