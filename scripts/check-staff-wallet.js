"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/farmconnect';
async function main() {
    const staffUserId = process.argv[2];
    if (!staffUserId) {
        console.error('Usage: npx ts-node scripts/check-staff-wallet.ts <staffUserId>');
        process.exit(1);
    }
    await (0, mongoose_1.connect)(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmconnect');
    const { WalletSchema } = await Promise.resolve().then(() => __importStar(require('../src/schemas/wallet.schema')));
    const Wallet = (0, mongoose_1.model)('Wallet', WalletSchema);
    const wallet = await Wallet.findOne({
        user_id: staffUserId,
        user_type: 'staff',
    });
    if (!wallet) {
        console.log('No wallet found for staff:', staffUserId);
    }
    else {
        console.log('Wallet for staff:', staffUserId);
        console.log('Balance:', wallet.balance);
        console.log('Escrow Balance:', wallet.escrow_balance);
        console.log('Savings Balance:', wallet.savings_balance);
        console.log('Pension Balance:', wallet.pension_balance);
        console.log('Total Earned:', wallet.total_earned);
    }
    await (0, mongoose_1.disconnect)();
}
main().catch((err) => {
    console.error('Error:', err);
    (0, mongoose_1.disconnect)();
    process.exit(1);
});
