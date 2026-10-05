import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useShadows } from './dioramaContext';
import { seeded, type Placement } from './dioramaGeometry';
import { InstancedPlacements } from './dioramaKit';

/**
 * Các khối dựng đơn giản dùng chung cho nhiều diorama (voi, nhà dài Ê Đê, đình, tháp Chăm, cột
 * bazan, tượng, cầu gỗ, thuyền, cọ…). Đây là hình khối cách điệu dựng thủ tục, không phải mô hình
 * đo đạc; mỗi cảnh chỉ ghép chúng lại theo mô tả/ảnh tham chiếu của địa điểm.
 */
type V3 = [number, number, number];

export function Box({
  position,
  size,
  color,
  rotation = [0, 0, 0],
  roughness = 0.9,
}: {
  position: V3;
  size: V3;
  color: string;
  rotation?: V3;
  roughness?: number;
}) {
  const shadows = useShadows();
  return (
    <mesh position={position} rotation={rotation} castShadow={shadows} receiveShadow={shadows}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

export function Cylinder({
  position,
  radius,
  height,
  color,
  radiusTop,
  segments = 10,
  rotation = [0, 0, 0],
}: {
  position: V3;
  radius: number;
  height: number;
  color: string;
  radiusTop?: number;
  segments?: number;
  rotation?: V3;
}) {
  const shadows = useShadows();
  return (
    <mesh position={position} rotation={rotation} castShadow={shadows} receiveShadow={shadows}>
      <cylinderGeometry args={[radiusTop ?? radius, radius, height, segments]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

export function Blob({
  position,
  scale,
  color,
  detail = 1,
}: {
  position: V3;
  scale: V3;
  color: string;
  detail?: number;
}) {
  const shadows = useShadows();
  return (
    <mesh position={position} scale={scale} castShadow={shadows} receiveShadow={shadows}>
      <icosahedronGeometry args={[1, detail]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
  );
}

/** Voi châu Á cách điệu (hướng mặt về +z). `scale = 1` cao khoảng 1,6 đơn vị cảnh. */
export function Elephant({
  position,
  rotationY = 0,
  scale = 1,
  color = '#7a746b',
}: {
  position: V3;
  rotationY?: number;
  scale?: number;
  color?: string;
}) {
  const legs: Array<[number, number]> = [
    [-0.32, -0.5],
    [0.32, -0.5],
    [-0.32, 0.4],
    [0.32, 0.4],
  ];
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Blob position={[0, 1.0, 0]} scale={[0.52, 0.5, 0.85]} color={color} detail={2} />
      {legs.map(([x, z]) => (
        <Cylinder
          key={`${x}${z}`}
          position={[x, 0.4, z]}
          radius={0.15}
          height={0.8}
          color={color}
        />
      ))}
      <Blob position={[0, 1.2, 0.85]} scale={[0.34, 0.38, 0.36]} color={color} detail={2} />
      <Blob position={[-0.36, 1.2, 0.8]} scale={[0.05, 0.3, 0.26]} color={color} />
      <Blob position={[0.36, 1.2, 0.8]} scale={[0.05, 0.3, 0.26]} color={color} />
      <Cylinder
        position={[0, 0.78, 1.18]}
        radius={0.11}
        radiusTop={0.07}
        height={0.7}
        color={color}
        rotation={[0.25, 0, 0]}
      />
      <Cylinder
        position={[0, 0.34, 1.3]}
        radius={0.07}
        radiusTop={0.045}
        height={0.5}
        color={color}
        rotation={[-0.3, 0, 0]}
      />
    </group>
  );
}

/** Nhà dài Ê Đê trên sàn cao: hai hàng cột, thân gỗ, mái hai dốc, cầu thang phía trước (+z). */
export function StiltLonghouse({
  position,
  rotationY = 0,
  length = 3.4,
  width = 1.2,
  floorY = 0.55,
  roofColor = '#8d6a3a',
  wallColor = '#7a5632',
}: {
  position: V3;
  rotationY?: number;
  length?: number;
  width?: number;
  floorY?: number;
  roofColor?: string;
  wallColor?: string;
}) {
  const posts = Math.max(3, Math.round(length / 0.7));
  const wallH = 0.7;
  const roofH = 0.75;
  const slope = Math.atan2(roofH, width / 2);
  const slopeLen = Math.hypot(width / 2, roofH) + 0.25;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {Array.from({ length: posts }).flatMap((_, i) => {
        const x = -length / 2 + (i * length) / (posts - 1);
        return [-width / 2 + 0.1, width / 2 - 0.1].map((z) => (
          <Cylinder
            key={`${i}${z}`}
            position={[x, floorY / 2, z]}
            radius={0.05}
            height={floorY}
            color="#5a4228"
            segments={6}
          />
        ));
      })}
      <Box position={[0, floorY + 0.04, 0]} size={[length, 0.08, width]} color="#6e4f2e" />
      <Box
        position={[0, floorY + 0.08 + wallH / 2, 0]}
        size={[length * 0.96, wallH, width * 0.8]}
        color={wallColor}
      />
      <Box
        position={[0, floorY + 0.08 + wallH + roofH / 2 - 0.02, -width / 4 - 0.02]}
        size={[length + 0.5, 0.08, slopeLen]}
        color={roofColor}
        rotation={[slope, 0, 0]}
      />
      <Box
        position={[0, floorY + 0.08 + wallH + roofH / 2 - 0.02, width / 4 + 0.02]}
        size={[length + 0.5, 0.08, slopeLen]}
        color={roofColor}
        rotation={[-slope, 0, 0]}
      />
      {[0, 1, 2, 3].map((s) => (
        <Box
          key={s}
          position={[length / 2 - 0.45, 0.12 + s * (floorY / 4), width / 2 + 0.55 - s * 0.14]}
          size={[0.5, 0.06, 0.16]}
          color="#6e4f2e"
        />
      ))}
    </group>
  );
}

/** Đình/nhà ngói truyền thống: nền, hàng cột, tường, mái ngói hai tầng, đầu đao ở nóc. */
export function TiledHall({
  position,
  rotationY = 0,
  width = 3.2,
  depth = 2.0,
  roofColor = '#8a3f2a',
}: {
  position: V3;
  rotationY?: number;
  width?: number;
  depth?: number;
  roofColor?: string;
}) {
  const wallH = 0.85;
  const roofH = 0.8;
  const slope = Math.atan2(roofH, depth / 2);
  const slopeLen = Math.hypot(depth / 2, roofH) + 0.3;
  const columns = Math.max(4, Math.round(width / 0.55));
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0.1, 0]} size={[width + 0.5, 0.2, depth + 0.5]} color="#a9805a" />
      <Box
        position={[0, 0.2 + wallH / 2, -depth * 0.12]}
        size={[width, wallH, depth * 0.7]}
        color="#e7dcc3"
      />
      {Array.from({ length: columns }).map((_, i) => (
        <Cylinder
          key={i}
          position={[
            -width / 2 + 0.12 + (i * (width - 0.24)) / (columns - 1),
            0.2 + wallH / 2,
            depth / 2 - 0.1,
          ]}
          radius={0.055}
          height={wallH}
          color="#8f3a22"
          segments={8}
        />
      ))}
      {[0, 1].map((tier) => (
        <group
          key={tier}
          position={[0, 0.2 + wallH + tier * 0.55, 0]}
          scale={[1 - tier * 0.18, 1, 1 - tier * 0.12]}
        >
          <Box
            position={[0, roofH / 2 - 0.05, -depth / 4]}
            size={[width + 0.6, 0.09, slopeLen]}
            color={roofColor}
            rotation={[slope, 0, 0]}
          />
          <Box
            position={[0, roofH / 2 - 0.05, depth / 4]}
            size={[width + 0.6, 0.09, slopeLen]}
            color={roofColor}
            rotation={[-slope, 0, 0]}
          />
          <Box position={[0, roofH, 0]} size={[width + 0.55, 0.12, 0.16]} color="#6d2f1f" />
          {[-1, 1].map((side) => (
            <Box
              key={side}
              position={[side * (width / 2 + 0.3), roofH + 0.1, 0]}
              size={[0.14, 0.26, 0.14]}
              color="#6d2f1f"
              rotation={[0, 0, side * 0.5]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

/** Tháp Chăm gạch nhiều tầng thu nhỏ dần, có cột ốp góc, cửa giả; `ruin` > 0 làm cũ/đổ phần đỉnh. */
export function ChamTower({
  position,
  rotationY = 0,
  tiers = 4,
  baseWidth = 1.6,
  height = 4.6,
  brick = '#b5612f',
  ruin = 0,
}: {
  position: V3;
  rotationY?: number;
  tiers?: number;
  baseWidth?: number;
  height?: number;
  brick?: string;
  ruin?: number;
}) {
  const parts: Array<{ y: number; w: number; h: number }> = [];
  const baseH = height * 0.34;
  let y = 0;
  for (let i = 0; i < tiers; i++) {
    const w = baseWidth * (1 - i * 0.2);
    const h = i === 0 ? baseH : ((height - baseH) / (tiers - 1)) * (1 - ruin * 0.35 * (i / tiers));
    parts.push({ y, w, h });
    y += h;
  }
  return (
    <group position={position} rotation={[0, rotationY, ruin * 0.04]}>
      <Box
        position={[0, 0.12, 0]}
        size={[baseWidth * 1.35, 0.24, baseWidth * 1.35]}
        color="#8c4a26"
      />
      {parts.map((p, i) => (
        <group key={i} position={[0, 0.24 + p.y, 0]}>
          <Box position={[0, p.h / 2, 0]} size={[p.w, p.h, p.w]} color={brick} />
          <Box position={[0, p.h, 0]} size={[p.w * 1.1, 0.08, p.w * 1.1]} color="#8c4a26" />
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <Box
                key={`${sx}${sz}`}
                position={[sx * p.w * 0.46, p.h / 2, sz * p.w * 0.46]}
                size={[p.w * 0.1, p.h * 0.96, p.w * 0.1]}
                color="#9c5428"
              />
            )),
          )}
          <Box
            position={[0, p.h * 0.45, p.w / 2 + 0.01]}
            size={[p.w * 0.34, p.h * 0.6, 0.04]}
            color="#4b2a18"
          />
        </group>
      ))}
      {ruin < 0.5 && (
        <mesh position={[0, 0.24 + y + 0.18, 0]} castShadow>
          <coneGeometry args={[parts[parts.length - 1].w * 0.22, 0.36, 8]} />
          <meshStandardMaterial color="#9c5428" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

/** Cột đá bazan lục giác (Gành Đá Đĩa): các lăng trụ đen xếp khít, cao thấp khác nhau. */
export function BasaltColumns({
  center,
  radius,
  rows,
  cols,
  seed = 9,
  topY = 0.4,
  heightAt,
  accept,
}: {
  center: [number, number];
  radius: number;
  rows: number;
  cols: number;
  seed?: number;
  topY?: number;
  /** Độ cao địa hình: đỉnh cột luôn nhô lên khỏi đất tại đó. */
  heightAt?: (x: number, z: number) => number;
  /** Chỉ đặt cột ở những vị trí thoả điều kiện (ví dụ gần đường bờ). */
  accept?: (x: number, z: number) => boolean;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(radius, radius, 1, 6);
    g.translate(0, 0.5, 0);
    return g;
  }, [radius]);
  const placements = useMemo(() => {
    const random = seeded(seed);
    const list: Placement[] = [];
    const dx = radius * 1.74;
    const dz = radius * 1.5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = center[0] + (c - cols / 2) * dx + (r % 2) * (dx / 2);
        const z = center[1] + (r - rows / 2) * dz;
        if (accept && !accept(x, z)) continue;
        const h = 0.25 + random() * 0.5 + (1 - r / rows) * 0.2;
        const top = Math.max(topY, heightAt ? heightAt(x, z) + 0.08 : topY);
        list.push({
          position: [x, top - h + 0.02 * random(), z],
          rotationY: random() * 0.2,
          scale: [0.97, h, 0.97],
          hue: (random() - 0.5) * 0.08,
        });
      }
    }
    return list;
  }, [center, radius, rows, cols, seed, topY, heightAt, accept]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <InstancedPlacements
      geometry={geometry}
      placements={placements}
      color="#3a3d42"
      roughness={0.8}
    />
  );
}

/** Tượng Đức Mẹ đứng trên bệ nhiều bậc, vòng hào quang gắn sao xanh. */
export function Statue({ position, scale = 1 }: { position: V3; scale?: number }) {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return [Math.cos(a) * 0.5, 2.55 + Math.sin(a) * 0.5] as [number, number];
  });
  return (
    <group position={position} scale={scale}>
      {[0, 1, 2, 3].map((s) => (
        <Box
          key={s}
          position={[0, 0.1 + s * 0.2, 1.1 - s * 0.28]}
          size={[2.6 - s * 0.3, 0.2, 2.2 - s * 0.5]}
          color="#e8e2d2"
        />
      ))}
      <Box position={[0, 1.05, -0.3]} size={[1.2, 0.5, 0.9]} color="#d9d2bf" />
      <Box position={[0, 0.98, 0.18]} size={[0.9, 0.22, 0.06]} color="#2f63b5" />
      <mesh position={[0, 1.8, -0.3]} castShadow>
        <coneGeometry args={[0.42, 1.35, 10]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.7} />
      </mesh>
      <Blob position={[0, 2.55, -0.3]} scale={[0.16, 0.2, 0.16]} color="#f4f1ea" detail={2} />
      <Cylinder
        position={[0.22, 2.0, -0.12]}
        radius={0.05}
        height={0.55}
        color="#f4f1ea"
        rotation={[0.6, 0, -0.3]}
      />
      <Cylinder
        position={[-0.22, 2.0, -0.12]}
        radius={0.05}
        height={0.55}
        color="#f4f1ea"
        rotation={[0.6, 0, 0.3]}
      />
      <group position={[0, 0, -0.5]}>
        {stars.map(([x, y], i) => (
          <mesh key={i} position={[x * 0.9, y - 0.05, 0]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color="#2f63b5" emissive="#2f63b5" emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Cầu gỗ bắc ngang sông (trục x): mặt ván, lan can, trụ cọc xuống nước. */
export function WoodenBridge({
  y,
  z,
  from,
  to,
  width = 0.9,
  piers = 9,
}: {
  y: number;
  z: number;
  from: number;
  to: number;
  width?: number;
  piers?: number;
}) {
  const length = to - from;
  const cx = (from + to) / 2;
  return (
    <group>
      <Box position={[cx, y, z]} size={[length, 0.1, width]} color="#8a6a45" />
      {[-1, 1].map((side) => (
        <Box
          key={side}
          position={[cx, y + 0.28, z + side * (width / 2 - 0.03)]}
          size={[length, 0.06, 0.06]}
          color="#6e5236"
        />
      ))}
      {Array.from({ length: piers }).flatMap((_, i) => {
        const x = from + (i * length) / (piers - 1);
        return [-1, 1].flatMap((side) => [
          <Cylinder
            key={`p${i}${side}`}
            position={[x, y - 0.4, z + side * (width / 2 - 0.05)]}
            radius={0.07}
            height={1.1}
            color="#5a4228"
            segments={6}
          />,
          <Box
            key={`r${i}${side}`}
            position={[x, y + 0.15, z + side * (width / 2 - 0.03)]}
            size={[0.05, 0.3, 0.05]}
            color="#6e5236"
          />,
        ]);
      })}
    </group>
  );
}

/** Thuyền nhỏ (vịnh, đầm): thân hình thoi dẹt và mui. */
export function Boat({
  position,
  rotationY = 0,
  color = '#c0463a',
}: {
  position: V3;
  rotationY?: number;
  color?: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Blob position={[0, 0.06, 0]} scale={[0.5, 0.09, 0.17]} color={color} detail={1} />
      <Box position={[-0.05, 0.2, 0]} size={[0.2, 0.14, 0.14]} color="#e8dfc8" />
    </group>
  );
}

/** Cọ dừa: thân nghiêng nhẹ, tán lá xoè gồm các lá dẹt. */
export function Palm({
  position,
  height = 1.4,
  lean = 0.12,
  seed = 1,
}: {
  position: V3;
  height?: number;
  lean?: number;
  seed?: number;
}) {
  const fronds = useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: 7 }, (_, i) => ({
      angle: (i / 7) * Math.PI * 2 + random() * 0.4,
      droop: 0.5 + random() * 0.4,
    }));
  }, [seed]);
  return (
    <group position={position} rotation={[0, 0, lean]}>
      <Cylinder
        position={[0, height / 2, 0]}
        radius={0.07}
        radiusTop={0.04}
        height={height}
        color="#7b6444"
        segments={6}
      />
      {fronds.map((f, i) => (
        <group key={i} position={[0, height, 0]} rotation={[0, f.angle, 0]}>
          <Box
            position={[0.34, -0.08, 0]}
            size={[0.7, 0.025, 0.16]}
            color="#3f7a35"
            rotation={[0, 0, -f.droop]}
          />
        </group>
      ))}
    </group>
  );
}

/** Cột ăng-ten viễn thông (đỉnh núi Chóp Chài): thân thép sơn đỏ trắng. */
export function Mast({ position, height = 1.4 }: { position: V3; height?: number }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => (
        <Cylinder
          key={i}
          position={[0, (height / 4) * (i + 0.5), 0]}
          radius={0.05 - i * 0.006}
          height={height / 4}
          color={i % 2 === 0 ? '#c0392b' : '#f1f1f1'}
          segments={6}
        />
      ))}
      <Box position={[0, height * 0.85, 0]} size={[0.32, 0.03, 0.03]} color="#444444" />
    </group>
  );
}
