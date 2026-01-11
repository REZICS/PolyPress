import {ThemeSwitch} from '@/component/ui/theme-switch';
import MainLayout from '@/layout/MainLayout';

export default function Home() {
  return (
    <MainLayout>
      <div className="space-y-2">
        <div className="text-lg font-semibold">Home</div>
        <div className="text-sm text-muted-foreground">
          这里是内容区域（右侧），左侧为 sidebar，顶部为细条 header。
        </div>
        <ThemeSwitch />
      </div>
    </MainLayout>
  );
}
