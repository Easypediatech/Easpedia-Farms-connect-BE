"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = require("mongoose");
const farmer_schema_1 = require("../src/schemas/farmer.schema");
const mongoose_2 = require("mongoose");
const Farmer = (0, mongoose_2.model)('Farmer', farmer_schema_1.FarmerSchema);
async function inspectFarmerObject() {
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
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
    }
    else {
        console.log('Farmer not found');
    }
}
inspectFarmerObject()
    .then(() => {
    (0, mongoose_1.disconnect)();
    process.exit(0);
})
    .catch(err => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
