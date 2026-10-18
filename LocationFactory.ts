import { LocationData } from '../../types/location.types';

/**
 * LocationFactory
 *
 * Pre-built LocationData objects for use in tests.
 *
 * PATTERN: Use these in tests to avoid repeating data.
 *   const data = LocationFactory.usaBasic();
 *   const locationNo = await locationManagementPage.addLocation(data);
 *
 * CUSTOMISE: Spread and override any field:
 *   const custom = { ...LocationFactory.usaBasic(), city: 'Houston', zipPostalCode: '77001' };
 *   const locationNo = await locationManagementPage.addLocation(custom);
 */
export class LocationFactory {

  /**
   * Minimal valid US location — only required fields.
   * Use for smoke tests where value calculation is NOT being tested.
   */
  static usaMinimal(): LocationData {
    return {
      country:       'USA',
      address:       '100 Main Street',
      city:          'New York',
      stateProvince: 'NY - New York',
      zipPostalCode: '10001',
      sprinklered:   'Yes',
    };
  }

  /**
   * Complete US location with all key fields.
   * Used in the video demonstration (New York address, 5 stories, 1800 sq ft).
   * Includes values to test auto-calculation.
   *
   * Expected auto-calculations:
   *   Property Damage Total = BV(90) + CV(90) + SV(90) + MV(90) + EDP(90) + Other(90) = 540
   *   BI/EE Total           = BI(90) + EE(0) = 90
   *   Location Total        = PD(540) + BI(90) = 630
   */
  static usaFull(): LocationData {
    return {
      country:                 'USA',
      address:                 '5 Independence Way',
      address2:                'Suite 205',
      city:                    'New York',
      stateProvince:           'NY - New York',
      zipPostalCode:           '10001',
      sprinklered:             'Yes',
      buildingNo:              '1',
      occupancyCode:           'ADCl-0112 Oil & Natural Gas Exploration - Onshore',
      constructionDescription: 'Setting the Construction Description',
      totalityOccupancy:       'Site-Free Shell Barn',
      constructionIsoCode:     'ISO 5 - Modified or Semi-Fire Resistive',
      yearBuilt:               '1999',
      numberOfStories:         '5',
      areaSqFt:                '1800',
      buildingValue:           '90',
      contentsValue:           '90',
      stocksValue:             '90',
      machineryValue:          '90',
      edp:                     '90',
      otherDescription:        'Testing',
      otherDollar:             '90',
      businessInterruption:    '90',
    };
  }

  /**
   * Canadian location — uses Canadian province and postal code format.
   */
  static canada(): LocationData {
    return {
      country:       'Canada',
      address:       '200 Bay Street',
      city:          'Toronto',
      stateProvince: 'ON - Ontario',
      zipPostalCode: 'M5J 2J1',
      sprinklered:   'No',
    };
  }

  /**
   * US location with high property values.
   * Use for testing large value calculations.
   *
   * Expected auto-calculations:
   *   Property Damage Total = 1,000,000 + 500,000 + 250,000 = 1,750,000
   *   BI/EE Total           = 200,000 + 50,000 = 250,000
   *   Location Total        = 1,750,000 + 250,000 = 2,000,000
   */
  static usaHighValue(): LocationData {
    return {
      country:              'USA',
      address:              '300 Corporate Drive',
      city:                 'Houston',
      stateProvince:        'TX - Texas',
      zipPostalCode:        '77001',
      sprinklered:          'Yes',
      numberOfStories:      '10',
      areaSqFt:             '50000',
      buildingValue:        '1000000',
      contentsValue:        '500000',
      stocksValue:          '250000',
      businessInterruption: '200000',
      extraExpense:         '50000',
    };
  }

  /**
   * Location with NO value fields — only address + physical attributes.
   * Use to test that auto-calculated fields show $0 or empty when no values entered.
   */
  static usaNoValues(): LocationData {
    return {
      country:       'USA',
      address:       '400 Market Street',
      city:          'San Francisco',
      stateProvince: 'CA - California',
      zipPostalCode: '94102',
      sprinklered:   'No',
      numberOfStories: '3',
      areaSqFt:      '5000',
      yearBuilt:     '2010',
    };
  }
}
