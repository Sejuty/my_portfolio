import { defineConfig } from 'vite'

// The site is served from the `my_portfolio` repo at https://sejuty.github.io/my_portfolio/,
// so every asset URL needs that prefix. If you move it to a repo named `Sejuty.github.io`
// (served at https://sejuty.github.io/), change this back to '/'.
export default defineConfig({
  base: '/my_portfolio/',
})
