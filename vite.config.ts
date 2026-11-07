import { defineConfig } from 'vite'

// The site is served from the `sejuty` repo at https://sejuty.github.io/sejuty/,
// so every asset URL needs that prefix. If you move it to a repo named `Sejuty.github.io`
// (served at https://sejuty.github.io/), change this back to '/'.
export default defineConfig({
  base: '/sejuty/',
})
