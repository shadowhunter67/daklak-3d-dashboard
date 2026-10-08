import { useMemo } from 'react';
import { Meadow } from '../dioramaCoverLayer';
import { seeded } from '../dioramaGeometry';
import type { CameraPoses, DioramaSceneProps, SkySpec, SunSpec } from '../dioramaConfig';
import {
  DioramaCanvas,
  FallingWater,
  Forest,
  Heightfield,
  Instances,
  Mist,
  WaterSheet,
} from '../dioramaKit';
import { CurvedSuspensionBridge } from '../dioramaProps';
import { forestPlacements } from '../dioramaTerrain';
import {
  BRIDGE_Z,
  GIA_LONG_FIELD,
  LIPS,
  WATER_LEVELS,
  channelHalf,
  clusteredSampler,
  giaLongColor,
  giaLongHeight,
  giaLongRocks,
  lipLayout,
  lipZ,
} from '../giaLongTerrain';

/**
 * Thác Gia Long dựng lại như một cảnh thiên nhiên được art-direct: sông rộng nước đục hạ qua bốn
 * gờ đá bất quy tắc (mép bị chẻ thành nhiều dải nước), bờ nhô bậc, đá có thứ bậc, rừng ba tầng theo
 * cụm, cầu treo dây mảnh võng nhẹ. Camera chéo ~30° so với cầu, thác là tiêu điểm chính, cầu phụ.
 * Địa hình/bố cục nằm ở `giaLongTerrain.ts` (hàm thuần, có test).
 */
const POSES: CameraPoses = {
  overview: { position: [6.2, 3.9, 8.4], target: [-1.2, 1.0, -5] },
  close: { position: [4.2, 2.4, 3.6], target: [-0.8, 0.9, -5] },
  high: { position: [4, 8, 3], target: [0, 0.8, -5] },
};
const SKY: SkySpec = { top: '#6597c4', mid: '#aecbd6', bottom: '#cddcd6', fogNear: 12, fogFar: 46 };
const SUN: SunSpec = { position: [-9, 10, 8], intensity: 1.5, color: '#ffe8c2' };
const COVER_AREA = { x: [-18, 18] as [number, number], z: [-20, 6] as [number, number] };
const FOAM = '#d9cdb4';

export function GiaLongScene(props: DioramaSceneProps) {
  const color = useMemo(() => giaLongColor(), []);
  const layout = useMemo(() => lipLayout(71), []);
  const rocks = useMemo(() => giaLongRocks(73, layout.lumps), [layout]);
  const tall = useMemo(
    () =>
      forestPlacements({
        count: 55,
        seed: 75,
        height: giaLongHeight,
        minY: 0.8,
        trunk: [1.8, 3.0],
        width: [1.3, 2.2],
        blobs: 6,
        sample: clusteredSampler(76, 6, 4.2, [-20, -2]),
      }),
    [],
  );
  const mid = useMemo(
    () =>
      forestPlacements({
        count: 100,
        seed: 77,
        height: giaLongHeight,
        minY: 0.6,
        trunk: [0.5, 1.1],
        width: [0.5, 0.95],
        blobs: 4,
        sample: clusteredSampler(78, 9, 3.2, [-16, 0]),
      }),
    [],
  );
  const shrubs = useMemo(() => {
    const sample = clusteredSampler(79, 10, 2.6, [-14, 4]);
    const random = seeded(80);
    return Array.from({ length: 90 }, () => {
      const spot = sample(random);
      if (!spot) return null;
      const size = 0.3 + random() * 0.35;
      return {
        position: [spot[0], giaLongHeight(spot[0], spot[1]) - 0.05, spot[1]] as [
          number,
          number,
          number,
        ],
        rotationY: random() * 6,
        scale: [size * 1.2, size * 0.8, size * 1.2] as [number, number, number],
        hue: (random() - 0.5) * 0.12,
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
  }, []);
  const bridgeHalf = channelHalf(BRIDGE_Z) + 2.4;
  const bridgeEnd = Math.max(
    giaLongHeight(-bridgeHalf, BRIDGE_Z),
    giaLongHeight(bridgeHalf, BRIDGE_Z),
  );
  const bridgeRocks = useMemo(
    () =>
      [-bridgeHalf, bridgeHalf].map((x) => ({
        position: [x, giaLongHeight(x, BRIDGE_Z) - 0.2, BRIDGE_Z] as [number, number, number],
        rotationY: x,
        scale: [1.1, 0.9, 1.2] as [number, number, number],
        hue: 0,
      })),
    [bridgeHalf],
  );

  // Mặt nước theo tầng: z từ gờ thượng lưu tới gờ hạ lưu; vũng chân thác dài hơn.
  const sheets = WATER_LEVELS.map((level, tier) => {
    const z0 = tier === 0 ? -24 : LIPS[tier - 1];
    const z1 = tier < LIPS.length ? LIPS[tier] : 4.5;
    return { level, tier, z: (z0 + z1) / 2, length: z1 - z0 };
  });

  return (
    <DioramaCanvas poses={POSES} sky={SKY} sun={SUN} minDistance={2.5} maxDistance={16} {...props}>
      <Heightfield spec={GIA_LONG_FIELD} height={giaLongHeight} color={color} />
      <Forest placements={tall} seed={91} tones={['#234d2a', '#2d5f30', '#3f6439']} />
      <Forest placements={mid} seed={92} tones={['#3b7637', '#4a873d', '#5b8d44']} />
      <Instances
        placements={shrubs}
        seed={93}
        color="#487f3b"
        detail={2}
        amount={0.4}
        surface="leaf"
      />
      <Meadow
        height={giaLongHeight}
        area={COVER_AREA}
        minY={0.5}
        exclude={(x, z) => Math.abs(x) < channelHalf(z) + 0.7}
        seed={94}
      />
      {sheets.map(({ level, tier, z, length }) => (
        <WaterSheet
          key={tier}
          position={[0, level, z]}
          size={[10.8, length]}
          color={tier === 4 ? '#5d6b5a' : '#9a8a6c'}
          opacity={tier === 4 ? 0.92 : 0.84}
          normalScale={tier === 4 ? 0.3 : 0.5}
          flow={tier === 4 ? [0.004, 0.012] : [0.01, 0.06]}
        />
      ))}
      {layout.strips.map((strip) => {
        const top = WATER_LEVELS[strip.tier];
        const bottom = WATER_LEVELS[strip.tier + 1] - 0.05;
        const height = top - bottom;
        return (
          <FallingWater
            key={`${strip.tier}-${strip.x.toFixed(2)}`}
            position={[strip.x, top - height / 2, lipZ(strip.tier, strip.x) + 0.1]}
            width={strip.width}
            height={height}
            tint={FOAM}
            seed={Math.round(strip.x * 13 + strip.tier * 5)}
          />
        );
      })}
      {LIPS.map((_, tier) => (
        <Mist
          key={tier}
          center={[0, WATER_LEVELS[tier + 1] + 0.02, LIPS[tier] + 0.6]}
          spread={[8.4, 1.3]}
          count={tier === LIPS.length - 1 ? 110 : 40}
          rise={tier === LIPS.length - 1 ? 1.4 : 0.6}
          size={0.5}
          opacity={0.17}
          seed={tier + 11}
        />
      ))}
      <Instances
        placements={rocks.big}
        seed={3}
        color="#8b877c"
        detail={2}
        amount={0.32}
        cuts={6}
        flat
      />
      <Instances
        placements={[...rocks.medium, ...bridgeRocks]}
        seed={5}
        color="#7d796e"
        detail={2}
        amount={0.3}
        cuts={5}
        flat
      />
      <Instances
        placements={rocks.small}
        seed={7}
        color="#938f84"
        detail={1}
        amount={0.25}
        cuts={4}
        flat
      />
      <CurvedSuspensionBridge
        from={-bridgeHalf}
        to={bridgeHalf}
        z={BRIDGE_Z}
        yEnd={bridgeEnd + 0.15}
      />
    </DioramaCanvas>
  );
}
