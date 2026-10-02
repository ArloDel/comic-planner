declare module '@supabase/ssr' {
  export * from '@supabase/ssr/dist/main/index';
}

declare module 'next' {
  export * from 'next/dist/types';
  import next from 'next/dist/server/next';
  export default next;
}
