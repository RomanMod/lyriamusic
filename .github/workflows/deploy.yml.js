name: Deploy Vite site to GitHub Pages

on:
  # Triggers the workflow on push events but only for the main branch
  push:
    branches:
      - main

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
# However, do NOT cancel in-progress runs as we want to allow these production deployments to complete.
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  # Build job
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code from main branch
        uses: actions/checkout@v4 # Checks out the 'main' branch

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18 # Specify your Node.js version

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build # This uses your vite.config.ts
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }} # Inject API key during build
          VITE_GA_MEASUREMENT_ID: ${{ secrets.VITE_GA_MEASUREMENT_ID }} # Inject GA4 Measurement ID

      - name: Copy static assets
        run: |
          if [ -f "vinil.mp3" ]; then
            cp vinil.mp3 dist/
          else
            echo "vinil.mp3 not found, skipping copy. The vinyl player feature may not work."
          fi

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload production-ready build files
        uses: actions/upload-pages-artifact@v3
        with:
          # Upload entire repository
          path: './dist' # The folder Vite builds to (from vite.config.ts)

  # Deployment job
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build # Depends on the build job completing successfully
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4 # This action deploys the artifact to GitHub Pages
