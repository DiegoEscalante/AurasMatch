import { useAccessibility } from '@/hooks/use-accessibility';

export function useTheme() {
  const { palette } = useAccessibility();
  return palette;
}
