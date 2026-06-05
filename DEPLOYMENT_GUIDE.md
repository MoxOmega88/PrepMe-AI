# PrepMeAI - Deployment Guide

## 📦 Deployment Options

### Option 1: Vercel + Railway (Recommended for Speed)
- **Frontend**: Vercel (free tier available)
- **Backend**: Railway (free tier ~$5/month after credits)
- **Database**: Railway PostgreSQL
- **Setup Time**: ~20 minutes

### Option 2: Docker + AWS/GCP (Recommended for Scale)
- **Frontend**: AWS CloudFront + S3 or Google Cloud Run
- **Backend**: AWS ECS/Lambda or Google Cloud Run
- **Database**: AWS RDS or Cloud SQL
- **Setup Time**: ~1-2 hours

### Option 3: Self-Hosted (Heroku, DigitalOcean, etc.)
- **Full Control**: Manage your own servers
- **Cost**: $5-30+ per month
- **Setup Time**: ~2-3 hours

---

## 🚀 Option 1: Vercel + Railway (RECOMMENDED)

### Prerequisites
- GitHub account
- Vercel account (free signup)
- Railway account (free signup)
- Groq API key

### Step 1: Deploy Frontend to Vercel

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect Vercel to GitHub**
   - Go to [Vercel.com](https://vercel.com)
   - Click "New Project"
   - Select your GitHub repository
   - Framework: Next.js (auto-detected)

3. **Set Environment Variables**
   - Under "Environment Variables", add:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your frontend will be at: `https://your-app.vercel.app`

### Step 2: Deploy Backend to Railway

1. **Prepare Your Code**
   ```bash
   # Make sure you have all requirements in backend/requirements.txt
   pip freeze > backend/requirements.txt
   ```

2. **Connect Railway to GitHub**
   - Go to [Railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your prepmeai repository

3. **Configure Backend Service**
   - Root Directory: `backend`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   - In Railway dashboard, go to Variables
   - Add your environment variables:
   ```
   GROQ_API_KEY=gsk_xxxxxxxxxxxxx
   PDF_SCIENCE_PATH=./ncert_science_8.pdf
   PDF_MATHS_PATH=./ncert_maths_8.pdf
   PDF_SOCIAL_PATH=./ncert_social_8.pdf
   PDF_ENGLISH_PATH=./ncert_english_8.pdf
   DATABASE_URL=postgresql://...  (auto-generated)
   ```

5. **Add PostgreSQL Database**
   - In Railway, click "Add Service"
   - Select "PostgreSQL"
   - DATABASE_URL will be auto-populated

6. **Deploy**
   - Click "Deploy"
   - Wait for deployment
   - Your backend will be at: `https://your-app.railway.app`

### Step 3: Update Frontend with Backend URL

1. Go back to Vercel dashboard
2. Go to Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` with your Railway backend URL
4. Redeploy: Click "Deployments" → Last deployment → three dots → "Redeploy"

### Step 4: Upload PDFs to Railway

1. SSH into Railway container:
   ```bash
   railway shell
   ```

2. Upload PDFs to the backend container or configure S3:
   ```bash
   # Or upload to S3 and update PDF_*_PATH environment variables
   ```

---

## 🐳 Option 2: Docker + AWS (Advanced)

### Prerequisites
- Docker installed locally
- AWS Account
- AWS CLI configured

### Step 1: Dockerize Your Application

**Create Dockerfile for Backend** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Create Dockerfile for Frontend** (`frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

**Create docker-compose.yml**:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - DATABASE_URL=postgresql://user:password@db:5432/prepmeai
    depends_on:
      - db
    volumes:
      - ./backend/ncert_*.pdf:/app/ncert_*.pdf

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=prepme
      - POSTGRES_PASSWORD=secure_password
      - POSTGRES_DB=prepmeai
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Step 2: Push to AWS ECR

```bash
# Authenticate with AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repositories
aws ecr create-repository --repository-name prepmeai-backend
aws ecr create-repository --repository-name prepmeai-frontend

# Build and push backend
docker build -t prepmeai-backend ./backend
docker tag prepmeai-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/prepmeai-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/prepmeai-backend:latest

# Build and push frontend
docker build -t prepmeai-frontend ./frontend
docker tag prepmeai-frontend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/prepmeai-frontend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/prepmeai-frontend:latest
```

### Step 3: Deploy to AWS ECS

Use AWS CloudFormation or AWS Console to:
1. Create ECS Cluster
2. Create Task Definitions for backend and frontend
3. Create Services with Load Balancer
4. Configure RDS for PostgreSQL
5. Set up CloudFront for static assets

---

## 🔐 Production Security Checklist

- [ ] Generate new SECRET_KEY for production
- [ ] Set DEBUG=False in production environment
- [ ] Use HTTPS only (SSL certificates)
- [ ] Set secure CORS origins
- [ ] Enable database backups
- [ ] Set up monitoring and logging
- [ ] Use environment-specific configuration
- [ ] Implement rate limiting
- [ ] Set up authentication properly
- [ ] Review API permissions

### Production Environment Variables

```env
# Backend Production
DEBUG=False
SECRET_KEY=generate_with_secrets.token_urlsafe()
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
GROQ_API_KEY=your_groq_key
DATABASE_URL=postgresql://user:password@prod-db:5432/prepmeai
CORS_ORIGINS=https://your-frontend-domain.com
```

---

## 📊 Monitoring & Maintenance

### Set Up Logging
- **Backend**: Use Sentry for error tracking
- **Frontend**: Use Sentry or LogRocket
- **Database**: CloudWatch or DataDog

### Set Up Monitoring
- **Uptime**: Use UptimeRobot or StatusPage
- **Performance**: Use New Relic or DataDog
- **Cost**: AWS Cost Explorer or GCP Console

### Backup Strategy
- Daily database backups
- Monthly code backups
- Test restore procedures monthly

---

## 🚨 Troubleshooting Deployments

### Frontend won't load
```bash
# Check environment variable is set
echo $NEXT_PUBLIC_API_URL

# Rebuild and redeploy
vercel --prod
```

### Backend API errors
```bash
# Check logs
railway logs

# Check environment variables
railway env
```

### Database connection issues
```bash
# Test connection string
psql $DATABASE_URL

# Check migrations ran
# In backend, ensure alembic migrations are applied
```

---

## 💰 Cost Estimates

### Vercel + Railway (Monthly)
- **Vercel Frontend**: $0-20 (free tier available)
- **Railway Backend**: $5-50 (depends on usage)
- **Railway PostgreSQL**: $15-50
- **Groq API**: $0 (free tier, or pay-as-you-go)
- **Total**: ~$20-120/month

### Docker + AWS (Monthly)
- **ECS**: $0.0256/hour × 730 hours = ~$18.70
- **RDS PostgreSQL**: ~$15-50
- **S3/CloudFront**: ~$5-20
- **Groq API**: $0 (free tier available)
- **Total**: ~$40-90/month

### Self-Hosted (DigitalOcean) (Monthly)
- **Droplet (2GB)**: $12
- **Database**: $15
- **Storage**: $5
- **Groq API**: $0
- **Total**: ~$32/month

---

## 🎯 Recommended: Vercel + Railway + PostgreSQL

**Why?**
- Easiest to set up (20 minutes)
- Free tier available for learning
- Auto-scaling
- Minimal maintenance
- Integrated with GitHub

**Steps:**
1. Push to GitHub
2. Connect Vercel to GitHub (frontend)
3. Connect Railway to GitHub (backend)
4. Add PostgreSQL on Railway
5. Set environment variables
6. Deploy

**Done!** Your app is live. 🚀

---

## 📚 Further Reading

- [Vercel Deployment Guide](https://vercel.com/docs/concepts/deployments/overview)
- [Railway Documentation](https://docs.railway.app/)
- [AWS Deployment Guide](https://aws.amazon.com/getting-started/)
- [Docker Documentation](https://docs.docker.com/)

---

**Last Updated**: January 2025  
**Recommended**: Vercel + Railway for fastest deployment
