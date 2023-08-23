from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware

import shutil
import json
import os

app = FastAPI()

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

os.makedirs('videos', exist_ok=True)
os.makedirs('metadata', exist_ok=True)

@app.post('/api/uploadfile', status_code=201)
async def upload_file(gbm: str = Form(...), product: str = Form(...), plant: str = Form(...), route: str = Form(...), description: str = Form(...), file: UploadFile = File(...)):
    metadata = {  
        'gbm': gbm,  
        'product': product,  
        'plant': plant,  
        'route': route,  
        'description': description,  
    }

    video_filename = os.path.splitext(file.filename)[0]

    video_file_path = f"videos/{file.filename}"
    with open(video_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata_file_path = f"metadata/{video_filename}.json"
    with open(metadata_file_path, 'w') as f:
        json.dump(metadata, f)


    return {"video_file": video_file_path, "metadata_file": metadata_file_path}
