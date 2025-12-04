/**
 * RazorpayX Payouts Integration
 * 
 * This module provides helpers for processing creator payouts via RazorpayX.
 * 
 * Note: RazorpayX requires a separate activation from regular Razorpay.
 * You'll need to activate RazorpayX from your Razorpay dashboard and
 * set the following environment variables:
 * - RAZORPAYX_ACCOUNT_NUMBER: Your RazorpayX account number
 * 
 * The existing RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET can be reused
 * for RazorpayX authentication.
 */

import Razorpay from 'razorpay';

// RazorpayX Payout modes
type PayoutMode = 'NEFT' | 'RTGS' | 'IMPS' | 'UPI';

interface PayoutContact {
  name: string;
  email: string;
  contact?: string;
  type: 'vendor' | 'customer' | 'employee' | 'self';
}

interface BankAccountDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

interface UpiDetails {
  upiId: string;
}

interface CreatePayoutParams {
  amount: number; // Amount in INR (will be converted to paise)
  purpose: string;
  contact: PayoutContact;
  fundAccount: {
    type: 'bank_account' | 'vpa';
    bankAccount?: BankAccountDetails;
    vpa?: UpiDetails;
  };
  referenceId?: string;
  narration?: string;
  mode?: PayoutMode;
}

interface PayoutResult {
  success: boolean;
  payoutId?: string;
  status?: string;
  error?: string;
  rawResponse?: any;
}

// Initialize Razorpay instance (works for both Razorpay and RazorpayX)
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }
  
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * Create a contact in RazorpayX
 * Contacts are required before creating fund accounts
 */
export async function createContact(contact: PayoutContact): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const razorpay = getRazorpayInstance();
    
    const result = await (razorpay as any).contacts.create({
      name: contact.name,
      email: contact.email,
      contact: contact.contact,
      type: contact.type,
    });
    
    return {
      success: true,
      contactId: result.id,
    };
  } catch (error: any) {
    console.error('Error creating RazorpayX contact:', error);
    return {
      success: false,
      error: error.message || 'Failed to create contact',
    };
  }
}

/**
 * Create a fund account in RazorpayX
 * Fund accounts store the bank/UPI details for payouts
 */
export async function createFundAccount(
  contactId: string,
  accountType: 'bank_account' | 'vpa',
  details: BankAccountDetails | UpiDetails
): Promise<{ success: boolean; fundAccountId?: string; error?: string }> {
  try {
    const razorpay = getRazorpayInstance();
    
    const payload: any = {
      contact_id: contactId,
      account_type: accountType,
    };
    
    if (accountType === 'bank_account') {
      const bankDetails = details as BankAccountDetails;
      payload.bank_account = {
        name: bankDetails.accountHolderName,
        account_number: bankDetails.accountNumber,
        ifsc: bankDetails.ifscCode,
      };
    } else {
      const upiDetails = details as UpiDetails;
      payload.vpa = {
        address: upiDetails.upiId,
      };
    }
    
    const result = await (razorpay as any).fundAccount.create(payload);
    
    return {
      success: true,
      fundAccountId: result.id,
    };
  } catch (error: any) {
    console.error('Error creating RazorpayX fund account:', error);
    return {
      success: false,
      error: error.message || 'Failed to create fund account',
    };
  }
}

/**
 * Create a payout in RazorpayX
 * This initiates the actual money transfer to the creator
 */
export async function createPayout(params: CreatePayoutParams): Promise<PayoutResult> {
  try {
    const razorpay = getRazorpayInstance();
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    
    if (!accountNumber) {
      return {
        success: false,
        error: 'RazorpayX account number not configured',
      };
    }
    
    // First, create contact
    const contactResult = await createContact(params.contact);
    if (!contactResult.success || !contactResult.contactId) {
      return {
        success: false,
        error: `Failed to create contact: ${contactResult.error}`,
      };
    }
    
    // Create fund account
    let fundAccountResult;
    if (params.fundAccount.type === 'vpa' && params.fundAccount.vpa) {
      fundAccountResult = await createFundAccount(
        contactResult.contactId,
        'vpa',
        params.fundAccount.vpa
      );
    } else if (params.fundAccount.type === 'bank_account' && params.fundAccount.bankAccount) {
      fundAccountResult = await createFundAccount(
        contactResult.contactId,
        'bank_account',
        params.fundAccount.bankAccount
      );
    } else {
      return {
        success: false,
        error: 'Invalid fund account configuration',
      };
    }
    
    if (!fundAccountResult.success || !fundAccountResult.fundAccountId) {
      return {
        success: false,
        error: `Failed to create fund account: ${fundAccountResult.error}`,
      };
    }
    
    // Create the payout
    const payoutPayload = {
      account_number: accountNumber,
      fund_account_id: fundAccountResult.fundAccountId,
      amount: Math.round(params.amount * 100), // Convert to paise
      currency: 'INR',
      mode: params.mode || (params.fundAccount.type === 'vpa' ? 'UPI' : 'IMPS'),
      purpose: params.purpose,
      queue_if_low_balance: true,
      reference_id: params.referenceId,
      narration: params.narration || 'Template earnings payout',
    };
    
    const result = await (razorpay as any).payouts.create(payoutPayload);
    
    console.log(`✅ Payout created successfully: ${result.id}`);
    
    return {
      success: true,
      payoutId: result.id,
      status: result.status,
      rawResponse: result,
    };
  } catch (error: any) {
    console.error('Error creating RazorpayX payout:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payout',
      rawResponse: error.error || error,
    };
  }
}

/**
 * Get payout status from RazorpayX
 */
export async function getPayoutStatus(payoutId: string): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const razorpay = getRazorpayInstance();
    
    const result = await (razorpay as any).payouts.fetch(payoutId);
    
    return {
      success: true,
      status: result.status,
    };
  } catch (error: any) {
    console.error('Error fetching payout status:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch payout status',
    };
  }
}

/**
 * Process a creator earning payout
 * This is the main function to be called from the admin payout processing route
 */
export async function processCreatorPayout(
  earning: {
    _id: string;
    creatorUserId: string;
    amount: number;
    orderId: string;
  },
  creator: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    upiId?: string;
    bankDetails?: {
      accountHolderName?: string;
      accountNumber?: string;
      ifscCode?: string;
      bankName?: string;
    };
  }
): Promise<PayoutResult> {
  // Validate amount
  if (earning.amount <= 0) {
    return {
      success: false,
      error: 'Invalid payout amount',
    };
  }
  
  // Determine payout method
  const hasUpi = !!creator.upiId;
  const hasBank = !!(
    creator.bankDetails?.accountNumber && 
    creator.bankDetails?.ifscCode && 
    creator.bankDetails?.accountHolderName
  );
  
  if (!hasUpi && !hasBank) {
    return {
      success: false,
      error: 'Creator has no valid payout method configured',
    };
  }
  
  // Prefer UPI for faster payouts
  const payoutParams: CreatePayoutParams = {
    amount: earning.amount,
    purpose: 'payout',
    contact: {
      name: creator.name,
      email: creator.email,
      contact: creator.phone,
      type: 'vendor',
    },
    fundAccount: hasUpi
      ? {
          type: 'vpa',
          vpa: { upiId: creator.upiId! },
        }
      : {
          type: 'bank_account',
          bankAccount: {
            accountNumber: creator.bankDetails!.accountNumber!,
            ifscCode: creator.bankDetails!.ifscCode!,
            accountHolderName: creator.bankDetails!.accountHolderName!,
          },
        },
    referenceId: `earning_${earning._id}`,
    narration: `Payout for order ${earning.orderId}`,
  };
  
  return await createPayout(payoutParams);
}

const razorpayPayoutsExports = {
  createContact,
  createFundAccount,
  createPayout,
  getPayoutStatus,
  processCreatorPayout,
};

export default razorpayPayoutsExports;

