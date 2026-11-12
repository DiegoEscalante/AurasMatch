import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

export type ThemedTextType =
  | 'default'
  | 'title'
  | 'small'
  | 'smallBold'
  | 'subtitle'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

const BASE_TYPOGRAPHY: Record<
  ThemedTextType,
  { fontSize: number; lineHeightRatio: number; fontWeight: TextStyle['fontWeight'] }
> = {
  small: { fontSize: 14, lineHeightRatio: 1.45, fontWeight: '500' },
  smallBold: { fontSize: 14, lineHeightRatio: 1.45, fontWeight: '700' },
  default: { fontSize: 16, lineHeightRatio: 1.5, fontWeight: '500' },
  title: { fontSize: 36, lineHeightRatio: 1.25, fontWeight: '700' },
  subtitle: { fontSize: 24, lineHeightRatio: 1.35, fontWeight: '600' },
  link: { fontSize: 14, lineHeightRatio: 1.5, fontWeight: '500' },
  linkPrimary: { fontSize: 14, lineHeightRatio: 1.5, fontWeight: '600' },
  code: {
    fontSize: 12,
    lineHeightRatio: 1.45,
    fontWeight: Platform.select({ android: '700', default: '500' }),
  },
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  accessibilityRole,
  ...rest
}: ThemedTextProps) {
  const { palette, prefs, activeFontFamily } = useAccessibility();

  const spec = BASE_TYPOGRAPHY[type];
  const scale = prefs.font_scale;
  const scaledFontSize = Math.round(spec.fontSize * scale);
  const dyslexiaLineBoost = prefs.dyslexia_font ? 0.12 : 0;
  const scaledLineHeight = Math.ceil(
    scaledFontSize * (spec.lineHeightRatio + dyslexiaLineBoost)
  );

  const resolvedColor =
    themeColor !== undefined
      ? palette[themeColor]
      : type === 'linkPrimary'
        ? palette.linkPrimary
        : palette.text;

  const fontFamily =
    type === 'code' && !prefs.dyslexia_font ? Fonts?.mono : activeFontFamily;

  const isHeading = type === 'title' || type === 'subtitle';
  const resolvedRole = accessibilityRole ?? (isHeading ? 'header' : undefined);
  const ariaLevel = type === 'title' ? 1 : type === 'subtitle' ? 2 : undefined;

  return (
    <Text
      allowFontScaling={true}
      maxFontSizeMultiplier={2.0}
      accessibilityRole={resolvedRole}
      aria-level={ariaLevel}
      style={[
        {
          color: resolvedColor,
          fontSize: scaledFontSize,
          lineHeight: scaledLineHeight,
          fontWeight: spec.fontWeight,
          fontFamily,
          letterSpacing: prefs.dyslexia_font ? 0.6 : undefined,
        },
        type === 'link' || type === 'linkPrimary' ? styles.underlineOnHighContrast : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  underlineOnHighContrast: {
    textDecorationLine: 'underline',
  },
});
