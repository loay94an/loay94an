
import { Measurements, Gender, SleeveType, GarmentStyle, CollarType } from './types';

export class PathBuilder {
  private d: string[] = [];
  
  moveTo(x: number, y: number): this {
    this.d.push(`M ${x} ${y}`);
    return this;
  }
  
  lineTo(x: number, y: number): this {
    this.d.push(`L ${x} ${y}`);
    return this;
  }
  
  cubicCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): this {
    this.d.push(`C ${x1} ${y1}, ${x2} ${y2}, ${x} ${y}`);
    return this;
  }
  
  closePath(): this {
    this.d.push('Z');
    return this;
  }
  
  build(): string {
    return this.d.join(' ');
  }
}

export interface PatternPoint {
  x: number;
  y: number;
  label?: string;
}

export interface PatternLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  isDimension?: boolean;
}

export interface MasterPattern {
  contours: string; // The main black outline
  dimensions: PatternLine[]; // Blue dimension lines
  points: PatternPoint[]; // Red marker points
  width: number;
  height: number;
}

export class FullPatternService {
  /**
   * توليد بترون الياقات الاحترافي
   */
  static generateCollar(type: CollarType, measurements: Measurements, scale: number = 2.0): string {
    const neckHalf = (measurements.neckCircumference / 2) * scale;
    const builder = new PathBuilder();
    
    if (type === CollarType.STAND || type === CollarType.MANDARIN) {
      const h = (type === CollarType.MANDARIN ? 3.5 : 4.5) * scale;
      builder.moveTo(0, 0)
             .lineTo(neckHalf, 0)
             .cubicCurveTo(neckHalf + 5, 0, neckHalf + 5, -h, neckHalf, -h)
             .lineTo(0, -h)
             .closePath();
    } else if (type === CollarType.PETER_PAN) {
      const h = 6 * scale;
      builder.moveTo(0, 0)
             .cubicCurveTo(neckHalf * 0.5, h, neckHalf * 1.2, h, neckHalf, 0)
             .cubicCurveTo(neckHalf * 0.8, -h, neckHalf * 0.3, -h, 0, 0)
             .closePath();
    } else if (type === CollarType.SHAWL || type === CollarType.PEAKED_LAPEL || type === CollarType.NOTCHED) {
      const lapelWidth = type === CollarType.PEAKED_LAPEL ? 14 * scale : 11 * scale;
      builder.moveTo(0, 0)
             .lineTo(neckHalf, 35)
             .lineTo(neckHalf + lapelWidth, -65)
             .lineTo(15, -95)
             .cubicCurveTo(8, -95, 0, -55, 0, 0)
             .closePath();
    } else if (type === CollarType.SAILOR) {
      const flapBack = 22 * scale;
      const flapWidth = 18 * scale;
      builder.moveTo(0, 0)
             .lineTo(neckHalf, 0)
             .lineTo(neckHalf, flapBack)
             .lineTo(neckHalf - flapWidth, flapBack)
             .lineTo(0, 0)
             .closePath();
    } else if (type === CollarType.HOOD) {
      const hoodH = 35 * scale;
      const hoodW = 25 * scale;
      builder.moveTo(0, 0)
             .cubicCurveTo(neckHalf*0.5, -5, neckHalf, 0, neckHalf, 0)
             .lineTo(neckHalf + hoodW, 0)
             .cubicCurveTo(neckHalf + hoodW + 10, -hoodH/2, neckHalf + hoodW, -hoodH, neckHalf, -hoodH)
             .lineTo(0, -hoodH)
             .closePath();
    } else if (type === CollarType.ROUND || type === CollarType.V_NECK || type === CollarType.SCOOP) {
      const vDepth = type === CollarType.V_NECK ? 22 * scale : type === CollarType.SCOOP ? 18 * scale : 10 * scale;
      builder.moveTo(0, 0)
             .cubicCurveTo(neckHalf * 0.3, vDepth, neckHalf * 0.7, vDepth, neckHalf, 0)
             .lineTo(neckHalf, -4 * scale)
             .cubicCurveTo(neckHalf * 0.7, vDepth - 5 * scale, neckHalf * 0.3, vDepth - 5 * scale, 0, -4 * scale)
             .closePath();
    } else {
      builder.moveTo(0, 0)
             .lineTo(neckHalf, 0)
             .lineTo(neckHalf + 10, -32)
             .lineTo(10, -38)
             .lineTo(0, -18)
             .closePath();
    }
    return builder.build();
  }

  /**
   * توليد بترون الجسم المطور
   */
  static generateBodice(gender: Gender, isFront: boolean, measurements: Measurements, ease: number, scale: number = 2.0, style?: GarmentStyle): string {
    const { 
      chest, waist, hips, shoulderWidth, height, 
      backWidth, backLength, waistToArmhole
    } = measurements;
    
    const chestQ = (chest / 4) + (ease / 4);
    const waistQ = (waist / 4) + (ease / 4);
    const hipsQ = (hips / 4) + (ease / 4);
    
    const neckW = (chest / 12) + 2.5;
    const neckD = isFront ? neckW + 6 : 3;
    
    let armholeD = waistToArmhole ? waistToArmhole * scale : ((chest / 6) + 11) * scale;
    const effectiveBackWidth = (backWidth || (shoulderWidth * 0.9)) / 2;
    
    const shoulderExt = (style === GarmentStyle.STRUCTURED_BLAZER || style === GarmentStyle.DOUBLE_BREASTED_SUIT || style === GarmentStyle.TRENCH_COAT) ? 1.5 : 0;
    
    if (style === GarmentStyle.KIMONO_JACKET || style === GarmentStyle.HOODIE) {
      armholeD *= 1.2;
    }

    let pieceLength = height * 0.45; 
    
    if ([GarmentStyle.ABAYA, GarmentStyle.BISHT, GarmentStyle.KAFTAN, GarmentStyle.TRENCH_COAT, GarmentStyle.TAILORED_COAT, GarmentStyle.JUMPSUIT].includes(style!)) pieceLength = height * 0.96;
    if (style === GarmentStyle.EVENING_GOWN || style === GarmentStyle.MERMAID_DRESS || style === GarmentStyle.PRINCESS_CUT_DRESS || style === GarmentStyle.COWL_NECK_DRESS || style === GarmentStyle.WRAP_DRESS) pieceLength = height * 0.94;
    
    const waistY = (backLength || (measurements.bodiceLength ? measurements.bodiceLength * 0.9 : 44)) * scale;
    if (style === GarmentStyle.WAISTCOAT) pieceLength = waistY / scale + (measurements.waistToHip || 20);
    if (style === GarmentStyle.KIMONO_JACKET || style === GarmentStyle.HOODIE) pieceLength = waistY / scale + 25;

    const builder = new PathBuilder();
    
    builder.moveTo(0, pieceLength * scale).lineTo(0, neckD * scale);
    
    if (style === GarmentStyle.COWL_NECK_DRESS && isFront) {
      builder.lineTo(neckW * 2.5 * scale, -10 * scale)
             .lineTo((shoulderWidth / 2) * scale, 15 * scale);
    } else if (style === GarmentStyle.WRAP_DRESS && isFront) {
      builder.lineTo(neckW * scale, 0)
             .lineTo((shoulderWidth / 2) * scale, 6 * scale);
    } else {
      builder.cubicCurveTo((neckW * 0.45) * scale, neckD * scale, neckW * scale, (neckD * 0.45) * scale, neckW * scale, 0);
      const slope = gender === Gender.MALE ? 5.2 : 4.4;
      builder.lineTo((shoulderWidth / 2 + shoulderExt) * scale, slope * scale);
    }

    if (style === GarmentStyle.KIMONO_JACKET) {
       builder.lineTo((chestQ * 1.2) * scale, armholeD);
    } else {
       builder.cubicCurveTo(effectiveBackWidth * scale, armholeD * 0.4, (chestQ * 0.9) * scale, armholeD * 0.8, chestQ * scale, armholeD);
    }

    const hipsY = (waistY + (measurements.waistToHip || 20) * scale);

    if (style === GarmentStyle.WAISTCOAT && isFront) {
        builder.lineTo(waistQ * 0.95 * scale, waistY);
        builder.lineTo(waistQ * scale, waistY + 15 * scale); 
        builder.lineTo(0, waistY + 8 * scale);
        builder.closePath();
        return builder.build();
    }

    if (style === GarmentStyle.PRINCESS_CUT_DRESS || style === GarmentStyle.MERMAID_DRESS) {
      builder.lineTo(chestQ * scale, waistY);
      if (style === GarmentStyle.MERMAID_DRESS) {
        const kneeY = (measurements.waistToKnee || 62) * scale + waistY;
        builder.lineTo(waistQ * 0.85 * scale, waistY)
               .lineTo(hipsQ * scale, hipsY)
               .lineTo(hipsQ * 0.75 * scale, kneeY) 
               .cubicCurveTo(hipsQ * 3 * scale, kneeY + 40, hipsQ * 6 * scale, pieceLength * scale, hipsQ * 8 * scale, pieceLength * scale); 
      } else {
        builder.lineTo(waistQ * scale, waistY)
               .cubicCurveTo(hipsQ * 1.5 * scale, hipsY, hipsQ * 4 * scale, hipsY + 30, hipsQ * 6 * scale, pieceLength * scale);
      }
    } else if (style === GarmentStyle.BISHT || style === GarmentStyle.KAFTAN || style === GarmentStyle.ABAYA || style === GarmentStyle.KIMONO_JACKET) {
      const sweep = style === GarmentStyle.BISHT ? 8 : 4;
      builder.lineTo(chestQ * (style === GarmentStyle.KIMONO_JACKET ? 1.1 : sweep) * scale, armholeD)
             .lineTo(chestQ * (style === GarmentStyle.KIMONO_JACKET ? 1.1 : sweep - 0.5) * scale, pieceLength * scale);
    } else if (style === GarmentStyle.TAILORED_COAT || style === GarmentStyle.STRUCTURED_BLAZER || style === GarmentStyle.DOUBLE_BREASTED_SUIT) {
      builder.lineTo(waistQ * 1.15 * scale, waistY)
             .lineTo(hipsQ * 1.25 * scale, hipsY)
             .lineTo(hipsQ * 1.35 * scale, pieceLength * scale);
    } else if (style === GarmentStyle.WRAP_DRESS && isFront) {
      builder.lineTo(waistQ * 1.3 * scale, waistY)
             .lineTo(hipsQ * 1.3 * scale, hipsY)
             .lineTo(hipsQ * 1.4 * scale, pieceLength * scale)
             .lineTo(0, pieceLength * scale)
             .lineTo(0, waistY)
             .lineTo(0, neckD * scale);
      builder.closePath();
      return builder.build();
    } else if (style === GarmentStyle.JUMPSUIT) {
      builder.lineTo(waistQ * 1.05 * scale, waistY)
             .lineTo(hipsQ * 1.1 * scale, hipsY)
             .lineTo(hipsQ * 0.9 * scale, pieceLength * scale)
             .lineTo(hipsQ * 0.4 * scale, pieceLength * scale)
             .lineTo(0, hipsY + 15 * scale);
    } else {
      const hemW = (style === GarmentStyle.HOODIE) ? hipsQ * 0.9 : hipsQ;
      builder.lineTo(waistQ * (style === GarmentStyle.HOODIE ? 1.1 : 1.0) * scale, waistY)
             .lineTo(hipsQ * scale, hipsY)
             .lineTo(hemW * scale, pieceLength * scale);
    }

    if (style !== GarmentStyle.JUMPSUIT) {
        builder.lineTo(0, pieceLength * scale);
    }
    
    builder.closePath();
    return builder.build();
  }

  /**
   * توليد بترون التنورة
   */
  static generateSkirt(isFront: boolean, measurements: Measurements, ease: number, scale: number = 2.0, style: GarmentStyle): string {
    const { waist, hips, waistToFloor, skirtLength, waistToHip } = measurements;
    const builder = new PathBuilder();
    
    const waistQ = (waist / 4) + (ease / 4) + (isFront ? 1 : -1); 
    const hipsQ = (hips / 4) + (ease / 4);
    const len = (skirtLength || waistToFloor || 100) * scale;
    const wToH = (waistToHip || 20) * scale;
    
    const waistY = 50; 

    builder.moveTo(0, waistY);
    builder.cubicCurveTo(waistQ * 0.5 * scale, waistY + (isFront ? 5 : 0), waistQ * scale, waistY, waistQ * scale, waistY);
    builder.cubicCurveTo(waistQ * scale + 10, waistY + wToH * 0.5, hipsQ * scale, waistY + wToH, hipsQ * scale, waistY + wToH);
    
    if (style === GarmentStyle.PLEATED_SKIRT) {
        builder.lineTo(hipsQ * 1.5 * scale, waistY + len);
    } else {
        builder.lineTo(hipsQ * scale, waistY + len);
    }
    
    builder.lineTo(0, waistY + len);
    builder.closePath();
    
    return builder.build();
  }

  /**
   * توليد بترون الأكمام
   */
  static generateSleeve(type: SleeveType, measurements: Measurements, scale: number = 2.0): string {
    const { armLength, chest, armCircumference, cuffCircumference } = measurements;
    const builder = new PathBuilder();
    
    let bicepW = (armCircumference || (chest / 4 + 6));
    let crownH = (chest / 10 + 9);
    let wristW = (cuffCircumference || (chest / 6 + 7));
    let len = armLength;

    if (type === SleeveType.PUFF) {
        crownH *= 2.5; bicepW *= 1.6;
    } else if (type === SleeveType.BISHOP) {
        bicepW *= 1.3; wristW = bicepW; len *= 1.05;
    } else if (type === SleeveType.BELL) {
        wristW = bicepW * 1.8;
    } else if (type === SleeveType.LEG_MUTTON) {
        crownH *= 2.2; bicepW *= 2.2; wristW *= 0.7;
    } else if (type === SleeveType.KIMONO) {
        bicepW *= 2.0; wristW = bicepW * 0.9; crownH *= 0.2;
    }

    const s_bW = bicepW * scale;
    const s_cH = crownH * scale;
    const s_len = len * scale;
    const s_wW = wristW * scale;

    const wristOffset = (s_bW - s_wW) / 2;

    builder.moveTo(wristOffset, s_len);

    if (type === SleeveType.BISHOP) {
        builder.cubicCurveTo(wristOffset - 20, s_len * 0.6, -20, s_cH * 1.5, 0, s_cH);
    } else if (type === SleeveType.BELL) {
        builder.cubicCurveTo(wristOffset + 10, s_len * 0.6, 10, s_cH * 1.2, 0, s_cH);
    } else {
        builder.lineTo(0, s_cH);
    }

    const capControlY = type === SleeveType.PUFF ? -s_cH * 0.5 : -10 * scale; 
    builder.cubicCurveTo(s_bW * 0.25, capControlY, s_bW * 0.75, capControlY, s_bW, s_cH);

    const rightWristX = wristOffset + s_wW;
    if (type === SleeveType.BISHOP) {
        builder.cubicCurveTo(s_bW + 20, s_cH * 1.5, rightWristX + 20, s_len * 0.6, rightWristX, s_len);
    } else if (type === SleeveType.BELL) {
        builder.cubicCurveTo(s_bW - 10, s_cH * 1.2, rightWristX - 10, s_len * 0.6, rightWristX, s_len);
    } else {
        builder.lineTo(rightWristX, s_len);
    }

    if (type === SleeveType.BISHOP) {
        builder.cubicCurveTo(rightWristX - (s_wW * 0.3), s_len + 25, wristOffset + (s_wW * 0.3), s_len + 25, wristOffset, s_len);
    } else if (type === SleeveType.BELL) {
         builder.cubicCurveTo(rightWristX - (s_wW * 0.3), s_len + 10, wristOffset + (s_wW * 0.3), s_len + 10, wristOffset, s_len);
    } else {
        builder.lineTo(wristOffset, s_len);
    }

    builder.closePath();
    return builder.build();
  }

  static generatePants(gender: Gender, isFront: boolean, measurements: Measurements, ease: number, scale: number = 2.0, style?: GarmentStyle): string {
    const { waist, hips, height, waistToFloor } = measurements;
    const builder = new PathBuilder();
    
    const waistQ = (waist / 4) + (isFront ? -1.5 : 7.5);
    const hipsQ = (hips / 4) + (ease / 4.5);
    const rise = (hips / 4) + (gender === Gender.MALE ? 14 : 12); 
    const legLen = (waistToFloor || (height * 0.68)) * scale;
    const crotchExt = (hips / 20) * (isFront ? 2.8 : 6.2);

    builder.moveTo(0, 0)
           .lineTo(waistQ * scale, 0)
           .lineTo(hipsQ * scale, rise * scale);
           
    if (style === GarmentStyle.PALAZZO_PANTS) {
        builder.lineTo(hipsQ * 1.8 * scale, legLen)
               .lineTo(0, legLen)
               .lineTo(-crotchExt * 1.5 * scale, rise * scale);
    } else {
        builder.lineTo(hipsQ * 0.9 * scale, legLen)
               .lineTo(0, legLen)
               .lineTo(-crotchExt * scale, rise * scale);
    }

    builder.cubicCurveTo(-crotchExt * 0.55 * scale, rise * 0.9 * scale, 0, rise * 0.35 * scale, 0, 0);

    builder.closePath();
    return builder.build();
  }

  // --- NEW: Master Pattern Block for Visualization (The "19 Measurements" View) ---
  
  static generateMasterBlock(gender: Gender, measurements: Measurements): MasterPattern {
    const scale = 2.5; // Scale for viewing
    const m = measurements;
    
    // Vertical Coordinates (Y) - Assuming 0 is top neck
    const yNeck = 20;
    const yShoulder = yNeck + ((m.height * 0.03) || 5) * scale;
    const yBust = yNeck + (m.shoulderToBust || m.backLength! * 0.4) * scale;
    const yWaist = yNeck + (m.backLength || 40) * scale;
    const yHip = yWaist + (m.waistToHip || 20) * scale;
    const yKnee = yWaist + (m.waistToKnee || 55) * scale;
    const yAnkle = yWaist + (m.waistToFloor || 100) * scale;

    // Horizontal Widths (X) - Center is 0
    const wNeck = (m.neckCircumference / 6.2) * scale;
    const wShoulder = (m.shoulderWidth / 2) * scale;
    const wChest = (m.chest / 4) * scale;
    const wWaist = (m.waist / 4) * scale;
    const wHip = (m.hips / 4) * scale;
    const wHem = wHip * 0.8; // Tapered leg for visualization
    const wKnee = wHip * 0.7;

    // 1. Generate Contours (Black Outline)
    const contour = new PathBuilder();
    
    // Start Center Neck
    contour.moveTo(0, yNeck);
    // Neck curve to shoulder point
    contour.cubicCurveTo(wNeck * 0.5, yNeck, wNeck, yNeck * 0.8, wNeck, yNeck - (5*scale)); 
    // Shoulder slope
    contour.lineTo(wShoulder, yShoulder);
    // Armhole curve to underarm (Bust level)
    contour.cubicCurveTo(wShoulder, yBust - (5*scale), wChest * 0.9, yBust - (2*scale), wChest, yBust);
    // Side seam to Waist
    contour.lineTo(wWaist, yWaist);
    // Hip curve
    contour.cubicCurveTo(wWaist + (5*scale), yWaist + ((yHip-yWaist)*0.3), wHip, yHip - ((yHip-yWaist)*0.3), wHip, yHip);
    // Leg to Knee
    contour.lineTo(wKnee, yKnee);
    // Leg to Ankle
    contour.lineTo(wHem, yAnkle);
    // Hem
    contour.lineTo(0, yAnkle);
    // Center line (Closing loop back to neck)
    contour.lineTo(0, yNeck);
    
    const contourPath = contour.build();

    // 2. Generate Dimension Lines (Blue)
    const dimensions: PatternLine[] = [
      { x1: 0, y1: yShoulder, x2: wShoulder, y2: yShoulder, label: "Shoulder" },
      { x1: 0, y1: yBust, x2: wChest, y2: yBust, label: "Chest" },
      { x1: 0, y1: yWaist, x2: wWaist, y2: yWaist, label: "Waist" },
      { x1: 0, y1: yHip, x2: wHip, y2: yHip, label: "Hips" },
      { x1: 0, y1: yKnee, x2: wKnee, y2: yKnee, label: "Knee" },
      // Vertical measurements shown slightly offset
      { x1: -10, y1: yNeck, x2: -10, y2: yWaist, label: "Back Len", isDimension: true },
      { x1: -10, y1: yWaist, x2: -10, y2: yAnkle, label: "Leg Len", isDimension: true },
      // Arm Length (Visualized extending from shoulder)
      { x1: wShoulder, y1: yShoulder, x2: wShoulder + (m.armLength * scale * 0.7), y2: yShoulder + (m.armLength * scale * 0.7), label: "Arm", isDimension: true }
    ];

    // 3. Landmark Points (Red)
    const points: PatternPoint[] = [
      { x: wShoulder, y: yShoulder, label: "Shoulder Point" },
      { x: wChest, y: yBust, label: "Underarm" },
      { x: wWaist, y: yWaist, label: "Waist Side" },
      { x: wHip, y: yHip, label: "Hip Side" },
      { x: 0, y: yNeck, label: "Nape" },
      // Bust Points (if applicable)
      { x: (m.bustPointToPoint ? m.bustPointToPoint/2 : wChest/2) * scale, y: yBust, label: "Bust Point" }
    ];

    return {
      contours: contourPath,
      dimensions,
      points,
      width: wHip * 3, // Bounds for viewBox
      height: yAnkle + 50
    };
  }
}
