
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  CHILDREN = 'CHILDREN'
}

export enum GarmentStyle {
  SHIRT = 'SHIRT',
  PANTS = 'PANTS',
  DRESS = 'DRESS',
  JACKET = 'JACKET',
  KIDS_SUIT = 'KIDS_SUIT',
  ABAYA = 'ABAYA',
  SPORTS_SET = 'SPORTS_SET',
  EVENING_GOWN = 'EVENING_GOWN',
  SKIRT = 'SKIRT',
  BLOUSE = 'BLOUSE',
  SUIT = 'SUIT',
  T_SHIRT = 'T_SHIRT',
  TRADITIONAL = 'TRADITIONAL',
  KAFTAN = 'KAFTAN',
  BISHT = 'BISHT',
  TRENCH_COAT = 'TRENCH_COAT',
  WAISTCOAT = 'WAISTCOAT',
  DOUBLE_BREASTED_SUIT = 'DOUBLE_BREASTED_SUIT',
  MERMAID_DRESS = 'MERMAID_DRESS',
  STRUCTURED_BLAZER = 'STRUCTURED_BLAZER',
  PRINCESS_CUT_DRESS = 'PRINCESS_CUT_DRESS',
  CORSET_TOP = 'CORSET_TOP',
  COWL_NECK_DRESS = 'COWL_NECK_DRESS',
  TAILORED_COAT = 'TAILORED_COAT',
  PLEATED_SKIRT = 'PLEATED_SKIRT',
  // New Styles
  JUMPSUIT = 'JUMPSUIT',
  WRAP_DRESS = 'WRAP_DRESS',
  HOODIE = 'HOODIE',
  PALAZZO_PANTS = 'PALAZZO_PANTS',
  KIMONO_JACKET = 'KIMONO_JACKET'
}

export enum SleeveType {
  BASIC = 'BASIC',
  PUFF = 'PUFF',
  BISHOP = 'BISHOP',
  BELL = 'BELL',
  KIMONO = 'KIMONO',
  RAGLAN = 'RAGLAN',
  DOLMAN = 'DOLMAN',
  TWO_PIECE_SUIT = 'TWO_PIECE_SUIT',
  LEG_MUTTON = 'LEG_MUTTON',
  PETAL = 'PETAL',
  LANTERN = 'LANTERN'
}

export enum CollarType {
  NONE = 'NONE',
  ROUND = 'ROUND',
  V_NECK = 'V_NECK',
  POLO = 'POLO',
  STAND = 'STAND',
  SHAWL = 'SHAWL',
  NOTCHED = 'NOTCHED',
  MANDARIN = 'MANDARIN',
  PEAKED_LAPEL = 'PEAKED_LAPEL',
  SAILOR = 'SAILOR',
  PETER_PAN = 'PETER_PAN',
  TURTLE_NECK = 'TURTLE_NECK',
  SCOOP = 'SCOOP',
  HOOD = 'HOOD' // Added Hood for Hoodie
}

export interface Measurements {
  height: number;
  chest: number;
  waist: number;
  hips: number;
  shoulderWidth: number;
  armLength: number;
  neckCircumference: number;
  backWidth?: number;
  shoulderLength?: number;
  backLength?: number;
  armCircumference?: number;
  cuffCircumference?: number;
  waistToHip?: number;
  waistToKnee?: number;
  waistToFloor?: number;
  skirtLength?: number;
  bodiceLength?: number;
  armholeCircumference?: number;
  waistToArmhole?: number;
  shoulderToBust?: number;
  bustPointToPoint?: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface BrandingSettings {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// STRICT ORDER AS REQUESTED:
// 1. Gender -> 2. Size -> 3. Style -> 4. Fabric -> 5. Pattern -> 6. Export -> 7. Payment
export enum AppStep {
  GENDER_SELECTION, // 1
  SIZE_INPUT,       // 2
  STYLE_SELECTION,  // 3
  FABRIC_SELECTION, // 4
  PATTERN_EDITOR,   // 5
  EXPORT,           // 6
  PAYMENT,          // 7
  SUCCESS,
  DEV_DASHBOARD,
  LOGIN 
}

export type Occasion = 'ALL' | 'FORMAL' | 'DAILY' | 'SPORTS' | 'EVENING' | 'CEREMONY';
export type Season = 'ALL' | 'WINTER' | 'SUMMER';

export interface StyleItem {
  id: GarmentStyle;
  label: string;
  icon: string;
  description: string;
  occasion: string;
  season: string;
  gender: Gender;
  image?: string; 
}

export interface Fabric {
  id: string;
  name: string;
  description: string;
  color: string;
  thickness: string;
  material: string;
  image: string;
  properties: {
    stretch: string;
    breathability: string;
    durability: string;
  };
  physics: { mass: number; stiffness: number; damping: number; };
}

export interface FabricColor {
  id: string;
  name: string;
  hex: string;
  category: 'BASIC' | 'NEUTRAL' | 'VIBRANT' | 'METALLIC';
}

export interface PatternDesign {
  id: string;
  name: string;
  type: 'PLAIN' | 'STRIPED' | 'FLORAL';
  preview: string;
}

export interface PricingRule {
  styleId: GarmentStyle;
  basePrice: number;
  fabricMultipliers: Record<string, number>;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export interface MeasurementProfile {
  id: string;
  name: string;
  measurements: Measurements;
  createdAt: number;
}

export interface OrderDetails {
  gender: Gender;
  style: GarmentStyle;
  measurements: Measurements;
  fabric: Fabric;
  color: FabricColor;
  pattern: PatternDesign;
  sleeveType: SleeveType;
  collarType: CollarType;
  totalPrice: number;
  clientPhotoUrl?: string; // Added field for attached photo
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: 'CARD' | 'CASH';
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED';
  createdAt: number;
  details: OrderDetails;
  managerId?: string; // The username of the referring manager
}

export interface SectionConfig {
  fabrics: boolean;
  models: boolean;
  colors: boolean;
  prices: boolean;
  orders: boolean;
  instructions: string;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ASSISTANT = 'assistant',
  VIEWER = 'viewer' 
}

export interface User {
  id: string; 
  username: string;
  password?: string; 
  role: UserRole;
  referralCode?: string; // NEW: The 6-char code
}
