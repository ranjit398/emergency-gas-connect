// MUI v7 Grid type fixes - make item and container props optional
import { GridProps } from '@mui/material/Grid';

// Extend the GridProps to make it compatible with item/container usage
declare module '@mui/material/Grid' {
  interface GridProps {
    // Make component optional to allow using Grid without specifying it
    component?: React.ElementType<any>;
    item?: boolean;
    container?: boolean;
  }
}
