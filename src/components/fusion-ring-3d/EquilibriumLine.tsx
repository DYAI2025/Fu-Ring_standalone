import { useMemo } from 'react';
import { Line } from '@react-three/drei';

type EquilibriumLineProps = {
  thirtyDayAvg: number[];
};

export const EquilibriumLine = ({ thirtyDayAvg }: EquilibriumLineProps) => {
  const points = useMemo<[number, number, number][]>(() => {
    const avg = thirtyDayAvg.length
      ? thirtyDayAvg.reduce((sum, value) => sum + value, 0) / thirtyDayAvg.length
      : 0.5;

    const radius = 2.8 + avg * 0.8;
    const segments = 128;

    return Array.from({ length: segments + 1 }, (_, index) => {
      const angle = (index / segments) * Math.PI * 2;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, -0.02];
    });
  }, [thirtyDayAvg]);

  return (
    <Line
      points={points}
      color="#8ba4c8"
      lineWidth={1}
      transparent
      opacity={0.7}
      dashed
      dashScale={1}
      dashSize={0.12}
      gapSize={0.08}
    />
  );
};
