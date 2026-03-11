import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PixiFuRing from '../components/PixiFuRing';

// Mock PixiJS to avoid WebGL context issues in JSDOM
vi.mock('pixi.js', () => {
  return {
    Application: vi.fn().mockImplementation(function() {
      return {
        init: vi.fn().mockResolvedValue(undefined),
        canvas: document.createElement('canvas'),
        stage: {
          addChild: vi.fn(),
        },
        ticker: {
          add: vi.fn(),
        },
        renderer: {
          resize: vi.fn(),
        },
        destroy: vi.fn(),
      };
    }),
    Geometry: vi.fn().mockImplementation(function() {
      return {};
    }),
    Shader: {
      from: vi.fn().mockReturnValue({
        resources: {
          uUniforms: {
            uniforms: {},
          },
        },
      }),
    },
    Mesh: vi.fn().mockImplementation(function() {
      return {
        scale: { set: vi.fn() },
        position: { set: vi.fn() },
        shader: {
          resources: {
            uUniforms: {
              uniforms: {},
            },
          },
        },
      };
    }),
    Color: vi.fn().mockImplementation(function() {
      return {
        red: 1, green: 0, blue: 0,
      };
    }),
  };
});

describe('PixiFuRing', () => {
  const signals = new Array(12).fill(0.5);

  it('renders without crashing', () => {
    const { container } = render(<PixiFuRing signals={signals} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles cleanup on unmount', () => {
    const { unmount } = render(<PixiFuRing signals={signals} />);
    unmount();
  });
});
