import MainLayout from '@/layout/MainLayout';
import Dropzone from '@/component/Common/File/Dropzone';

export default function Home() {
  return (
    <MainLayout>
      <div className="space-y-2">
        <div className="text-lg font-semibold">Home</div>
        <Dropzone />
      </div>
    </MainLayout>
  );
}
