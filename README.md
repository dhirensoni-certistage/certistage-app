# CertiStage

Professional certificate generation platform built with Next.js and MongoDB.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the values (MongoDB, Razorpay, email).
2. Install dependencies: `npm install --legacy-peer-deps`
3. Run the dev server: `npm run dev`

## Deployment

Production is hosted on Vercel and deploys automatically from the `master` branch.
Merging a pull request into `master` triggers a new production deployment.
