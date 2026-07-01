import type { DetailedHTMLProps, HTMLAttributes, Ref } from 'react';

type ACKElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  'auth-key'?: string;
  'auth-token'?: string;
  'api-url'?: string;
  'item-type'?: string;
  'slot-name'?: string;
  language?: string;
  'content-language'?: string;
  size?: string;
  search?: string;
  'dataset-picker'?: boolean;
  'dataset-picker-placeholder'?: string;
  'data-field-variant'?: string;
  positioned?: boolean;
  grows?: boolean;
  selects?: string;
  'view-mode'?: boolean;
  'app-server'?: string;
  'api-host'?: string;
  columns?: string;
  'row-height'?: string;
  debounce?: string;
  ref?: Ref<HTMLElement>;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'luzmo-data-field': ACKElementProps;
      'luzmo-data-field-level': ACKElementProps;
      'luzmo-data-field-panel': ACKElementProps;
      'luzmo-item-slot-drop': ACKElementProps;
      'luzmo-item-slot-drop-panel': ACKElementProps;
      'luzmo-item-slot-picker': ACKElementProps;
      'luzmo-item-slot-picker-panel': ACKElementProps;
      'luzmo-item-option': ACKElementProps;
      'luzmo-item-option-panel': ACKElementProps;
      'luzmo-filters': ACKElementProps;
      'luzmo-item-grid': ACKElementProps & {
        items?: unknown[];
        'content-language'?: string;
        'row-height'?: string;
        /** Horizontal action strip at top of tile (`top-end` = KPI-style row vs vertical dock). */
        'placement-item-actions-menu'?: string;
      };
      'luzmo-ai-chat': ACKElementProps;
      'luzmo-embed-viz-item': ACKElementProps;
    }
  }
}
