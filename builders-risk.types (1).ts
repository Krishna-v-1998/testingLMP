/**
 * builders-risk.types.ts
 * Type definitions for the Builder's Risk product page.
 */

export interface BuildersRiskExposureData {
  hardCosts?:                   string;
  softCosts?:                   string;
  testingPeriod?:               string;
  delayInCompletion?:           string;
  existingBuilding?:            'Yes' | 'No';
  existingBuildingLimit?:       string;
  existingBuildingConstClass?:  string;
  earnings?:                    string;
  rentalValue?:                 string;
}

export interface BuildersRiskLimitsData {
  amtOneConstructionSiteLimit?: string;
  amtOneOccurrenceLimit?:       string;
  temporaryLocationsLimit?:     string;
  transitUnit?:                 string;
  amtDeductibleAllOtherPerils?: string;
  coinsurance?:                 string;
}

export interface BuildersRiskPremiumSummary {
  triaPct?:               string;
  commission?:            string;
  totalPremium?:          string;
  triaPremium?:           string;
  totalPremiumWithTria?:  string;
}

export interface BuildersRiskData {
  exposure?: BuildersRiskExposureData;
  limits?:   BuildersRiskLimitsData;
  premium?:  BuildersRiskPremiumSummary;
}
