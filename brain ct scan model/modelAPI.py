import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
import torchvision
from PIL import Image
from torch.nn.functional import softmax

import uvicorn

t = torchvision.transforms.Compose([
    torchvision.transforms.Resize((64, 64)),
    torchvision.transforms.ToTensor(),
    torchvision.transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    model = torch.load(r"C:\Users\user\Desktop\web project\backend\brain ct scan model\resnet.pth", map_location=torch.device('cpu'), weights_only=False)
    model.eval()
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

@app.post("/predict")
async def classify(filepath: str):
    print(filepath)
      
    try:
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=400, detail="File path does not exist")
        
        try:
            image = Image.open(filepath).convert("RGB")
        except Exception as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Error loading image: {str(e)}. Supported formats: JPEG, PNG, etc."
            )
        
        try:
            x = t(image)
            x = x.unsqueeze(0)
            
            with torch.no_grad():
                logits = model(x)
                prob = softmax(logits, dim=1)
                pred = torch.argmax(prob, dim=1).item()
                confidence = prob[0][pred].item()
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Error during model prediction: {str(e)}"
            )
        
        if pred == 1:
            result = {
                "prediction": "Tumor Detected",
                "message": "The scanned brain seems to have a Tumor!",
                "confidence": float(confidence),
                "status": "positive"
            }
        else:
            result = {
                "prediction": "Healthy",
                "message": "The scanned brain seems Healthy.",
                "confidence": float(confidence),
                "status": "negative"
            }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error during classification: {str(e)}"
        )

@app.get("/")
async def root():
    return {"message": "Brain Tumor Classification API is running"}

    
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)