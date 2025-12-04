import connectDB from './mongodb';
import Pricing from '@/models/Pricing';

export interface PricingData {
  basePrices: {
    A4: number;
    A3: number;
  };
  multipliers: {
    color: number;
    doubleSided: number;
  };
  deliveryCharges: {
    pickup: number;
    delivery: {
      '0-5': number;
      '5-10': number;
      '10-15': number;
      '15-20': number;
      '20+': number;
    };
  };
  additionalServices: {
    binding: number;
    resumeTemplate: number;
    minServiceFee: number;
    minServiceFeePageLimit: number;
  };
  // Website commission on paid templates (percentage, e.g. 20 = 20%)
  templateCommissionPercent?: number;
}

// Get pricing from database or return defaults
export async function getPricing(): Promise<PricingData> {
  try {
    await connectDB();
    
    let pricing = await Pricing.findOne();
    
    if (!pricing) {
      // Create default pricing if none exists
      pricing = await Pricing.create({
        basePrices: { A4: 5, A3: 10 },
        multipliers: { color: 2, doubleSided: 1.5 },
        deliveryCharges: {
          pickup: 0,
          delivery: {
            '0-5': 10,
            '5-10': 20,
            '10-15': 30,
            '15-20': 40,
            '20+': 50,
          },
        },
        additionalServices: {
          binding: 20,
          resumeTemplate: 0,
          minServiceFee: 5,
          minServiceFeePageLimit: 1,
        },
        updatedBy: 'system',
      });
    }
    
    return {
      basePrices: pricing.basePrices,
      multipliers: pricing.multipliers,
      deliveryCharges: pricing.deliveryCharges,
      additionalServices: pricing.additionalServices,
      templateCommissionPercent: pricing.templateCommissionPercent,
    };
  } catch (error) {
    console.error('Error fetching pricing:', error);
    // Return default pricing if database fails
    return {
      basePrices: { A4: 5, A3: 10 },
      multipliers: { color: 2, doubleSided: 1.5 },
      deliveryCharges: {
        pickup: 0,
        delivery: {
          '0-5': 10,
          '5-10': 20,
          '10-15': 30,
          '15-20': 40,
          '20+': 50,
        },
      },
      additionalServices: {
        binding: 20,
        resumeTemplate: 0,
        minServiceFee: 5,
        minServiceFeePageLimit: 1,
      },
      templateCommissionPercent: 20,
    };
  }
}

// Calculate printing cost based on options and pricing
export function calculatePrintingCost(
  pricing: PricingData,
  pageSize: 'A4' | 'A3',
  color: 'color' | 'bw',
  sided: 'single' | 'double',
  copies: number,
  pageCount: number,
  includeBinding: boolean = false
): number {
  const basePrice = pricing.basePrices[pageSize];
  const colorMultiplier = color === 'color' ? pricing.multipliers.color : 1;
  const sidedMultiplier = sided === 'double' ? pricing.multipliers.doubleSided : 1;
  
  let total = basePrice * pageCount * colorMultiplier * sidedMultiplier * copies;
  
  // Add binding cost if requested
  if (includeBinding) {
    total += pricing.additionalServices.binding;
  }
  
  return total;
}

// Calculate delivery charge based on distance
export function calculateDeliveryCharge(
  pricing: PricingData,
  distance: number
): number {
  if (distance <= 5) return pricing.deliveryCharges.delivery['0-5'];
  if (distance <= 10) return pricing.deliveryCharges.delivery['5-10'];
  if (distance <= 15) return pricing.deliveryCharges.delivery['10-15'];
  if (distance <= 20) return pricing.deliveryCharges.delivery['15-20'];
  return pricing.deliveryCharges.delivery['20+'];
}
