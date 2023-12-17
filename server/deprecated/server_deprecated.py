from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

import zipfile
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
async def upload_file(gbm: str = Form(...), product: str = Form(...), plant: str = Form(...), route: str = Form(...), userid: str = Form(...), insertDate: str = Form(...), updateDate: str = Form(...), : str = Form(...), file: UploadFile = File(...)):
    metadata = {  
        'gbm': gbm,  
        'product': product,  
        'plant': plant,  
        'route': route,  
        'userid': userid,
        'insertDate': insertDate,
        'updateDate': updateDate,
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

@app.post('/test/upload_video/')
async def upload_file(file: UploadFile = File(...)):
    with zipfile.ZipFile('return.zip', 'w') as zf:
        zf.write('./test_file/test.json')
        zf.write('./test_file/test.csv')
    os.remove('return.zip')
    return FileResponse('return.zip', media_type='application/zip')

@app.get('/test/download_video')
async def test_download_video():
    return FileResponse('test_file/0707_MX_0002_TEST.mp4', media_type='video/mp4')

@app.get('/test/download_csv')
async def test_download_csv():
    return FileResponse('test_file/X_fv_0701_MX_0001.csv', media_type='text/csv')

@app.get('/test/get_json')
async def test_get_json():
    # return FileResponse('test_file/0707_MX_0002_TEST.json', media_type='application/json')
    # jsonify
    with open('test_file/0707_MX_0002_TEST.json') as f:
        data = json.load(f)
    return data
