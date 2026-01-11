import {ThemeSwitch} from '@/component/ui/theme-switch';
import MainLayout from '@/layout/MainLayout';
export default function Theme() {
  return (
    <MainLayout>
      <div>
        <h1>Theme</h1>
        <ThemeSwitch />
      </div>
    </MainLayout>
  );
}
