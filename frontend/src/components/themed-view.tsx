import { View, type ViewProps } from 'react-native';

import { type ThemeColor } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  ...otherProps
}: ThemedViewProps) {
  const { palette, resolvedThemeKey } = useAccessibility();
  const isSurfaceElement = type === 'backgroundElement' || type === 'backgroundSelected';

  return (
    <View
      style={[
        { backgroundColor: palette[type ?? 'background'] },
        resolvedThemeKey === 'high_contrast' && isSurfaceElement
          ? { borderWidth: 1.5, borderColor: palette.border }
          : null,
        style,
      ]}
      {...otherProps}
    />
  );
}
