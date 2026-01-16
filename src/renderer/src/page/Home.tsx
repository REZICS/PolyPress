import MainLayout from '@/layout/MainLayout';
import Dropzone from '@/component/Common/File/Dropzone';
import {useLocation} from 'wouter';

export default function Home() {
  const [, navigate] = useLocation();
  return (
    <MainLayout>
      <div className="space-y-2">
        <div className="text-lg font-semibold">Home</div>
        <Dropzone
          afterDropProcess={() => {
            navigate('/workspace');
          }}
        />
      </div>
    </MainLayout>
  );
}
