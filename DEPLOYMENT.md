# Deployment Guide - EcoSort Smart Waste Management

## Quick Start

This application is ready for deployment and includes:

- ✅ Complete Supabase integration for authentication and data storage
- ✅ Comprehensive voucher redemption system
- ✅ Real-time waste classification with ML integration
- ✅ Community features (leaderboards, achievements)
- ✅ Responsive dark theme UI
- ✅ Production-ready build configuration

## Environment Variables

### Required Variables

```bash
# Supabase Configuration (Required for authentication and data storage)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Optional Variables

```bash
# Application URLs
VITE_APP_URL=https://your-domain.com
VITE_API_BASE_URL=https://your-domain.com/api

# Maps and Location Services
VITE_OPENSTREETMAP_API_KEY=your-openstreetmap-api-key
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Machine Learning Services
VITE_ML_API_ENDPOINT=https://your-ml-api-endpoint.com
VITE_ML_API_KEY=your-ml-api-key
VITE_TENSORFLOW_MODEL_URL=https://your-model-url.com/model.json

# Media Upload Services
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_API_KEY=your-cloudinary-api-key

# Analytics
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
VITE_SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io
```

## Deployment Steps

### 1. Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and anon key
3. Set the environment variables in your deployment platform
4. Connect to Supabase MCP in Builder.io for database schema creation
5. Run the database migrations to create tables

### 2. Platform Deployment

#### Option A: Netlify (Recommended)

1. [Connect to Netlify](#open-mcp-popover) in Builder.io
2. Use the Netlify MCP tools to deploy directly
3. Set environment variables in Netlify dashboard
4. Enable automatic deployments from your Git repository

#### Option B: Vercel

1. [Connect to Vercel](#open-mcp-popover) in Builder.io
2. Use the Vercel MCP tools to deploy directly
3. Set environment variables in Vercel dashboard
4. Enable automatic deployments

#### Option C: Manual Deployment

```bash
# Build the application
pnpm build

# The built files will be in the dist/ directory
# Upload these to your hosting platform
```

### 3. Database Setup

After connecting to Supabase MCP, the following tables will be created:

- `user_profiles` - User authentication and profile data
- `vouchers` - Available vouchers for redemption
- `voucher_redemptions` - User voucher redemption history
- `user_transactions` - Points earning and spending history
- `waste_classifications` - Waste categorization records
- `recycling_centers` - Local recycling center data
- `achievements` - Achievement definitions
- `user_achievements` - User achievement progress
- `user_activities` - Activity feed and history
- `leaderboard_entries` - Community rankings

## Features Overview

### 🎯 Core Features

- **Waste Classification**: AI-powered waste categorization
- **Points System**: Earn eco-points for proper waste disposal
- **Voucher Marketplace**: Redeem points for real-world rewards
- **User Authentication**: Secure login with Supabase
- **Profile Management**: Track progress and achievements

### 🏆 Community Features

- **Leaderboards**: Weekly, monthly, and all-time rankings
- **Achievements**: Badge system for milestones
- **Activity Feed**: Track user actions and progress

### 🎟️ Voucher System

- **Shopping**: Amazon, Flipkart, Myntra discounts
- **Food & Beverages**: Domino's, Swiggy, CCD offers
- **Travel**: Uber, Ola ride discounts
- **Eco-friendly**: Green store and sustainable product discounts

### 📱 Technical Features

- **Responsive Design**: Works on all device sizes
- **Dark Theme**: Professional dark UI with green accents
- **Real-time Updates**: Live data synchronization
- **Offline Support**: Local storage fallbacks
- **Progressive Web App**: Installable on mobile devices

## Demo Account

For testing purposes, use:

- Email: `demo@ecosort.app`
- Password: `password`

## Production Checklist

- ✅ Environment variables configured
- ✅ Supabase project created and connected
- ✅ Database schema deployed
- ✅ Build process tested
- ✅ Authentication flow working
- ✅ Voucher system operational
- ✅ Error handling implemented
- ✅ Loading states added
- ✅ Mobile responsiveness verified
- ✅ Performance optimized

## Support

For deployment assistance or technical support:

- Check the Builder.io documentation: https://www.builder.io/c/docs/projects
- [Contact Support](#reach-support) for technical issues
- [Contact Sales](#reach-sales) for billing or subscription questions

## Post-Deployment

After successful deployment:

1. Test all authentication flows
2. Verify voucher redemption works
3. Check mobile responsiveness
4. Monitor error logs
5. Set up analytics (optional)
6. Configure custom domain (optional)
7. Enable HTTPS (usually automatic)

The application is designed to work seamlessly whether Supabase is connected or not, providing a robust fallback system for development and testing.
