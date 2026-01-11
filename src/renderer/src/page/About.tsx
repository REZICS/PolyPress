import MainLayout from '@/layout/MainLayout';

export default function About() {
  return (
    <MainLayout>
      <div className="space-y-2">
        <div className="text-lg font-semibold">About</div>
        <div className="text-sm text-muted-foreground">
          这是 About 页面，用同一套 layout 包裹。
        </div>
      </div>
    </MainLayout>
  );
}
