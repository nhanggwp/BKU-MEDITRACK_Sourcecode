# MediTrack - Medication Safety Platform

**Submission for UIT Challenge Competition**

![MediTrack Logo](MediTrackWeb/public/logo.png)

## Project Overview

MediTrack is an intelligent healthcare platform designed to help manage medications and ensure medication safety, developed for the UIT Challenge competition. The system consists of 4 main components:

- **Backend API**: FastAPI (Python) with AI integration (Gemini)
- **DDI Service**: Deep learning-powered drug-drug interaction prediction service
- **Web Application**: React.js responsive web app
- **Mobile Application**: React Native with Expo

## Key Features

### AI-Powered Drug Recognition
- OCR (Optical Character Recognition) to read information from medication images
- AI analysis and identification of drug types and components
- Google Gemini AI integration for high accuracy

### Drug Interaction Management
- **Advanced DDI Prediction**: Deep learning model with 1317 side effect labels
- **Molecular Analysis**: Uses molecular fingerprints for high-accuracy predictions
- **REST API Integration**: Dedicated service running on port 8001
- Check interactions between different medications
- Warnings for side effects and contraindications
- TwoSides database for comprehensive drug interaction information

### Cross-Platform Interface
- **Web**: Responsive interface for desktop/tablet
- **Mobile**: Native application with Expo for iOS/Android
- **QR Code**: Share prescription information via QR codes

### Family Management
- Track medications for multiple family members
- Detailed medication history
- Medication reminders

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web App       │    │   Admin Panel   │
│  (React Native) │    │   (React.js)    │    │   (React.js)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                ┌────────────────▼──────────────────┐
                │            Nginx Proxy            │
                │        (Load Balancer/SSL)        │
                └────────────────┬──────────────────┘
                                 │
                ┌────────────────▼──────────────────┐
                │          FastAPI Backend          │
                │       (Python 3.11 + uvicorn)     │
                │            Port: 8000             │
                └────────────────┬──────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┬──────────────────────┐
         │                       │                       │                      │
┌────────▼────────┐    ┌─────────▼────────┐    ┌─────────▼───────┐    ┌─────────▼─────────┐
│   Supabase DB   │    │   Redis Cache    │    │  Gemini AI API  │    │   DDI Service     │
│  (PostgreSQL)   │    │   (Session/      │    │  (OCR + NLP)    │    │  (Deep Learning)  │
│                 │    │    Caching)      │    │                 │    │   Port: 8001      │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └───────────────────┘
                                                                                │
                                                                     ┌──────────▼─────────┐
                                                                     │  Neural Network    │
                                                                     │ (1317 Side Effects │
                                                                     │  Multi─label       │
                                                                     │  Classification)   │
                                                                     └────────────────────┘
```

## DDI Service - Deep Learning Drug Interaction Prediction

### Overview
The DDI (Drug-Drug Interaction) Service is a specialized deep learning microservice that provides high-accuracy drug interaction predictions using molecular fingerprints and neural networks.

### Key Features
- **Multi-label Classification**: Predicts 1317 different side effects
- **Molecular Analysis**: Uses SMILES notation for chemical structure analysis
- **REST API**: Independent service running on port 8001
- **Docker Support**: Complete containerized workflow
- **Training Pipeline**: Full model training and evaluation capabilities

### DDI API Endpoints

#### Single Drug Pair Prediction
```bash
curl -X POST "http://localhost:8001/predict" \
-H "Content-Type: application/json" \
-d '{
  "drug1_smiles": "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
  "drug2_smiles": "CC1=CC=C(C=C1)C(=O)C2=CC=CC=C2",
  "top_k": 5
}'
```

#### Batch Predictions
```bash
curl -X POST "http://localhost:8001/predict/batch" \
-H "Content-Type: application/json" \
-d '{
  "drug_pairs": [
    {
      "drug1_smiles": "...",
      "drug2_smiles": "..."
    }
  ],
  "top_k": 5
}'
```

#### Health Check
```bash
curl -X GET "http://localhost:8001/health"
```

### DDI Service Architecture

```
┌─────────────────────┐
│   DDI API Service   │
│   (FastAPI:8001)    │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Inference Engine   │
│  (PyTorch Model)    │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Feature Extractor  │
│ (Molecular FPs)     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   Neural Network    │
│   (1317 Labels)     │
│  Multi─layer DNN    │
└─────────────────────┘
```

### DDI Service Management

#### Training New Models
```bash
# Complete training pipeline
cd DDIService
./docker/workflow.sh train

# Or with custom parameters
docker-compose run --rm -e DDI_EPOCHS=20 -e DDI_BATCH_SIZE=512 ddi-train
```

#### Model Evaluation
```bash
# Full evaluation with performance plots
./docker/workflow.sh evaluate

# Generate performance reports
./docker/evaluate.sh --save-plots -output-dir ./results
```

#### Testing & Validation
```bash
# Integration tests
./docker/test-integration.sh

# API endpoint tests
docker-compose run --rm ddi-test
```


## Docker Deployment

### Complete Project Structure

```
MediTrack─Platform/
├── docker-compose.yml              # Main orchestration file
├── .env                           # Environment configuration
├── README.md                      # This documentation
│
├── MediTrack/                     # Main application
│   ├── BackEnd/                   # FastAPI backend (Port: 8000)
│   │   ├── main.py               # API server
│   │   ├── routes/               # API endpoints
│   │   ├── services/             # Business logic
│   │   └── requirements.txt      # Python dependencies
│   │
│   └── ClientApp/                # React Native mobile app
│       ├── src/                  # Mobile source code
│       ├── App.js               # Main mobile component
│       └── package.json         # Node.js dependencies
│
├── MediTrackWeb/                 # React.js web app (Port: 3000)
│   ├── src/                     # Web source code
│   ├── public/                  # Static assets
│   └── package.json            # Web dependencies
│
├── DDIService/                  # Drug Interaction Service (Port: 8001)
│   ├── src/                    # Core ML source code
│   │   ├── model.py           # Neural network architecture
│   │   ├── inference.py       # Prediction engine
│   │   ├── training.py        # Training pipeline
│   │   └── config.py          # ML configuration
│   ├── models/                # Trained model files
│   ├── docker/               # Docker workflows
│   │   ├── workflow.sh       # Complete workflows
│   │   ├── train.sh         # Training scripts
│   │   └── evaluate.sh      # Evaluation scripts
│   ├── main.py              # DDI API server
│   └── docker-compose.yml   # DDI─specific compose
│
└── nginx/                   # Load balancer & SSL
    └── nginx.conf          # Proxy configuration
```

### System Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- RAM: 8GB+ recommended
- Disk: 10GB free space
- OS: Linux/macOS/Windows

### Quick Start

#### 1. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (required for AI features)
nano .env
```

Please refer to the Appendix of the report included with this project for detailed instructions on configuring the environment `.env`.

#### 2. Start All Services
```bash
# One command to start everything (Web + Mobile + API + Cache)
docker-compose up -d
```

#### 3. Access Applications

| Service        | URL                      | Description                   |
|----------------|--------------------------|-------------------------------|
| **Web App**    | http://localhost:3000    | Main web application          |
| **Mobile Dev** | http://localhost:8081    | Expo Metro bundler            |
| **API Docs**   | http://localhost:8000/docs | Swagger API documentation   |
| **DDI Service**| http://localhost:8001/docs | Drug-Drug Interaction API   |
| **Expo DevTools** | http://localhost:19002 | Expo development tools       |


#### 4. Mobile Development
For mobile development, use **Expo Go** app:
1. Install Expo Go on your phone
2. Run the command line to get QR on terminal
```bash
docker-compose logs -f meditrack-mobile
```
3. Scan QR code with Expo Go app

### Clean Restart

**Warning**: This will delete ALL Docker data, not just MediTrack!

```bash
# Stop all services
docker-compose down

# Clean up everything (containers, images, volumes, networks)
docker system prune -af --volumes

# Remove project-specific volumes 
docker volume prune -f

# Restart fresh
docker-compose up -d --build
```

### Development Commands

```bash
# View logs for all services
docker-compose logs -f

# View specific service logs
docker-compose logs -f meditrack-api
docker-compose logs -f meditrack-mobile
docker-compose logs -f ddi-service

# Rebuild specific service
docker-compose build --no-cache meditrack-api
docker-compose up -d meditrack-api

# DDI Service specific operations
docker-compose up -d ddi-service                    # Start DDI service only
docker-compose logs -f ddi-service                  # DDI service logs
curl http://localhost:8001/health                   # Test DDI service health

# Scale services
docker-compose up -d --scale meditrack-api=2
```

### DDI Service Advanced Operations

```bash
# Train new DDI model
cd DDIService
./docker/workflow.sh train

# Evaluate model performance
./docker/workflow.sh evaluate

# Run comprehensive tests
./docker/test-integration.sh

# Complete workflow (train → evaluate → serve)
./docker/workflow.sh full
```

### Performance Optimization

```bash
# Limit resource usage (optional)
docker-compose --compatibility up -d
```

Add to docker-compose.yml for resource limits:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
```

### Troubleshooting

#### Common Issues

##### 1. Permission denied errors
```bash
# Fix permission issues
sudo chown -R $(id -u):$(id -g) ./MediTrack/.expo
chmod -R 755 ./MediTrack/.expo
```

##### 2. Port conflicts
```bash
# Find and kill process using port
sudo lsof -i :3000  # or :8000, :8081, etc.
sudo kill -9 <PID>
```

##### 3. Database connection issues
```bash
# Check services status
docker-compose ps

# Restart specific service
docker-compose restart redis
docker-compose restart meditrack-api
```

##### 4. Build failures
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

##### 5. Mobile app not connecting
```bash
# Check mobile service
docker-compose logs meditrack-mobile

# Access Expo DevTools
open http://localhost:19002
```

##### 6. DDI Service issues
```bash
# Check DDI service status
docker-compose ps ddi-service
docker-compose logs ddi-service

# Test DDI API connectivity
curl http://localhost:8001/health

# Restart DDI service
docker-compose restart ddi-service

# Check model file exists
docker-compose exec ddi-service ls -la /app/models/

# DDI service training issues
cd DDIService
./docker/workflow.sh debug
```

##### 7. Performance issues
```bash
# Monitor resource usage
docker stats

# Check DDI service memory usage (models can be large)
docker-compose exec ddi-service free -h

# Limit DDI service resources
# Add to docker-compose.yml under ddi-service:
# deploy:
#   resources:
#     limits:
#       memory: 4G
#       cpus: '2.0'
```

───

### Submission Details
- **Team**: MediTrack
- **Tech Stack**: 
  - **Backend**: Python FastAPI, PostgreSQL (Supabase), Redis
  - **AI/ML**: Google Gemini API, PyTorch Deep Learning, RDKit
  - **Frontend**: React.js (Web), React Native + Expo (Mobile)
  - **Infrastructure**: Docker, Nginx, Multi-service Architecture
- **Features**: 
  - OCR Drug Recognition with AI
  - Deep Learning Drug Interaction Prediction (1317 side effects)
  - QR Code Prescription Sharing
  - Family Medication Management
  - Cross-platform (Web + Mobile)


## Team
Developed by Team BKU-MediTrack for UIT Challenge Competition.

**Thank you for reviewing our submission!**
