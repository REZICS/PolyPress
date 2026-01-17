import esbuild from 'esbuild';

export async function compileInject(entry: string): Promise<string> {
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    target: 'es2020',
    globalName: '__INJECT_BUNDLE__',
  });

  return result.outputFiles[0].text;
}
