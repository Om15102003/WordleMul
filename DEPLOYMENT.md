# Deploying VsWordle to Render

This guide will help you deploy your VsWordle application to Render with both frontend and backend in a single instance.

## Prerequisites

- A GitHub account
- Your code pushed to a GitHub repository
- A Render account (free tier available)

## Step 1: Prepare Your Code

1. **Install dependencies and build:**
   ```bash
   npm install
   npm run build
   ```

2. **Verify the build:**
   - Check that the `dist/` folder was created
   - Ensure `package.json` has the correct scripts and dependencies

## Step 2: Push to GitHub

1. **Initialize git (if not already done):**
   ```bash
   git init
   git add .
   git commit -m "Prepare for Render deployment"
   ```

2. **Push to GitHub:**
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

## Step 3: Deploy on Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New +" and select "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name:** `vs-wordle` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or choose your preferred plan)

5. **Click "Create Web Service"**

## Step 4: Environment Variables (Optional)

If you need to set environment variables:
- Go to your service dashboard
- Click "Environment"
- Add any required variables

## Step 5: Wait for Deployment

- Render will automatically build and deploy your application
- You can monitor the build logs in real-time
- Once complete, you'll get a URL like: `https://your-app-name.onrender.com`

## How It Works

- **Frontend:** Built with Vite and served as static files by Express
- **Backend:** Node.js/Express server with Socket.IO for real-time multiplayer
- **Single Instance:** Both frontend and backend run in the same Render service
- **Auto-deploy:** Changes pushed to GitHub automatically trigger new deployments

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify the build script works locally
- Check Render build logs for specific errors

### Socket Connection Issues
- Ensure the frontend is connecting to the correct server URL
- Check that CORS is properly configured
- Verify Socket.IO is working in the browser console

### Static Files Not Loading
- Confirm the `dist/` folder is being built
- Check that Express is serving static files correctly
- Verify the build output path in Vite config

## Support

If you encounter issues:
1. Check the Render build logs
2. Verify your local build works
3. Check the browser console for frontend errors
4. Review the server logs in Render dashboard

## Cost

- **Free Tier:** 750 hours/month, auto-sleeps after 15 minutes of inactivity
- **Paid Plans:** Start at $7/month for always-on service
