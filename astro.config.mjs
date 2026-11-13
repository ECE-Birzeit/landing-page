// @ts-check
import { defineConfig } from 'astro/config';

// A static site for GitHub Pages at birzeit.me: every page builds to /<page>/index.html
export default defineConfig({
  site: 'https://birzeit.me',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false }
});
