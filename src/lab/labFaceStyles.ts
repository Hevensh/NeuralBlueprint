import type { CSSProperties } from 'react';
import type { LabDeskDecoration } from './decorations/decorationTypes';
import type { LabIsoFaceGeometry } from './labIsometric';

type FaceStyleConfig = {
  base?: CSSProperties;
  faces?: Partial<Record<LabIsoFaceGeometry['face'], CSSProperties>>;
  roles?: Partial<Record<LabIsoFaceGeometry['role'], CSSProperties>>;
};

export function resolveFaceStyle(
  config: FaceStyleConfig,
  face: LabIsoFaceGeometry,
): CSSProperties {
  return {
    ...config.base,
    ...config.faces?.[face.face],
    ...config.roles?.[face.role],
  };
}

export const WHITEBOARD_FACE_STYLE: CSSProperties = {
  background: 'rgba(238, 247, 244, 0.96)',
  boxShadow: 'inset 0 0 0 3px #8fa4a8',
};

export const WHITEBOARD_SUPPORT_FACE_STYLES: FaceStyleConfig = {
  roles: {
    top: { background: '#91a2a6' },
    side: { background: '#66787d' },
    front: { background: '#77898d' },
  },
};

export const FLOOR_FACE_STYLES: CSSProperties[] = [
  {
    background: '#c99c77',
    filter: 'drop-shadow(0 1px 0 rgba(103, 70, 50, 0.16))',
  },
  {
    background: '#c3926e',
    filter: 'drop-shadow(0 1px 0 rgba(103, 70, 50, 0.16))',
  },
];

export const BOOKSHELF_FACE_STYLES: FaceStyleConfig = {
  roles: {
    top: { background: '#8f674d' },
    side: { background: '#654838' },
    front: { overflow: 'hidden', background: '#765541' },
  },
};

export const SERVER_FACE_STYLES: FaceStyleConfig = {
  roles: {
    top: { background: '#52646c' },
    side: { background: '#26343b' },
    front: { overflow: 'hidden', background: '#35464e' },
  },
};

export const COMMON_TABLE_FACE_STYLES: FaceStyleConfig = {
  roles: {
    top: { background: '#a87552' },
    side: { background: '#765039' },
    front: { background: '#865b3f' },
  },
};

export const COMMON_TABLE_LEG_FACE_STYLES: FaceStyleConfig = {
  roles: {
    top: { background: '#718086' },
    side: { background: '#46555b' },
    front: { background: '#56666c' },
  },
};

export const FURNITURE_DETAIL_STYLES = {
  bookshelfOpening: {
    border: '1px solid rgba(58, 39, 31, 0.72)',
    background: '#3f3029',
  },
  bookshelfShelf: {
    border: '1px solid rgba(77, 49, 36, 0.5)',
    background: '#a87a59',
  },
  bookshelfBooks: ['#0891b2', '#d97706', '#7c3aed', '#059669'].map((background) => ({
    background,
  })),
  serverPanel: {
    border: '1px solid rgba(148, 163, 184, 0.42)',
    background: '#18252c',
  },
  serverVent: {
    background: 'rgba(148, 163, 184, 0.72)',
  },
} satisfies Record<string, unknown>;

export const WORKSTATION_FACE_STYLES = {
  shadow: {
    background: 'rgba(49, 54, 55, 0.2)',
    filter: 'drop-shadow(0 2px 2px rgba(38, 42, 43, 0.08))',
  },
  desk: {
    background: '#a87552',
    filter: 'none',
  },
  deskThickness: {
    background: '#835b40',
    filter: 'none',
  },
  divider: {
    back: {
      background: '#9eaaa9',
      filter: 'drop-shadow(1px 2px 0 #748987) drop-shadow(2px 4px 3px rgba(48, 70, 71, 0.16))',
    },
    side: {
      background: '#bdcfcb',
      filter: 'drop-shadow(1px 2px 0 #748987) drop-shadow(2px 4px 3px rgba(48, 70, 71, 0.16))',
    },
    end: {
      background: '#bdcfcb',
      filter: 'drop-shadow(1px 2px 0 #748987) drop-shadow(2px 4px 3px rgba(48, 70, 71, 0.16))',
    },
  },
  seat: {
    background: '#74878d',
    filter: 'drop-shadow(0 3px 0 #506168) drop-shadow(0 5px 4px rgba(38, 52, 58, 0.2))',
  },
  seatSupport: {
    l: {
      background: '#607178',
      filter: 'drop-shadow(1px 2px 1px rgba(38, 52, 58, 0.18))',
    },
    r: {
      background: '#46575e',
      filter: 'drop-shadow(1px 2px 1px rgba(38, 52, 58, 0.18))',
    },
  },
} satisfies Record<string, unknown>;

export function createComputerFaceStyles(accent: string) {
  return {
    monitorBase: {
      border: `1px solid color-mix(in srgb, ${accent} 28%, #48575e)`,
      background: `color-mix(in srgb, ${accent} 18%, #586970)`,
      filter: 'drop-shadow(0 1px 1px rgba(38, 52, 58, 0.24))',
    },
    monitorStand: {
      background: `color-mix(in srgb, ${accent} 18%, #53636a)`,
      filter: 'drop-shadow(1px 1px 1px rgba(38, 52, 58, 0.2))',
    },
    keyboard: {
      border: `1px solid color-mix(in srgb, ${accent} 24%, #48575e)`,
      background: `color-mix(in srgb, ${accent} 16%, #4b5d64)`,
      filter: 'drop-shadow(0 2px 2px rgba(38, 52, 58, 0.24))',
    },
    keyboardRow: { background: 'rgba(190, 211, 214, 0.68)' },
    mousePad: {
      border: `1px solid color-mix(in srgb, ${accent} 24%, #334155)`,
      background: `color-mix(in srgb, ${accent} 16%, #26343b)`,
      filter: 'drop-shadow(0 1px 1px rgba(38, 52, 58, 0.18))',
    },
    tower: {
      base: {
        border: 0,
        background: `color-mix(in srgb, ${accent} 16%, #405159)`,
        filter: 'drop-shadow(1px 2px 2px rgba(29, 43, 49, 0.22))',
      },
      roles: {
        top: { background: `color-mix(in srgb, ${accent} 22%, #5b6d74)` },
        side: { background: `color-mix(in srgb, ${accent} 14%, #35464e)` },
        front: { background: `color-mix(in srgb, ${accent} 18%, #405159)` },
      },
    } satisfies FaceStyleConfig,
  };
}

export function getDecorationFaceStyle(
  decoration: LabDeskDecoration,
  face: LabIsoFaceGeometry,
  partClassName: string,
): CSSProperties {
  const color = decoration.color;
  const style: CSSProperties = {
    boxSizing: 'border-box',
    pointerEvents: 'none',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: `color-mix(in srgb, ${color} 42%, #475569)`,
    background: `color-mix(in srgb, ${color} 42%, #dbe4e6)`,
    filter: 'drop-shadow(0 1px 1px rgba(49, 62, 68, 0.18))',
  };

  if (face.role === 'front') {
    style.background = `color-mix(in srgb, ${color} 38%, #64748b)`;
  } else if (face.role === 'side') {
    style.background = `color-mix(in srgb, ${color} 30%, #475569)`;
  }

  if (decoration.kind === 'books') {
    if (partClassName.includes('book-pages')) {
      style.borderColor = 'rgba(100, 116, 139, 0.34)';
      style.background = face.role === 'top'
        ? '#f7f7f0'
        : face.role === 'front' ? '#e9ebe3' : '#dce1da';
    } else {
      const layer = Number(partClassName.match(/layer-(\d+)/)?.[1] ?? 0);
      const stack = Number(partClassName.match(/stack-(\d+)/)?.[1] ?? 0);
      const bookTones = ['#334155', '#92400e', '#6d5a91', '#0f766e', '#9f1239'];
      const bookTone = bookTones[(layer + stack * 2) % bookTones.length];
      style.background = `color-mix(in srgb, ${color} 34%, ${bookTone})`;
    }
  } else if (partClassName === 'sheet' || partClassName.startsWith('tray-paper')) {
    style.borderColor = 'rgba(100, 116, 139, 0.46)';
    style.background = '#e8eff0';
  } else if (partClassName === 'paper-title') {
    style.borderWidth = 0;
    style.background = `color-mix(in srgb, ${color} 72%, #334155)`;
    style.filter = 'none';
  } else if (
    partClassName === 'paper-text'
    || partClassName === 'paper-axis'
    || partClassName === 'paper-divider'
  ) {
    style.borderWidth = 0;
    style.background = partClassName === 'paper-divider'
      ? 'rgba(100, 116, 139, 0.2)'
      : 'rgba(71, 85, 105, 0.58)';
    style.filter = 'none';
  } else if (partClassName.startsWith('paper-bar')) {
    style.borderWidth = 0;
    style.background = `color-mix(in srgb, ${color} 68%, #38bdf8)`;
    style.filter = 'none';
  } else if (partClassName === 'paper-plot' || partClassName === 'paper-link') {
    style.borderWidth = 0;
    style.background = `color-mix(in srgb, ${color} 68%, #ef6461)`;
    style.filter = 'none';
  } else if (partClassName.startsWith('paper-node')) {
    style.borderColor = `color-mix(in srgb, ${color} 70%, #334155)`;
    style.background = `color-mix(in srgb, ${color} 42%, #dbe4e6)`;
    style.filter = 'none';
  } else if (decoration.kind === 'documentTray') {
    if (partClassName === 'tray-base') {
      style.background = `color-mix(in srgb, ${color} 18%, #52646b)`;
    } else {
      style.borderColor = `color-mix(in srgb, ${color} 42%, #334155)`;
      style.background = `color-mix(in srgb, ${color} 28%, #64748b)`;
    }
  } else if (decoration.kind === 'equipmentCrate') {
    if (partClassName === 'crate-band') {
      style.background = `color-mix(in srgb, ${color} 12%, #4b3b31)`;
    } else if (partClassName === 'crate-label') {
      style.background = '#d8ddd7';
    } else {
      const mix = face.role === 'top'
        ? ['22%', '#9a6b4d']
        : face.role === 'front'
          ? ['18%', '#7b523b']
          : ['12%', '#634435'];
      style.background = `color-mix(in srgb, ${color} ${mix[0]}, ${mix[1]})`;
    }
  } else if (decoration.kind === 'plant') {
    if (partClassName === 'pot') {
      style.background = `color-mix(in srgb, ${color} 22%, #9a6246)`;
    } else if (partClassName === 'leaves') {
      style.borderColor = '#2f7658';
      style.background = `color-mix(in srgb, ${color} 28%, #3f8f68)`;
    }
  } else if (decoration.kind === 'cactus') {
    if (partClassName === 'pot') {
      style.background = `color-mix(in srgb, ${color} 18%, #a16242)`;
    } else {
      style.borderColor = '#267354';
      style.background = `color-mix(in srgb, ${color} 18%, #2f9b68)`;
    }
  } else if (decoration.kind === 'deskLamp') {
    if (partClassName === 'lamp-base') {
      style.background = `color-mix(in srgb, ${color} 20%, #475569)`;
    } else if (partClassName === 'lamp-shade') {
      style.background = `color-mix(in srgb, ${color} 42%, #f6c96b)`;
      style.filter = 'drop-shadow(0 2px 3px rgba(245, 183, 68, 0.22))';
    } else {
      style.background = `color-mix(in srgb, ${color} 52%, #64748b)`;
    }
  } else if (decoration.kind === 'figurine') {
    if (partClassName === 'figure-base') {
      style.background = '#45545b';
    } else if (partClassName === 'figure-head') {
      style.background = `color-mix(in srgb, ${color} 32%, #f0d7bf)`;
    } else {
      style.background = `color-mix(in srgb, ${color} 72%, #475569)`;
    }
  } else if (decoration.kind === 'headphones') {
    style.background = partClassName === 'headphone-pad'
      ? `color-mix(in srgb, ${color} 18%, #26343b)`
      : `color-mix(in srgb, ${color} 64%, #475569)`;
  } else if (decoration.kind === 'printer') {
    if (partClassName === 'printer-paper') {
      style.borderColor = 'rgba(100, 116, 139, 0.42)';
      style.background = '#edf3f2';
    } else if (partClassName === 'printer-output') {
      style.borderColor = '#3f5057';
      style.background = '#465960';
    } else if (partClassName === 'printer-base') {
      style.borderColor = `color-mix(in srgb, ${color} 24%, #35464e)`;
      style.background = `color-mix(in srgb, ${color} 12%, #4b5d64)`;
    } else if (partClassName === 'printer-body') {
      style.borderColor = `color-mix(in srgb, ${color} 18%, #607178)`;
      style.background = `color-mix(in srgb, ${color} 10%, #b2bec0)`;
      style.filter = 'drop-shadow(0 2px 1px rgba(40, 55, 60, 0.22))';
    } else {
      style.background = `color-mix(in srgb, ${color} 14%, #9ba9ac)`;
    }
  } else if (decoration.kind === 'oscilloscope') {
    if (partClassName === 'scope-display') {
      style.borderColor = '#37525a';
      style.background = '#123640';
      style.boxShadow = 'inset 0 0 0 1px rgba(45, 212, 191, 0.3)';
    } else if (partClassName === 'scope-control') {
      style.borderWidth = 0;
      style.background = decoration.variant % 2 ? '#f59e0b' : '#34d399';
    } else {
      style.background = `color-mix(in srgb, ${color} 20%, #52646b)`;
    }
  } else if (decoration.kind === 'networkSwitch') {
    if (partClassName.startsWith('switch-port')) {
      style.borderWidth = 0;
      style.background = '#182b32';
      style.boxShadow = 'inset 0 0 0 1px rgba(125, 211, 252, 0.24)';
    } else if (partClassName === 'switch-light') {
      style.borderWidth = 0;
      style.background = decoration.variant % 2 ? '#fbbf24' : '#34d399';
      style.filter = 'drop-shadow(0 0 2px currentColor)';
    } else {
      style.background = `color-mix(in srgb, ${color} 18%, #52646b)`;
    }
  } else if (decoration.kind === 'gpuTestBench') {
    if (partClassName === 'bench-mat') {
      style.borderColor = '#314a48';
      style.background = '#405d59';
    } else if (partClassName === 'bench-board') {
      style.background = '#33735e';
    } else if (partClassName === 'bench-gpu') {
      style.background = '#26343b';
    } else if (partClassName === 'bench-heatsink') {
      style.background = '#98a7aa';
    } else if (partClassName === 'bench-chip') {
      style.borderColor = '#a88132';
      style.background = '#334155';
    } else if (partClassName === 'bench-memory') {
      style.background = `color-mix(in srgb, ${color} 58%, #475569)`;
    } else if (partClassName === 'bench-light') {
      style.borderWidth = 0;
      style.background = decoration.variant % 2 ? '#f59e0b' : '#34d399';
      style.filter = 'drop-shadow(0 0 2px currentColor)';
    } else if (partClassName === 'bench-wire') {
      style.borderWidth = 0;
      style.background = decoration.variant % 2 ? '#f59e0b' : '#67e8f9';
    }
  } else if (decoration.kind === 'mug' || decoration.kind === 'penCup') {
    style.background = `color-mix(in srgb, ${color} 62%, #64748b)`;
  }

  return style;
}
