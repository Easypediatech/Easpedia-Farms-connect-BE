# Dojah Integration for USSD Service - Implementation Summary

## Overview

This implementation adds Dojah phone number verification to the FarmConnect USSD service, similar to how it's implemented in SosoCare. This allows for automatic verification of user details during registration, reducing the number of manual steps required.

## Features Implemented

### 1. Dojah Service (`src/modules/dojah/dojah.service.ts`)

- **Phone Number Verification**: Verifies phone numbers with Dojah API and retrieves user details
- **Auto-registration Support**: Prepares user data for automatic registration
- **Error Handling**: Graceful handling of verification failures
- **Phone Number Normalization**: Converts various phone number formats to the format expected by Dojah

### 2. Updated USSD Service (`src/modules/ussd/ussd.service.ts`)

- **Enhanced Main Menu**: New options for auto-verified registration vs manual registration
- **Dojah Farmer Registration Flow**: Streamlined farmer registration using verified details
- **Dojah Buyer Registration Flow**: Streamlined buyer registration using verified details
- **Manual Registration Fallback**: Option to register manually if Dojah verification fails
- **Immediate Verification**: Performs Dojah verification immediately when user selects auto-verify option

### 3. Configuration

- **Environment Variables**: Added Dojah API configuration requirements
- **Module Integration**: Integrated Dojah module into the main application

## New USSD Flow

### Main Menu (New Users)

```
Welcome to FarmConnect

1. Register as Farmer (Auto-verify)
2. Register as Buyer (Auto-verify)
3. Register Manually
4. Help
```

### Auto-Verified Farmer Registration Flow

1. **Verification**: User selects option 1 → Immediate Dojah verification
2. **Confirmation**: Display verified details (name, location) → User confirms or edits
3. **Farm Size**: User enters farm size in hectares
4. **PIN Setup**: User creates and confirms 4-digit PIN
5. **Registration**: Complete registration with verified details

### Auto-Verified Buyer Registration Flow

1. **Verification**: User selects option 2 → Immediate Dojah verification
2. **Confirmation**: Display verified details (name, location) → User confirms or edits
3. **Business Details**: User enters business name and selects buyer type
4. **PIN Setup**: User creates and confirms 4-digit PIN
5. **Registration**: Complete registration with verified details

### Manual Registration Flow

1. **Sub-menu**: User selects option 3 → Manual registration menu
2. **Type Selection**: Choose farmer or buyer registration
3. **Standard Flow**: Follows existing manual registration process

## Technical Benefits

### 1. Reduced User Input

- **Before**: Users had to manually enter first name, last name, and location details
- **After**: Dojah automatically provides verified name and location data
- **Time Saved**: ~3-4 USSD steps reduced per registration

### 2. Data Quality

- **Verification**: Names and locations are verified against NIMC/telecom databases
- **Accuracy**: Reduces typos and incorrect information
- **Trust**: Higher confidence in user identity

### 3. User Experience

- **Speed**: Faster registration process
- **Simplicity**: Fewer manual inputs required
- **Fallback**: Manual registration still available if verification fails

## Configuration Requirements

Add these environment variables to your `.env` file:

```bash
# Dojah API Configuration
DOJAH_API_URL=https://api.dojah.io
DOJAH_PRIVATE_KEY=your_dojah_private_key_here
DOJAH_APP_ID=your_dojah_app_id_here
```

## Error Handling

### Verification Failures

- **No Data Found**: Offers manual registration option
- **API Errors**: Provides retry option and manual fallback
- **Network Issues**: Graceful degradation to manual registration

### Registration Errors

- **Duplicate Phone**: Clear error message with login instruction
- **Invalid Data**: Validation errors with correction prompts
- **System Errors**: Generic error handling with retry options

## Security Considerations

### 1. Data Protection

- **No Storage**: Dojah data is only temporarily stored in USSD session
- **Encryption**: All API communication uses HTTPS
- **Privacy**: User consent implied through opt-in to auto-verification

### 2. Fallback Security

- **Manual Option**: Always available if user prefers not to use auto-verification
- **PIN Protection**: 4-digit PIN still required for account security
- **Validation**: All inputs still validated before registration

## Implementation Notes

### 1. Phone Number Format

- **Input**: Accepts various formats (0801234567, 2348012345678, 8012345678)
- **Normalization**: Converts to format required by Dojah API
- **Validation**: Ensures proper format before API calls

### 2. Session Management

- **Temporary Data**: Verification results stored in USSD session only
- **State Tracking**: Proper stage management for complex flows
- **Cleanup**: Session data cleared on completion or errors

### 3. Integration Points

- **Farmer Service**: Registration with verified details
- **Buyer Service**: Registration with verified details
- **Session Management**: Enhanced with verification states

## Testing

### Unit Tests

- **Dojah Service**: Phone verification logic
- **USSD Flows**: Registration flow testing
- **Error Scenarios**: Verification failure handling

### Integration Tests

- **End-to-End**: Complete USSD registration flows
- **API Integration**: Dojah API communication
- **Fallback Testing**: Manual registration flows

## Future Enhancements

### 1. Additional Verification

- **BVN Verification**: Could add Bank Verification Number checks
- **NIN Verification**: National Identification Number verification
- **Business Registration**: CAC verification for buyers

### 2. Enhanced Data

- **Credit Scoring**: Integration with credit bureaus
- **Farm Verification**: Satellite imagery for farm validation
- **Business Verification**: CAC and tax registration checks

### 3. User Experience

- **Multi-language**: Support for local languages
- **Voice USSD**: Audio prompts for illiterate users
- **SMS Integration**: Verification codes via SMS

## Conclusion

This implementation successfully integrates Dojah verification into the FarmConnect USSD service, providing:

- **Faster Registration**: Reduced steps and time
- **Better Data Quality**: Verified user information
- **Improved UX**: Streamlined process with fallback options
- **Security**: Maintained PIN protection and validation

The implementation follows the SosoCare pattern while being adapted for the agricultural context and FarmConnect's specific requirements.
